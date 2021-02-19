'use strict';

const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
const expect = chai.expect;
const nock = require('nock');

const ClusterInformation = require('./cluster-information');

const baseUrl = 'hubii-api';
const expectedNode = 'http://ethereum-node-url';
const expectedNetwork = 'name-of-ethereum-network';

describe('Cluster Information', () => {
    before(() => {
        nock.disableNetConnect();
    });

    after(() => {
        nock.enableNetConnect();
    });

    describe('given a valid base URL', () => {

        const expectedBody = {
            ethereum: {
                node: expectedNode,
                net: expectedNetwork
            }
        };

        function expectUrl(expectedUrl) {
            nock(expectedUrl)
                .get('/')
                .reply(200, {
                    ethereum: {
                        node: expectedNode,
                        net: expectedNetwork
                    }
                });
        }

        afterEach(() => {
            nock.cleanAll();
        });

        it('gets cluster info by default protocol', () => {
            expectUrl('https://' + baseUrl);
            return expect(ClusterInformation.get(baseUrl)).to.eventually.eql(expectedBody);
        });

        it('gets cluster info by http http protocol', () => {
            expectUrl('http://' + baseUrl);
            return expect(ClusterInformation.get('http://' + baseUrl)).to.eventually.eql(expectedBody);
        });

        it('gets cluster info by https protocol', () => {
            expectUrl('https://' + baseUrl);
            return expect(ClusterInformation.get('https://' + baseUrl)).to.eventually.eql(expectedBody);
        });
    });

    describe('given a base URL resulting in a 404', () => {
        beforeEach(() => {
            const expectedUrl = `https://${baseUrl}`;

            nock(expectedUrl)
                .get('/')
                .reply(404);
        });

        afterEach(() => {
            nock.cleanAll();
        });

        it('rejects with error', () => {
            return expect(ClusterInformation.get(baseUrl)).to.eventually.be.rejectedWith(/unable.*cluster.*information/i);
        });
    });

    describe('given illegal url', () => {
        it ('rejects if domain is invalid', () => {
            return expect(ClusterInformation.get('@')).to.eventually.be.rejectedWith(/Invalid URL/);
        });

        it ('rejects if protocol is invalid', () => {
            return expect(ClusterInformation.get('@://' + baseUrl)).to.eventually.be.rejectedWith(/Invalid URL/);
        });

        it ('rejects if protocol is not supported', () => {
            return expect(ClusterInformation.get('xxx://' + baseUrl)).to.eventually.be.rejectedWith(/Unsupported protocol/);
        });
    });
});
