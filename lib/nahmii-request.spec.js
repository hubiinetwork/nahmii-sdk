'use strict';

const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

const nock = require('nock');

const NahmiiRequest = require('./nahmii-request');

function prefixSlash(value) {
    if (value.toString().startsWith('/'))
        return value;
    return '/' + value;
}

const fakeConfig = {
    apiRoot: 'some.nahmii.server'
};

const timeout = 100;
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
            request = new NahmiiRequest(fakeConfig.apiRoot, stubbedAuthProvider, timeout);
        });

        describe('#get()', () => {
            ['test/uri', '/test/uri'].forEach(uri => {
                context('with uri: ' + uri, () => {
                    it('can do an authorized get request', async () => {
                        const scope = nock('https://' + fakeConfig.apiRoot)
                            .matchHeader('authorization', `Bearer ${testToken}`)
                            .get(prefixSlash(uri))
                            .reply(200);
                        await request.get(uri);
                        expect(scope.isDone()).to.eql(true);
                    });

                    it('it inserts the missing slash into the request', async () => {
                        const scope = nock('https://' + fakeConfig.apiRoot)
                            .get(prefixSlash(uri))
                            .reply(200);
                        await request.get(uri);
                        expect(scope.isDone()).to.eql(true);
                    });

                    it('it resolves with the body of the response', async () => {
                        const expectedBody = ['item 1', 'item 2'];
                        const scope = nock('https://' + fakeConfig.apiRoot)
                            .get(prefixSlash(uri))
                            .reply(200, expectedBody);
                        const result = await request.get(uri);
                        expect(scope.isDone()).to.eql(true);
                        expect(result).to.eql(expectedBody);
                    });

                    it('it times out if it takes too long to resolve', async () => {
                        const expectedBody = ['item 1', 'item 2'];
                        nock('https://' + fakeConfig.apiRoot)
                            .get(prefixSlash(uri))
                            .delayConnection(timeout + 100)
                            .reply(200, expectedBody);
                        const err = await request.get(uri).catch(err => err);
                        // return expect(err.errno).to.equal('ETIMEDOUT'); // ISSUE: https://github.com/visionmedia/superagent/issues/1487
                        return expect(err.code).to.equal('ECONNABORTED');
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
                        const scope = nock('https://' + fakeConfig.apiRoot)
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
                    const scope = nock('https://' + fakeConfig.apiRoot)
                        .matchHeader('authorization', `Bearer ${testToken}`)
                        .post(prefixSlash(uri))
                        .reply(201);
                    await request.post(uri, {});
                    expect(scope.isDone()).to.eql(true);
                });

                it('it inserts the missing slash into the request', async () => {
                    const scope = nock('https://' + fakeConfig.apiRoot)
                        .post(prefixSlash(uri))
                        .reply(201);
                    await request.post(uri, {});
                    expect(scope.isDone()).to.eql(true);
                });

                it('it resolves with the body of the response', async () => {
                    const expectedResponseBody = {};
                    const scope = nock('https://' + fakeConfig.apiRoot)
                        .post(prefixSlash(uri))
                        .reply(201, expectedResponseBody);
                    const result = await request.post(uri, {});
                    expect(scope.isDone()).to.eql(true);
                    expect(result).to.eql(expectedResponseBody);
                });

                it('sends the correct payload', async () => {
                    const expectedPayload = {};
                    const scope = nock('https://' + fakeConfig.apiRoot)
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
                        const scope = nock('https://' + fakeConfig.apiRoot)
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
