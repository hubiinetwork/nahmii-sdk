'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);
const nock = require('nock');

const ClusterInformation = require('./cluster-information');

const baseUrl = 'http://hubii-api';
const expectedNode = 'http://ethereum-node-url';
const expectedNetwork = 'name-of-ethereum-network';

describe('Cluster Information', () => {
    describe('given a valid base URL', () => {
        before(() => {
            nock.disableNetConnect();
        });

        beforeEach(() => {
            nock(baseUrl)
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

        after(() => {
            nock.enableNetConnect();
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
        before(() => {
            nock.disableNetConnect();
        });

        beforeEach(() => {
            nock(baseUrl)
                .get('/')
                .reply(404);
        });

        afterEach(() => {
            nock.cleanAll();
        });

        after(() => {
            nock.enableNetConnect();
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
