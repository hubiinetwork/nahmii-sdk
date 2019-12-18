'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const InsufficientFundsError = require('./insufficient-funds-error');
const {EthereumAddress} = require('nahmii-ethereum-address');

const stubbedIdentityModel = {
    createApiToken: sinon.stub()
};

const stubbedNahmiiRequestCtr = sinon.stub();
const stubbedNahmiiRequest = {
    get: sinon.stub(),
    post: sinon.stub()
};
const stubbedClusterInformation = {};

function proxyquireProvider() {
    return proxyquire('./nahmii-provider', {
        './identity-model': stubbedIdentityModel,
        './nahmii-request': stubbedNahmiiRequestCtr,
        './cluster-information': stubbedClusterInformation
    });
}

const expectedJWT = 'some JWT';
const baseUrl = 'api base url';
const appId = 'nahmii api app id';
const appSecret = 'nahmii api app secret';
const node = 'some ethereum node url';
const network = 'testnet';
const walletAddr = '0000000000000000000000000000000000000001';

const testTokens = [
    {
        currency: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        color: ''
    },
    {
        currency: '0x0000000000000000000000000000000000000001',
        symbol: 'TT1',
        decimals: 18
    },
    {
        currency: '0x0000000000000000000000000000000000000002',
        symbol: 'TT2',
        decimals: 5
    }
];


describe('Nahmii Provider', () => {
    let provider, clusterInformation;

    beforeEach(() => {
        clusterInformation = {
            ethereum: {
                node: node,
                net: network,
                operatorAddress: '0x0000000000000000000000000000000000000666'
            }
        };
        stubbedClusterInformation.get = sinon.stub();
        stubbedClusterInformation.get.withArgs(baseUrl)
            .resolves(clusterInformation);
    });

    afterEach(() => {
        stubbedIdentityModel.createApiToken.reset();
    });

    context('a new NahmiiProvider with valid configuration', () => {
        beforeEach(() => {
            stubbedNahmiiRequestCtr
                .withArgs(baseUrl)
                .returns(stubbedNahmiiRequest);
            stubbedIdentityModel.createApiToken
                .withArgs(baseUrl, appId, appSecret)
                .resolves(expectedJWT);
            stubbedNahmiiRequest.get
                .withArgs('/ethereum/supported-tokens')
                .resolves(testTokens);
            const NahmiiProvider = proxyquireProvider();
            provider = new NahmiiProvider(
                baseUrl,
                appId,
                appSecret,
                node,
                network,
                EthereumAddress.from(clusterInformation.ethereum.operatorAddress)
            );
        });

        afterEach(() => {
            provider.stopUpdate();
        });

        validateExpectedBehaviorOfProvider();
    });

    context('a NahmiiProvider from cluster information', () => {
        beforeEach(async () => {
            stubbedNahmiiRequestCtr
                .withArgs(baseUrl)
                .returns(stubbedNahmiiRequest);
            stubbedIdentityModel.createApiToken
                .withArgs(baseUrl, appId, appSecret)
                .resolves(expectedJWT);
            stubbedNahmiiRequest.get
                .withArgs('/ethereum/supported-tokens')
                .resolves(testTokens);
            const NahmiiProvider = proxyquireProvider();
            provider = await NahmiiProvider.from(baseUrl, appId, appSecret);
        });

        afterEach(() => {
            provider.stopUpdate();
        });

        validateExpectedBehaviorOfProvider();
    });

    function validateExpectedBehaviorOfProvider() {
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

        it('will not create a new token when called several times shortly after each other', async () => {
            const t1 = await provider.getApiAccessToken();
            stubbedIdentityModel.createApiToken.resetBehavior();
            const t2 = await provider.getApiAccessToken();
            const t3 = await provider.getApiAccessToken();
            expect(t1).to.equal(t2);
            expect(t1).to.equal(t3);
            expect(stubbedIdentityModel.createApiToken.callCount).to.eql(1);
        });

        it('re-authenticates once a minute', async () => {
            const clock = sinon.useFakeTimers(new Date());

            let i = 0;
            stubbedIdentityModel.createApiToken.reset();
            stubbedIdentityModel.createApiToken.resolves('token.' + i);
            expect(await provider.getApiAccessToken()).to.eql('token.' + i++);

            for (; i <= 10; i++) {
                const expectedToken = `token.${i}`;
                stubbedIdentityModel.createApiToken.resolves(expectedToken);
                clock.tick(60 * 1000);
                await stubbedIdentityModel.createApiToken.promise;
                expect(await provider.getApiAccessToken()).to.eql(expectedToken);
            }
            clock.restore();
        });

        it('can retrieve a list of supported tokens', async () => {
            const tokens = await provider.getSupportedTokens();
            expect(tokens).to.equal(testTokens);
        });

        it('can return TokenInfo for symbol ETH', async () => {
            const expectedTokenInfo = {
                currency: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                color: ''
            };
            const token = await provider.getTokenInfo('ETH');
            expect(token).to.eql(expectedTokenInfo);
        });

        it('can return TokenInfo for ETH address', async () => {
            const expectedTokenInfo = {
                currency: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                color: ''
            };
            const token = await provider.getTokenInfo('0x0000000000000000000000000000000000000000', true);
            expect(token).to.eql(expectedTokenInfo);
        });

        it('can return TokenInfo for ETH symbol', async () => {
            const expectedTokenInfo = {
                currency: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                decimals: 18,
                color: ''
            };
            const token = await provider.getTokenInfo('ETH');
            expect(token).to.eql(expectedTokenInfo);
        });

        it('can return TokenInfo for token symbol', async () => {
            const token = await provider.getTokenInfo(testTokens[1].symbol);
            expect(token).to.eql(testTokens[1]);
        });

        it('can return TokenInfo for token address', async () => {
            const token = await provider.getTokenInfo(testTokens[2].currency, true);
            expect(token).to.eql(testTokens[2]);
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

        it('can retrieve the list of payment receipts for a wallet', async () => {
            const expectedReceipts = [];
            stubbedNahmiiRequest.get
                .withArgs(`/trading/wallets/${walletAddr}/receipts`)
                .resolves(expectedReceipts);
            const result = await provider.getWalletReceipts(walletAddr);
            expect(result).to.equal(expectedReceipts);
        });

        it('can retrieve the list of payment receipts for a wallet with paginator/filter criteria', async () => {
            const expectedReceipts = [];
            const fromNonce = 1;
            const limit = 1;
            const asc = true;
            stubbedNahmiiRequest.get
                .withArgs(`/trading/wallets/${walletAddr}/receipts`, {
                    fromNonce,
                    limit,
                    direction: 'asc'
                })
                .resolves(expectedReceipts);
            const result = await provider.getWalletReceipts(walletAddr, fromNonce, limit, asc);
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
            [403, 'Not authorized!'],
            [500, 'registerPayment() failed.']
        ].forEach(([statusCode, expectedMessage]) => {
            it(`sends back error messages with sensible messages when API fails to register payment (${statusCode})`, (done) => {
                const expectedPayment = {};
                const error4xx = {
                    status: statusCode,
                    response: {
                        text: JSON.stringify({message: expectedMessage})
                    }
                };
                const errorDefault = {
                    // Cannot be predicted
                    response: {
                        error: {
                            message: expectedMessage
                        }
                    }
                };
                const error = statusCode >= 500 ? errorDefault : error4xx;
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

        it('sends back an error with the minimum balance required when API fails due to insufficient funds to register payment', (done) => {
            const expectedPayment = {};
            const error = {
                status: 402,
                response: {
                    text: JSON.stringify({message: 'Insufficient funds: The minimum balance of this token is 1.2.'})
                }
            };
            stubbedNahmiiRequest.post
                .withArgs('/trading/payments', expectedPayment)
                .rejects(error);
            provider
                .registerPayment(expectedPayment)
                .catch(err => {
                    expect(err.message).to.match(/insufficient funds/i);
                    expect(err).to.be.an.instanceOf(InsufficientFundsError);
                    expect(err.minimumBalance).to.eql(1.2);
                    done();
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
            [404, 'Payment not found'],
            [500, 'effectuatePayment() failed.']
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
        });

        it('can register a settlement', () => {
            const serializedTx = 'serializedtx';
            const payload = {serialized: serializedTx};
            stubbedNahmiiRequest.post
                .withArgs('/trading/settlements', payload)
                .resolves();
            return provider.registerSettlement(serializedTx);
        });

        [
            [402, 'Insufficent funds'],
            [409, 'Settlement already registered'],
            [422, 'Invalid params'],
            [500, 'registerSettlement() failed.']
        ].forEach(([statusCode, expectedMessage]) => {
            it('sends back error messages with sensible messages when API fails to register settlement', (done) => {
                const expectedSignedTx = '0x';
                const error = new Error();
                error.status = statusCode;
                error.response = {
                    text: JSON.stringify({message: expectedMessage})
                };
                stubbedNahmiiRequest.post
                    .withArgs('/trading/settlements', {serialized: expectedSignedTx})
                    .rejects(error);
                provider
                    .registerSettlement(expectedSignedTx)
                    .catch(err => {
                        expect(err.message).to.eql(expectedMessage);
                        done();
                    });
            });
        });

        it('can watch a tx hash and resolve when it\'s mined and executed successfully', async () => {
            const txReceipt = {hash: 'magic tx hash', status: 1};
            const txHash = '0x1bb332f5b3c2c6b56e43284145c1cb7454606d89bd9b82bd8821e3edfe8d35ad';
            sinon.stub(provider, 'getTransactionReceipt')
                .withArgs(txHash)
                .resolves(txReceipt);
            const result = await provider.getTransactionConfirmation(txHash);
            expect(result).to.equal(txReceipt);
        });

        it('can watch a tx hash and reject when it\'s mined but failed to execute', (done) => {
            const txReceipt = {hash: 'magic tx hash 2', status: 0};
            const txHash = '0x1bb332f5b3c2c6b56e43284145c1cb7454606d89bd9b82bd8821e3edfe8d35ad';

            sinon.stub(provider, 'getTransactionReceipt')
                .withArgs(txHash)
                .resolves(txReceipt);

            provider
                .getTransactionConfirmation(txHash)
                .catch(err => {
                    expect(err.message).to.equal('Transaction failed');
                    done();
                });
        });

        it('has the domain name of the cluster', () => {
            expect(provider.nahmiiDomain).to.eql(baseUrl);
        });

        it('can retrieve cluster information', async () => {
            expect(await provider.getClusterInformation()).to.eql(clusterInformation);
        });

        it('has the operator address', () => {
            expect(provider.operatorAddress.toString()).to.eql(clusterInformation.ethereum.operatorAddress);
        });
    }
});
