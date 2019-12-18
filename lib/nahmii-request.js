'use strict';

const request = require('superagent');
const https = require('https');

const _authProvider = new WeakMap();
const _timeout = new WeakMap();

function prefixSlash(value) {
    if (value.toString().startsWith('/'))
        return value;
    return '/' + value;
}

const agent = new https.Agent({
    keepAlive: true
});

function getSuperagent() {
    if (global.window)
        return request;

    return request.agent(agent);
}

module.exports = class NahmiiRequest {
    constructor(apiRoot, authProvider, timeout = 30000 /* 30 sec */) {
        _authProvider.set(this, authProvider);
        _timeout.set(this, timeout);
        this.apiRoot = apiRoot;
    }

    async get(uri, queries = null) {
        const authToken = await _authProvider.get(this)();
        let r = getSuperagent()
            .get(`https://${this.apiRoot}${prefixSlash(uri)}`)
            .set('authorization', `Bearer ${authToken}`)
            .timeout({ response: _timeout.get(this) });
        if (queries)
            r = r.query(queries);
        return r.then(res => res.body);
    }

    async post(uri, payload) {
        const authToken = await _authProvider.get(this)();
        return getSuperagent()
            .post(`https://${this.apiRoot}${prefixSlash(uri)}`)
            .send(payload)
            .set('authorization', `Bearer ${authToken}`)
            .timeout({ response: _timeout.get(this) })
            .then(res => res.body);
    }
};
