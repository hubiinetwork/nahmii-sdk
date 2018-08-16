'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedIdentityModel = {
    createApiToken: sinon.stub()
};

const stubbedStriimRequestCtr = sinon.stub();
const stubbedStriimRequest = {
    get: sinon.stub(),
    post: sinon.stub()
};

function proxyquireProvider() {
    return proxyquire('./striim-provider', {
        './identity-model': stubbedIdentityModel,
        './striim-request': stubbedStriimRequestCtr
    });
}

const expectedJWT = 'some JWT';
const baseUrl = 'api base url';
const appId = 'striim api app id';
const appSecret = 'striim api app secret';
const node = 'some ethereum node url';
const network = 'testnet';
const walletAddr = '0000000000000000000000000000000000000001';

describe('Striim Provider', () => {
    afterEach(() => {
        stubbedIdentityModel.createApiToken.reset();
    });

    context('a StriimProvider with valid configuration', () => {
        let provider;

        beforeEach(() => {
            stubbedStriimRequestCtr
                .withArgs(baseUrl)
                .returns(stubbedStriimRequest);
            const StriimProvider = proxyquireProvider();
            provider = new StriimProvider(baseUrl, appId, appSecret, node, network);

            stubbedIdentityModel.createApiToken
                .withArgs(baseUrl, appId, appSecret)
                .resolves(expectedJWT);
        });

        it('can retrieve the API access token', async () => {
            expect(await provider.getApiAccessToken()).to.eql(expectedJWT);
        });

        it('will not recreate token after it has been created once', async () => {
            let t1 = await provider.getApiAccessToken();
            stubbedIdentityModel.createApiToken.resetBehavior();
            let t2 = await provider.getApiAccessToken();
            let t3 = await provider.getApiAccessToken();
            expect(t1).to.equal(t2);
            expect(t1).to.equal(t3);
            expect(stubbedIdentityModel.createApiToken.callCount).to.eql(1);
        });

        it('can retrieve a list of supported tokens', async () => {
            const expectedTokens = [];
            stubbedStriimRequest.get
                .withArgs('/ethereum/supported-tokens')
                .resolves(expectedTokens);
            const tokens = await provider.getSupportedTokens();
            expect(tokens).to.equal(expectedTokens);
        });

        it('can retrieve the balance for a wallet', async () => {
            const expectedBalances = [];
            stubbedStriimRequest.get
                .withArgs(`/trading/wallets/0x${walletAddr}/balances`)
                .resolves(expectedBalances);
            const result = await provider.getStriimBalances(walletAddr);
            expect(result).to.equal(expectedBalances);
        });

        it('can retrieve the list of pending payments', async () => {
            const expectedPayments = [];
            stubbedStriimRequest.get
                .withArgs('/trading/payments')
                .resolves(expectedPayments);
            const result = await provider.getPendingPayments();
            expect(result).to.equal(expectedPayments);
        });

        it('can retrieve the list of payment receipts', async () => {
            const expectedReceipts = [];
            stubbedStriimRequest.get
                .withArgs('/trading/receipts')
                .resolves(expectedReceipts);
            const result = await provider.getAllReceipts();
            expect(result).to.equal(expectedReceipts);
        });

        it('can register a payment', () => {
            const expectedPayment = {};
            stubbedStriimRequest.post
                .withArgs('/trading/payments', expectedPayment)
                .resolves();
            return provider.registerPayment(expectedPayment);
        });

        [
            [402, 'Insufficient funds!'],
            [403, 'Not authorized!']
        ].forEach(([statusCode, expectedMessage]) => {
            it('sends back error messages with sensible messages when API fails to register payment', (done) => {
                const expectedPayment = {};
                const error = new Error();
                error.status = statusCode;
                stubbedStriimRequest.post
                    .withArgs('/trading/payments', expectedPayment)
                    .rejects(error);
                provider
                    .registerPayment(expectedPayment)
                    .catch(err => {
                        expect(err.message).to.eql(expectedMessage);
                        done();
                    });
            });
        });
    });
});
