'use strict';

const request = require('superagent');

const _authProvider = new WeakMap();

function prefixSlash(value) {
    if (value.toString().startsWith('/'))
        return value;
    return '/' + value;
}

module.exports = class StriimRequest {
    constructor(apiRoot, authProvider) {
        _authProvider.set(this, authProvider);
        this.apiRoot = apiRoot;
    }

    async get(uri) {
        const authToken = await _authProvider.get(this)();
        return request
            .get(`https://${this.apiRoot}${prefixSlash(uri)}`)
            .set('authorization', `Bearer ${authToken}`)
            .then(res => res.body);
    }

    async post(uri, payload) {
        const authToken = await _authProvider.get(this)();
        return request
            .post(`https://${this.apiRoot}${prefixSlash(uri)}`)
            .send(payload)
            .set('authorization', `Bearer ${authToken}`)
            .then(res => res.body);
    }
};
