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
        super('http://geth-ropsten.dev.hubii.net', 'ropsten');

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
     * Waits for a transaction to be mined, polling every second. On being mined, returns the transaction receipt.
     * @see https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts
     * @param {string} transactionHash
     * @param {number} [timeout=60] - Seconds to wait before timing out
     * @returns {Promise<Object>}
     * @example   
     * const transactionHash = await wallet.depositEth('1.1', {gasLimit: 200000});
     * const transactionReceipt = await waitForConfirmation(transactionHash);
     */
    waitForConfirmation(transactionHash, timeout=60) {
        return Promise.retry(() => {
            process.stderr.write('.');
            return deferredIsNotNull(this.getTransactionReceipt(transactionHash));
        }, Math.ceil(timeout), 1000).then(result => {
            process.stderr.write('\n');
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