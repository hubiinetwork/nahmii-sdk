'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const nock = require('nock');

const NahmiiRequest = require('./nahmii-request');

function prefixSlash(value) {
    if (value.toString().startsWith('/'))
        return value;
    return '/' + value;
}

const fakeConfig = {
    apiRoot: 'some.hubii.server'
};

const stubbedAuthProvider = sinon.stub();

describe('Nahmii Request', () => {
    before(() => {
        nock.disableNetConnect();
    });

    after(() => {
        nock.enableNetConnect();
    });

    afterEach(() => {
        stubbedAuthProvider.reset();
        nock.cleanAll();
    });

    context('instantiated with valid parameters', () => {
        let request, testToken;

        beforeEach(() => {
            testToken = 'some JWT';
            stubbedAuthProvider.resolves(testToken);
            request = new NahmiiRequest(fakeConfig.apiRoot, stubbedAuthProvider);
        });

        describe('#get()', () => {
            ['test/uri', '/test/uri'].forEach(uri => {
                context('with uri: ' + uri, () => {
                    it('can do an authorized get request', async () => {
                        let scope = nock('https://' + fakeConfig.apiRoot)
                            .matchHeader('authorization', `Bearer ${testToken}`)
                            .get(prefixSlash(uri))
                            .reply(200);
                        await request.get(uri);
                        expect(scope.isDone()).to.eql(true);
                    });

                    it('it inserts the missing slash into the request', async () => {
                        let scope = nock('https://' + fakeConfig.apiRoot)
                            .get(prefixSlash(uri))
                            .reply(200);
                        await request.get(uri);
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

            [
                [null, null],
                ['', null],
                ['test=1', '?test=1'],
                [{test: 1, foo: 'bar'}, '?test=1&foo=bar']
            ].forEach(([query, expected]) => {
                context('with query: ' + JSON.stringify(query), () => {
                    it('appends query when provided', async () => {
                        let uri = 'api';
                        if(expected)
                            uri += expected;
                        let scope = nock('https://' + fakeConfig.apiRoot)
                            .get(prefixSlash(uri))
                            .reply(200);
                        await request.get('api', query);
                        expect(scope.isDone()).to.eql(true);
                    });
                });
            });
        });

        describe('#post()', () => {
            ['test/uri', '/test/uri'].forEach(uri => {
                it('adds authorization header', async () => {
                    let scope = nock('https://' + fakeConfig.apiRoot)
                        .matchHeader('authorization', `Bearer ${testToken}`)
                        .post(prefixSlash(uri))
                        .reply(201);
                    await request.post(uri, {});
                    expect(scope.isDone()).to.eql(true);
                });

                it('it inserts the missing slash into the request', async () => {
                    let scope = nock('https://' + fakeConfig.apiRoot)
                        .post(prefixSlash(uri))
                        .reply(201);
                    await request.post(uri, {});
                    expect(scope.isDone()).to.eql(true);
                });

                it('it resolves with the body of the response', async () => {
                    const expectedResponseBody = {};
                    let scope = nock('https://' + fakeConfig.apiRoot)
                        .post(prefixSlash(uri))
                        .reply(201, expectedResponseBody);
                    let result = await request.post(uri, {});
                    expect(scope.isDone()).to.eql(true);
                    expect(result).to.eql(expectedResponseBody);
                });

                it('sends the correct payload', async () => {
                    const expectedPayload = {};
                    let scope = nock('https://' + fakeConfig.apiRoot)
                        .post(prefixSlash(uri), expectedPayload)
                        .reply(201);
                    await request.post(uri, expectedPayload);
                    expect(scope.isDone()).to.eql(true);
                });

                [
                    [400, 'Bad Request'],
                    [403, 'Forbidden'],
                    [404, 'Not Found'],
                    [500, 'Internal Server Error']
                ].forEach(([statusCode, expectedMessage]) => {
                    it('it forwards error when server returns error ' + statusCode, (done) => {
                        const errorMessage = {message: 'some error'};
                        let scope = nock('https://' + fakeConfig.apiRoot)
                            .post(prefixSlash(uri))
                            .reply(statusCode, errorMessage);
                        request.post(uri, {}).catch(err => {
                            expect(scope.isDone()).to.eql(true);
                            expect(err.message).to.eql(expectedMessage);
                            expect(err.status).to.eql(statusCode);
                            done();
                        });
                    });
                });
            });
        });
    });
});
