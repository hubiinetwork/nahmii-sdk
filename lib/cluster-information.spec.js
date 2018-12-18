'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);
const nock = require('nock');

const ClusterInformation = require('./cluster-information');

const baseUrl = 'hubii-api';
const expectedUrl = `https://${baseUrl}`;
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
        beforeEach(() => {
            nock(expectedUrl)
                .get('/')
                .reply(200, {
                    ethereum: {
                        node: expectedNode,
                        net: expectedNetwork
                    }
                });
        });

        afterEach(() => {
            nock.cleanAll();
        });

        it('resolves to information from meta service', async () => {
            expect(await ClusterInformation.get(baseUrl)).to.eql({
                ethereum: {
                    node: expectedNode,
                    net: expectedNetwork
                }
            });
        });
    });

    describe('given a base URL resulting in a 404', () => {
        beforeEach(() => {
            nock(expectedUrl)
                .get('/')
                .reply(404);
        });

        afterEach(() => {
            nock.cleanAll();
        });

        it('rejects with error', (done) => {
            ClusterInformation.get(baseUrl).catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                expect(e.message).to.match(/unable.*cluster.*information/i);
                done();
            });
        });
    });
});
