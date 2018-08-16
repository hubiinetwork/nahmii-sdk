'use strict';

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

class StriimProvider extends ethers.providers.JsonRpcProvider {
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

    getSupportedTokens() {
        return _striim.get(this).get('/ethereum/supported-tokens');
    }

    getStriimBalances(address) {
        return _striim.get(this).get(`/trading/wallets/${prefix0x(address)}/balances`);
    }

    getPendingPayments() {
        return _striim.get(this).get('/trading/payments');
    }

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

    getAllReceipts() {
        return _striim.get(this).get('/trading/receipts');
    }
}

function isValidToken(currentToken) {
    // TODO: check JWT.exp also
    return !!currentToken;
}

module.exports = StriimProvider;
