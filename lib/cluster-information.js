'use strict';

const request = require('superagent');

class ClusterInformation {
    static async get(baseURL) {
        return request.get(baseURL)
            .then(res => res.body)
            .catch(err => {
                throw new Error('Unable to retrieve cluster information: ' + err);
            });
    }
}

module.exports = ClusterInformation;
