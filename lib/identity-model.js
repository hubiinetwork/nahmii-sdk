'use strict';

const request = require('superagent');

function createApiToken(baseUrl, appId, appSecret) {
    return request
        .post(`https://${baseUrl}/identity/apptoken`)
        .send({
            'appid': appId,
            'secret': appSecret
        })
        .then(res => res.body.userToken);
}

module.exports = {createApiToken};
