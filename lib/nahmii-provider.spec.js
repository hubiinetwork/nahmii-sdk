'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const ethers = require('ethers');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedIdentityModel = {
    createApiToken: sinon.stub()
};

const stubbedNahmiiRequestCtr = sinon.stub();
const stubbedNahmiiRequest = {
    get: sinon.stub(),
    post: sinon.stub()
};

const stubbedClientFundCtr = sinon.stub();
const stubbedClientFund = {
    settledBalance: sinon.stub(),
    depositedBalance: sinon.stub(),
    stagedBalance: sinon.stub()
};

function proxyquireProvider() {
    return proxyquire('./nahmii-provider', {
        './identity-model': stubbedIdentityModel,
        './nahmii-request': stubbedNahmiiRequestCtr,
        './client-fund-contract': stubbedClientFundCtr
    });
}

const expectedJWT = 'some JWT';
const baseUrl = 'api base url';
const appId = 'nahmii api app id';
const appSecret = 'nahmii api app secret';
const node = 'some ethereum node url';
const network = 'testnet';
const walletAddr = '0000000000000000000000000000000000000001';

describe('Nahmii Provider', () => {
    afterEach(() => {
        stubbedIdentityModel.createApiToken.reset();
    });

    context('a NahmiiProvider with valid configuration', () => {
        let provider;

        beforeEach(() => {
            stubbedNahmiiRequestCtr
                .withArgs(baseUrl)
                .returns(stubbedNahmiiRequest);
            stubbedClientFundCtr
                .returns(stubbedClientFund);
            const NahmiiProvider = proxyquireProvider();
            provider = new NahmiiProvider(baseUrl, appId, appSecret, node, network);

            stubbedIdentityModel.createApiToken
                .withArgs(baseUrl, appId, appSecret)
                .resolves(expectedJWT);
        });

        afterEach(() => {
            provider.stopUpdate();
        });

        it('can retrieve the API access token', async () => {
            expect(await provider.getApiAccessToken()).to.eql(expectedJWT);
        });

        it('schedules and update of the API access after asking for it', async () => {
            expect(provider.isUpdating).to.be.false;
            await provider.getApiAccessToken();
            expect(provider.isUpdating).to.be.true;
        });

        it('can stop the scheduled updates', async () => {
            await provider.getApiAccessToken();
            expect(provider.isUpdating).to.be.true;
            provider.stopUpdate();
            expect(provider.isUpdating).to.be.false;
        });

        it('will create a new token when called several times shortly after each other', async () => {
            let t1 = await provider.getApiAccessToken();
            stubbedIdentityModel.createApiToken.resetBehavior();
            let t2 = await provider.getApiAccessToken();
            let t3 = await provider.getApiAccessToken();
            expect(t1).to.equal(t2);
            expect(t1).to.equal(t3);
            expect(stubbedIdentityModel.createApiToken.callCount).to.eql(1);
        });

        it('re-authenticates once a minute', async () => {
            let clock = sinon.useFakeTimers(new Date());

            let i = 0;
            stubbedIdentityModel.createApiToken.reset();
            stubbedIdentityModel.createApiToken.resolves('token.' + i);
            expect(await provider.getApiAccessToken()).to.eql('token.' + i++);

            for (; i <= 10; i++) {
                let expectedToken = `token.${i}`;
                stubbedIdentityModel.createApiToken.resolves(expectedToken);
                clock.tick(60 * 1000);
                await stubbedIdentityModel.createApiToken.promise;
                expect(await provider.getApiAccessToken()).to.eql(expectedToken);
            }
            clock.restore();
        });

        it('can retrieve a list of supported tokens', async () => {
            const expectedTokens = [];
            stubbedNahmiiRequest.get
                .withArgs('/ethereum/supported-tokens')
                .resolves(expectedTokens);
            const tokens = await provider.getSupportedTokens();
            expect(tokens).to.equal(expectedTokens);
        });

        it('can retrieve the balance for a wallet', async () => {
            const expectedBalances = [];
            stubbedNahmiiRequest.get
                .withArgs(`/trading/wallets/0x${walletAddr}/balances`)
                .resolves(expectedBalances);
            const result = await provider.getNahmiiBalances(walletAddr);
            expect(result).to.equal(expectedBalances);
        });

        it('can retrieve the list of pending payments', async () => {
            const expectedPayments = [];
            stubbedNahmiiRequest.get
                .withArgs('/trading/payments')
                .resolves(expectedPayments);
            const result = await provider.getPendingPayments();
            expect(result).to.equal(expectedPayments);
        });

        it('can retrieve the list of payment receipts', async () => {
            const expectedReceipts = [];
            stubbedNahmiiRequest.get
                .withArgs('/trading/receipts')
                .resolves(expectedReceipts);
            const result = await provider.getAllReceipts();
            expect(result).to.equal(expectedReceipts);
        });

        it('can register a payment', () => {
            const expectedPayment = {};
            stubbedNahmiiRequest.post
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
                stubbedNahmiiRequest.post
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

        it('can effectuate a payment', () => {
            const expectedReceipt = {};
            stubbedNahmiiRequest.post
                .withArgs('/trading/receipts', expectedReceipt)
                .resolves();
            return provider.effectuatePayment(expectedReceipt);
        });

        [
            [403, 'Not authorized!'],
            [404, 'Payment not found']
        ].forEach(([statusCode, expectedMessage]) => {
            it('sends back error messages with sensible messages when API fails to effectuate payment', (done) => {
                const expectedReceipt = {};
                const error = new Error();
                error.status = statusCode;
                stubbedNahmiiRequest.post
                    .withArgs('/trading/receipts', expectedReceipt)
                    .rejects(error);
                provider
                    .effectuatePayment(expectedReceipt)
                    .catch(err => {
                        expect(err.message).to.eql(expectedMessage);
                        done();
                    });
            });

            describe('can perform contract balance checks', () => {
                const expectedTokens = [{ currency: '0x01', symbol: 'ABC', decimals: 12 }];
                const expectedBalances = {ABC: ethers.utils.bigNumberify('1001'), ETH: ethers.utils.bigNumberify('5')};
                const expected = {ABC: ethers.utils.formatUnits('1001', 12), ETH: ethers.utils.formatUnits('5', 18)};

                beforeEach(() => {
                    stubbedNahmiiRequest.get
                        .withArgs('/ethereum/supported-tokens')
                        .resolves(expectedTokens);
                });

                it('can retrieve the staged balances for an address', async () => {
                    stubbedClientFund.stagedBalance
                        .withArgs(walletAddr, '0x01', 0)
                        .resolves(expectedBalances['ABC']);
                    stubbedClientFund.stagedBalance
                        .withArgs(walletAddr, '0x0000000000000000000000000000000000000000', 0)
                        .resolves(expectedBalances['ETH']);
                    const result = await provider.getStagedBalances(walletAddr);
                    expect(result).to.deep.equal(expected);
                });

                it('can retrieve the settled balances for an address', async () => {
                    stubbedClientFund.settledBalance
                        .withArgs(walletAddr, '0x01', 0)
                        .resolves(expectedBalances['ABC']);
                    stubbedClientFund.settledBalance
                        .withArgs(walletAddr, '0x0000000000000000000000000000000000000000', 0)
                        .resolves(expectedBalances['ETH']);
                    const result = await provider.getSettledBalances(walletAddr);
                    expect(result).to.deep.equal(expected);
                });

                it('can retrieve the deposited balances for an address', async () => {
                    stubbedClientFund.depositedBalance
                        .withArgs(walletAddr, '0x01', 0)
                        .resolves(expectedBalances['ABC']);
                    stubbedClientFund.depositedBalance
                        .withArgs(walletAddr, '0x0000000000000000000000000000000000000000', 0)
                        .resolves(expectedBalances['ETH']);
                    const result = await provider.getSettledBalances(walletAddr);
                    expect(result).to.deep.equal(expected);
                });
            });
        });
    });
});
