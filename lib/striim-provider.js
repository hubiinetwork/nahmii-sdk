'use strict';

/**
 * @module striim-sdk
 */

const request = require('superagent');
const ethers = require('ethers');
const {prefix0x} = require('./utils');
const {createApiToken} = require('./identity-model');
const StriimRequest = require('./striim-request');

// Private properties
const _baseUrl = new WeakMap();
const _appId = new WeakMap();
const _appSecret = new WeakMap();
const _apiAccessToken = new WeakMap();
const _asyncInitializations = new WeakMap();
const _striim = new WeakMap();

/**
 * @class StriimProvider
 * A class providing low-level access to the _hubii striim_ APIs.
 * @alias module:striim-sdk
 */
class StriimProvider extends ethers.providers.JsonRpcProvider {
    /**
     * Construct a new StriimProvider.
     * @param {string} striimBaseUrl - The base URL (domain name) for the API
     * @param {string} apiAppId - Hubii API app ID
     * @param {string} apiAppSecret - Hubii API app secret
     */
    constructor(striimBaseUrl, apiAppId, apiAppSecret) {
        // TODO: make node and network auto-configured from API server
        super('http://geth-ropsten.dev.hubii.net', 'ropsten');

        _baseUrl.set(this, striimBaseUrl);
        _appId.set(this, apiAppId);
        _appSecret.set(this, apiAppSecret);
        _striim.set(this, new StriimRequest(striimBaseUrl, () => {
            return this.getApiAccessToken();
        }));
    }

    /**
     * Resolves into the current token, or will obtain a new token from the
     * server as needed.
     * @returns {Promise} A promise that resolves into an API access token
     */
    async getApiAccessToken() {
        let currentToken = _apiAccessToken.get(this);
        // TODO: schedule an update of a token that is close to expire
        if (!isValidToken(currentToken)) {
            const baseUrl = _baseUrl.get(this);
            const appId = _appId.get(this);
            const appSecret = _appSecret.get(this);

            currentToken = await createApiToken(baseUrl, appId, appSecret);
            _apiAccessToken.set(this, currentToken);
        }
        return currentToken;
    }

    /**
     * Retrieves the list of tokens (currencies) supported by _hubii striim_.
     * @returns {Promise} A promise that resolves into an array of token definitions.
     */
    getSupportedTokens() {
        return _striim.get(this).get('/ethereum/supported-tokens');
    }

    /**
     * Retrieves the balances for all available tokens for the specified wallet address.
     * @param {Address} address
     * @returns {Promise} A promise that resolves into a array of balance information.
     */
    getStriimBalances(address) {
        return _striim.get(this).get(`/trading/wallets/${prefix0x(address)}/balances`);
    }

    /**
     * Retrieves all pending payments that have not yet been effectuated by the
     * server.
     * @returns {Promise} A promise that resolves into an array of registered payments
     */
    getPendingPayments() {
        return _striim.get(this).get('/trading/payments');
    }

    /**
     * Registers a payment with the server to have it effectuated. The payment
     * is expected to be hashed and signed according to the _hubii striim_
     * protocol.
     * @param payment A JSON object of a serialized signed Payment
     * @returns {Promise} A promise that resolves into a registered payment payload
     */
    async registerPayment(payment) {
        return _striim.get(this)
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
     * Retrieves all receipts for effectuated payments from the server.
     * @returns {Promise} A promise that resolves into an array of payment receipts
     */
    getAllReceipts() {
        return _striim.get(this).get('/trading/receipts');
    }
}

function isValidToken(currentToken) {
    // TODO: check JWT.exp also
    return !!currentToken;
}

module.exports = StriimProvider;
