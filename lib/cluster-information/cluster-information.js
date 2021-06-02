'use strict';

/**
 * @module nahmii-sdk
 */

const { URL } = require('url');
const request = require('superagent');

/**
 * @class ClusterInformation
 * Accessor to cluster information provided by the meta service.
 * @alias module:nahmii-sdk
 */
class ClusterInformation {

    /**
     * Returns cluster information from the meta service.
     * Input is either a domain name or an URL.
     * Only http and https protocols are supported.
     * Defaults to https protocol if only domain is given.
     * External access through nahmii gateway requires https.
     * Will reject if URL is invalid or meta service cannot be reached.
     * @param {String} urlOrDomain - Url or domain of the meta service.
     */
    static async get(urlOrDomain) {

        // Prepend default protocol if needed
        const url = (() => {
            try {
                new URL(urlOrDomain);
                return urlOrDomain;
            }
            catch (err) {
                return 'https://' + urlOrDomain;
            }
        })();

        const protocol = (new URL(url)).protocol; // May throw

        // Assert supported protocol
        if (! ['http:', 'https:'].includes(protocol))
            throw new Error(`Unsupported protocol. Expected 'http(s):'. Found '${protocol}'.`);

        return request.get(url)
            .then(res => res.body)
            .catch(err => {
                throw new Error('Unable to retrieve cluster information: ' + err);
            });
    }
}

module.exports = ClusterInformation;
