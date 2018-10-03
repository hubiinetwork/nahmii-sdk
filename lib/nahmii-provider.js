'use strict';

/**
 * @module nahmii-sdk
 */

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
            console.log('Updating API access token...');
            const baseUrl = _baseUrl.get(this);
            const appId = _appId.get(this);
            const appSecret = _appSecret.get(this);

            _apiAccessTokenPending.set(this, createApiToken(baseUrl, appId, appSecret)
                .then(t => {
                    console.log('Successfully updated API access token.');
                    _apiAccessToken.set(this, t);
                    return t;
                })
                .catch(err => {
                    console.log('Failed to update API access token!');
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
}

function isValidToken(currentToken) {
    // TODO: check JWT.exp also
    return !!currentToken;
}

module.exports = NahmiiProvider;
