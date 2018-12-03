'use strict';

/**
 * @module nahmii-sdk
 */

const dbg = require('./dbg');
const ethers = require('ethers');
const {prefix0x} = require('./utils');
const {createApiToken} = require('./identity-model');
const NahmiiRequest = require('./nahmii-request');

// Private properties
const _baseUrl = new WeakMap();
const _appId = new WeakMap();
const _appSecret = new WeakMap();
const _apiAccessToken = new WeakMap();
const _apiAccessTokenPending = new WeakMap();
const _tokenInterval = new WeakMap();
const _nahmii = new WeakMap();

/**
 * @class NahmiiProvider
 * A class providing low-level access to the _hubii nahmii_ APIs.
 * @alias module:nahmii-sdk
 */
class NahmiiProvider extends ethers.providers.JsonRpcProvider {
    /**
     * Construct a new NahmiiProvider.
     * @param {string} nahmiiBaseUrl - The base URL (domain name) for the nahmii API
     * @param {string} apiAppId - nahmii API app-ID
     * @param {string} apiAppSecret - nahmii API app-secret
     */
    constructor(nahmiiBaseUrl, apiAppId, apiAppSecret) {
        // TODO: make node and network auto-configured from API server
        // super('http://geth-ropsten.dev.hubii.net', 'ropsten');
        super('http://localhost:8545', 'ropsten');

        _baseUrl.set(this, nahmiiBaseUrl);
        _appId.set(this, apiAppId);
        _appSecret.set(this, apiAppSecret);
        _nahmii.set(this, new NahmiiRequest(nahmiiBaseUrl, () => {
            return this.getApiAccessToken();
        }));
    }

    get operatorAddress() {
        // TODO: implement
        throw new Error('Not implemented');
    }

    /**
     * Force provider to start updating the API access token once a minute. The
     * update will continue until stopUpdate() is called.
     * Using any methods that require an API access token will automatically
     * start the update process.
     */
    startUpdate() {
        if (this.isUpdating)
            return;

        const updateToken = () => {
            dbg('Updating API access token...');
            const baseUrl = _baseUrl.get(this);
            const appId = _appId.get(this);
            const appSecret = _appSecret.get(this);

            _apiAccessTokenPending.set(this, createApiToken(baseUrl, appId, appSecret)
                .then(t => {
                    dbg('Successfully updated API access token.');
                    _apiAccessToken.set(this, t);
                    return t;
                })
                .catch(err => {
                    dbg('Failed to update API access token!');
                    return Promise.reject(err);
                }));
        };

        updateToken();
        _tokenInterval.set(this, setInterval(updateToken, 60 * 1000));
    }

    /**
     * Stops the automatic update of API access tokens. This should be called
     * when you want to terminate/delete the provider to ensure there are no
     * lingering references.
     */
    stopUpdate() {
        clearInterval(_tokenInterval.get(this));
        _tokenInterval.set(this);
    }

    /**
     * Returns the state of the API access token update process.
     * @returns {boolean} True if the update is running, false otherwise.
     */
    get isUpdating() {
        return !!_tokenInterval.get(this);
    }

    /**
     * Resolves into the current token, or will obtain a new token from the
     * server as needed.
     * @returns {Promise} A promise that resolves into an API access token
     */
    async getApiAccessToken() {
        let currentToken = _apiAccessToken.get(this);
        if (isValidToken(currentToken))
            return currentToken;

        this.startUpdate();
        return _apiAccessTokenPending.get(this);
    }

    /**
     * Retrieves the list of tokens (currencies) supported by _hubii nahmii_.
     * @returns {Promise} A promise that resolves into an array of token definitions.
     */
    getSupportedTokens() {
        return _nahmii.get(this).get('/ethereum/supported-tokens');
    }

    /**
     * Retrieves information about the token that has the specified symbol.
     * @param {string} symbolOrAddress - token symbol or address
     * @param {boolean} byAddress - a flag to tell whether to look up by symbol or address
     * @returns {Promise<Object>}
     */
    async getTokenInfo(symbolOrAddress, byAddress) {
        if (['ETH', '0X0000000000000000000000000000000000000000'].indexOf(symbolOrAddress.toUpperCase()) !== -1) {
            return {
                currency: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                color: ''
            };
        }

        const supportedTokens = await this.getSupportedTokens();
        // supportedTokens.push({
        //     currency: '0x9d35b9dc0ef17acc3a8872566694cda9fb484f34',
        //     symbol: 'TTT',
        //     decimals: 18,
        //     color: ''
        // })
        const searchBy = byAddress ? 'currency' : 'symbol';
        const tokenInfo = supportedTokens.find(t => t[searchBy].toUpperCase() === symbolOrAddress.toUpperCase());
        if (!tokenInfo)
            throw new Error('Unknown currency. See "nahmii show tokens" for a list of supported tokens.');
        return tokenInfo;
    }

    /**
     * Retrieves the balances for all available tokens for the specified wallet address.
     * @param {Address} address
     * @returns {Promise} A promise that resolves into a array of balance information.
     */
    getNahmiiBalances(address) {
        return _nahmii.get(this).get(`/trading/wallets/${prefix0x(address)}/balances`);
    }

    /**
     * Retrieves all pending payments that have not yet been effectuated by the
     * server.
     * @returns {Promise} A promise that resolves into an array of registered payments
     */
    getPendingPayments() {
        return _nahmii.get(this).get('/trading/payments');
    }

    /**
     * Registers a payment with the server to have it effectuated. The payment
     * is expected to be hashed and signed according to the _hubii nahmii_
     * protocol.
     * @param payment A JSON object of a serialized signed Payment
     * @returns {Promise} A promise that resolves into a registered payment payload
     */
    async registerPayment(payment) {
        return _nahmii.get(this)
            .post('/trading/payments', payment)
            .catch(err => {
                switch (err.status) {
                case 402:
                    throw new Error('Insufficient funds!');
                case 403:
                    throw new Error('Not authorized!');
                case 422:
                    throw new Error(err.response.body.message);
                default:
                    throw new Error(err);
                }
            });
    }

    /**
     * Registers a receipt with the server to effectuate the transfer. The
     * receipt is expected to be hashed and signed according to the
     * _hubii nahmii_ protocol.
     * @param receipt A JSON object of a serialized signed Receipt
     * @returns {Promise} A promise that resolved into a receipt registration payload
     */
    async effectuatePayment(receipt) {
        return _nahmii.get(this)
            .post('/trading/receipts', receipt)
            .catch(err => {
                switch (err.status) {
                case 403:
                    throw new Error('Not authorized!');
                case 404:
                    throw new Error('Payment not found');
                case 422:
                    throw new Error(err.response.body.message);
                default:
                    throw new Error(err);
                }
            });
    }

    /**
     * Retrieves all receipts for effectuated payments from the server.
     * @returns {Promise} A promise that resolves into an array of payment receipts
     */
    getAllReceipts() {
        return _nahmii.get(this).get('/trading/receipts');
    }

    /**
     * Retrieves all receipts for effectuated payments using filter/pagnination criteria.
     * @param {Address} address Filter payment receipts for a specific wallet address.
     * @param {number} fromNonce Filter payment receipts greater or equal to specific nonce.
     * @param {number} limit The max number of payment receipts to return.
     * @param {boolean} asc Return payment receipts in asc order. The default order is desc.
     * @returns {Promise} A promise that resolves into an array of payment receipts
     */
    getWalletReceipts(address, fromNonce, limit, asc) {
        // return new Promise(resolve => {
        //     const receipts = [{
        //         nonce: 1,
        //         amount: '5000000000000000000',
        //         currency: {
        //           ct: '0x0000000000000000000000000000000000000000',
        //           id: '0',
        //         },
        //         sender: {
        //           wallet: '0x97026a8157f39101aefc4A81496C161a6b1Ce46A',
        //           nonce: 1,
        //           balances: {
        //             current: '4800000000000000000',
        //             previous: '10000000000000000000',
        //           },
        //           fees: {
        //             single: {
        //               amount: '200000000000000000',
        //               currency: {
        //                 ct: '0x0000000000000000000000000000000000000000',
        //                 id: '0',
        //               },
        //             },
        //             total: [
        //               {
        //                 amount: '200000000000000000',
        //                 currency: {
        //                   ct: '0x0000000000000000000000000000000000000000',
        //                   id: '0',
        //                 },
        //               },
        //             ],
        //           },
        //         },
        //         recipient: {
        //           wallet: '0xBB97f342884eD086dd83a192c8a7e649E095DB7b',
        //           nonce: 1,
        //           balances: {
        //             current: '5000000000000000000',
        //             previous: '0',
        //           },
        //           fees: {
        //             total: [],
        //           },
        //         },
        //         transfers: {
        //           single: '5000000000000000000',
        //           total: '10000000000000000000',
        //         },
        //         blockNumber: '0',
        //         operatorId: '1',
        //         seals: {
        //           wallet: {
        //             hash: '0x424f956befa5a84763afe5202876bc15cd0fc0c448ead6efa35fa4d8a93e728c',
        //             signature: {
        //               v: 27,
        //               r: '0x3c2ae3eb67ad66db58cbbc263eba3d6507cd437109ea70af5de7c88ae7651c28',
        //               s: '0x5e5b343ea4176bd408f1e126ec4f64e3f5735e1dc2639e54544ba6d686a6924d',
        //             },
        //           },
        //           operator: {
        //             hash: '0x7aa30cb4577403d15743776ee664956b8005766dc7a5c59b1e97b672fec4be19',
        //             signature: {
        //               v: 27,
        //               r: '0x9f272b1232165eea0914e5ed496f992592acc58b8620e7083446f8c9dc025783',
        //               s: '0x23af84569bae8e03d39020663786536d0f57aa8f49d0f0adc4dff56ffba122c6',
        //             },
        //           },
        //         },
        //       }];
        //     resolve(receipts)
        // })

        const queries = [];
        let queryPath = `/trading/wallets/${address}/receipts?`;
        if (fromNonce) 
            queries.push(`fromNonce=${fromNonce}`);
        
        if (limit > 0) 
            queries.push(`limit=${limit}`);
        
        if (asc) 
            queries.push('direction=asc');
        
        queryPath += queries.join('&');
        return _nahmii.get(this).get(queryPath);
    }
    /**
     * Waits for a transaction to be mined, polling every second. 
     * Rejects if a transaction is mined, but fails to execute, for example in an out of gas scenario.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @param {string} transactionHash
     * @param {number} [timeout=60] - Seconds to wait before timing out
     * @returns {Promise<Object>}
     * @example   
     * const transactionHash = await wallet.depositEth('1.1', {gasLimit: 200000});
     * const transactionReceipt = await getTransactionConfirmation(transactionHash);
     */
    getTransactionConfirmation(transactionHash, timeout=60) {
        return Promise.retry(() => {
            return deferredIsNotNull(this.getTransactionReceipt(transactionHash));
        }, Math.ceil(timeout), 1000)
            .then(result => {
                if (result.status === 0) throw new Error('Transaction failed');
                return result;
            });
    }
}

function isValidToken(currentToken) {
    // TODO: check JWT.exp also
    return !!currentToken;
}

module.exports = NahmiiProvider;

function deferredIsNotNull(promise) {
    return new Promise((resolve, reject) => {
        promise.then(res => {
            if (res !== null)
                resolve(res);
            else
                reject();
        });
    });
}

Promise.retry = function(attemptFn, times, delay) {
    return new Promise(function(resolve, reject) {
        let error;

        function attempt() {
            if (!times)
                return reject(error);

            attemptFn()
                .then(resolve)
                .catch(function(e) {
                    times--;
                    error = e;
                    setTimeout(function() {
                        attempt();
                    }, delay);
                });
        }

        attempt();
    });
};