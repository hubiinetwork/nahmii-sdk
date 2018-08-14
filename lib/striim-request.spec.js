'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const nock = require('nock');
nock.disableNetConnect();

const StriimRequest = require('./striim-request');

function prefixSlash(value) {
    if (value.toString().startsWith('/'))
        return value;
    return '/' + value;
}

const fakeConfig = {
    apiRoot: 'some.hubii.server'
};

const stubbedAuthProvider = sinon.stub();

describe('Striim Request', () => {
    afterEach(() => {
        stubbedAuthProvider.reset();
        nock.cleanAll();
    });

    context('instantiated with valid parameters', () => {
        let request, testToken;

        beforeEach(() => {
            testToken = 'some JWT';
            stubbedAuthProvider.resolves(testToken);
            request = new StriimRequest(fakeConfig.apiRoot, stubbedAuthProvider);
        });

        ['test/uri', '/test/uri'].forEach(uri => {
            context('with uri: ' + uri, () => {
                it('can do an authorized get request', async () => {
                    let scope = nock('https://' + fakeConfig.apiRoot)
                        .matchHeader('authorization', `Bearer ${testToken}`)
                        .get(prefixSlash(uri))
                        .reply(200);
                    let result = await request.get(uri);
                    expect(scope.isDone()).to.eql(true);
                });

                it('it inserts the missing slash into the request', async () => {
                    let scope = nock('https://' + fakeConfig.apiRoot)
                        .get(prefixSlash(uri))
                        .reply(200);
                    let result = await request.get(uri);
                    expect(scope.isDone()).to.eql(true);
                });

                it('it resolves with the body of the response', async () => {
                    const expectedBody = ['item 1', 'item 2'];
                    let scope = nock('https://' + fakeConfig.apiRoot)
                        .get(prefixSlash(uri))
                        .reply(200, expectedBody);
                    let result = await request.get(uri);
                    expect(scope.isDone()).to.eql(true);
                    expect(result).to.eql(expectedBody);
                });
            });
        });
    });
});
