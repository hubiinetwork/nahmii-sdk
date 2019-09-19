'use strict';

/**
 * @module nahmii-sdk
 */

const dbg = require('./dbg');
const ethers = require('ethers');
const {prefix0x} = require('./utils');
const {createApiToken} = require('./identity-model');
const NahmiiRequest = require('./nahmii-request');
const ClusterInformation = require('./cluster-information');
const InsufficientFundsError = require('./insufficient-funds-error');
const {EthereumAddress} = require('nahmii-ethereum-address');

// Private properties
const _nahmiiDomain = new WeakMap();
const _appId = new WeakMap();
const _appSecret = new WeakMap();
const _apiAccessToken = new WeakMap();
const _apiAccessTokenPending = new WeakMap();
const _tokenInterval = new WeakMap();
const _nahmii = new WeakMap();
const _operator = new WeakMap();


/**
 * @class NahmiiProvider
 * A class providing low-level access to the _hubii nahmii_ APIs.
 * @alias module:nahmii-sdk
 * @example
 * const {NahmiiProvider} = require('nahmii-sdk');
 *
 * const provider = await NahmiiProvider.from('api.nahmii.io', app_id, app_secret);
 */
class NahmiiProvider extends ethers.providers.JsonRpcProvider {
    /**
     * Construct a new NahmiiProvider.
     * Instead of using this constructor directly it is recommended that you use
     * the NahmiiProvider.from() factory function.
     * @param {string} nahmiiDomain - The domain name for the nahmii API
     * @param {string} apiAppId - nahmii API app-ID
     * @param {string} apiAppSecret - nahmii API app-secret
     * @param {string} nodeUrl - url to an ethereum node to connect to
     * @param {string|number} network - a known ethereum network name or ID
     * @param {EthereumAddress} [operator] - The address of the nahmii operator
     */
    constructor(nahmiiDomain, apiAppId, apiAppSecret, nodeUrl, network, operator = null) {
        super(nodeUrl, network);

        if (operator && !(operator instanceof EthereumAddress))
            throw new TypeError('Invalid argument - operator not an EthereumAddress');

        _nahmiiDomain.set(this, nahmiiDomain);
        _appId.set(this, apiAppId);
        _appSecret.set(this, apiAppSecret);
        _nahmii.set(this, new NahmiiRequest(nahmiiDomain, () => {
            return this.getApiAccessToken();
        }));
        _operator.set(this, (operator || null));
    }

    /**
     * Factory method for creating a new NahmiiProvider automatically configured
     * from the specified nahmii cluster.
     * @param {string} nahmiiDomain - The domain name for the nahmii API
     * @param {string} apiAppId - nahmii API app-ID
     * @param {string} apiAppSecret - nahmii API app-secret
     * @returns {Promise<NahmiiProvider>}
     */
    static async from(nahmiiDomain, apiAppId, apiAppSecret) {
        const {ethereum} = await ClusterInformation.get(nahmiiDomain);
        const operator = EthereumAddress.from(ethereum.operatorAddress);
        return new NahmiiProvider(nahmiiDomain, apiAppId, apiAppSecret, ethereum.node, ethereum.net, operator);
    }

    /**
     * Returns the operator address of the nahmii cluster as it was defined at
     * the time when this provider was created.
     * @returns {EthereumAddress|null}
     */
    get operatorAddress() {
        return _operator.get(this);
    }

    /**
     * Retrieves the domain name of the nahmii cluster.
     * @returns {string}
     */
    get nahmiiDomain() {
        return _nahmiiDomain.get(this);
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
            const appId = _appId.get(this);
            const appSecret = _appSecret.get(this);

            _apiAccessTokenPending.set(this, createApiToken(this.nahmiiDomain, appId, appSecret)
                .then(t => {
                    dbg('Successfully updated API access token.');
                    _apiAccessToken.set(this, t);
                    return t;
                })
                .catch(err => {
                    console.error('Failed to update nahmii API access token!', err);
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
        const currentToken = _apiAccessToken.get(this);
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
    async getTokenInfo(symbolOrAddress, byAddress = false) {
        const supportedTokens = await this.getSupportedTokens();
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
                dbg('the actual error:\n' + JSON.stringify(err, null, 4));
                switch (err.status) {
                case 402:
                    throw new InsufficientFundsError(JSON.parse(err.response.text));
                case 403:
                    throw new Error('Not authorized!');
                case 422:
                    throw new Error(JSON.parse(err.response.text).message);
                default:
                    throw new Error(err.response.error.message);
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
     * Retrieves all receipts for effectuated payments using filter/pagination
     * criteria.
     * @param {Address} address Filter payment receipts for a specific wallet address.
     * @param {number} [fromNonce] Filter payment receipts greater or equal to specific nonce.
     * @param {number} [limit] The max number of payment receipts to return.
     * @param {boolean} [asc=false] Return payment receipts in asc order.
     * @returns {Promise} A promise that resolves into an array of payment receipts
     */
    getWalletReceipts(address, fromNonce, limit, asc) {
        const queries = {};
        if (fromNonce)
            queries.fromNonce = fromNonce;
        if (limit > 0)
            queries.limit = limit;
        if (asc)
            queries.direction = 'asc';

        return _nahmii.get(this).get(`/trading/wallets/${address}/receipts`, queries);
    }

    /**
     * Waits for a transaction to be mined, polling every second.
     * Rejects if a transaction is mined, but fails to execute, for example in an out of gas scenario.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @param {string} transactionHash
     * @param {number} [timeout=60] - Seconds to wait before timing out
     * @returns {Promise<Object>}
     * @example
     * const {hash} = await wallet.depositEth('1.1', {gasLimit: 200000});
     * const transactionReceipt = await getTransactionConfirmation(hash);
     */
    getTransactionConfirmation(transactionHash, timeout = 60) {
        return Promise.retry(() => {
            return deferredIsNotNull(this.getTransactionReceipt(transactionHash));
        }, Math.ceil(timeout), 1000)
            .then(result => {
                if (result.status === 0) throw new Error('Transaction failed');
                return result;
            });
    }

    /**
     * Retrieves the cluster information from the connected cluster.
     * @returns {Promise<*>} A promise that resolves into a cluster information structure
     */
    async getClusterInformation() {
        return await ClusterInformation.get(this.nahmiiDomain);
    }
}

module.exports = NahmiiProvider;

function isValidToken(currentToken) {
    // TODO: check JWT.exp also
    return !!currentToken;
}

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
