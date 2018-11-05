'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');
const Receipt = require('./receipt');
const MonetaryAmount = require('./monetary-amount');

const privateKey = '0x' + '0F'.repeat(32);
const walletAddress = '0x691A8D05678FC962ff0f2174134379c0051Cb686'; // Derived from privateKey! Not random!

const apiAccessToken = 'hubii-api-token';

const stubbedProvider = {
    chainId: 3,
    getTransactionReceipt: sinon.stub(),
    getApiAccessToken: sinon.stub(),
    getSupportedTokens: sinon.stub(),
    getNahmiiBalances: sinon.stub(),
    resolveName: sinon.stub()
};

const testTokens = [
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

const stubbedClientFundContract = {
    depositTokens: sinon.stub(),
    withdraw: sinon.stub(),
    unstage: sinon.stub(),
    address: 'client fund address'
};

const stubbedErc20Contract = {
    approve: sinon.stub()
};

const stubbedDriipSettlementChallengeContract = {
    startChallengeFromPayment: sinon.stub(),
    walletProposalMap: sinon.stub(),
    proposalStatus: sinon.stub(),
    challengePhase: sinon.stub()
};

const stubbedDriipSettlementContract = {
    settlePayment: sinon.stub(),
    settlementByNonce: sinon.stub()
};

function proxyquireWallet() {
    return proxyquire('./wallet', {
        './client-fund-contract': function() {
            return stubbedClientFundContract;
        },
        './erc20-contract': function(address) {
            stubbedErc20Contract.address = address;
            return stubbedErc20Contract;
        },
        './driip-settlement-challenge-contract': function() {
            return stubbedDriipSettlementChallengeContract;
        },
        './driip-settlement-contract': function() {
            return stubbedDriipSettlementContract;
        }
    });
}


describe('Wallet', () => {
    let wallet;

    beforeEach(() => {
        stubbedProvider.getApiAccessToken.resolves(apiAccessToken);
        stubbedProvider.getSupportedTokens.resolves(testTokens);
        const Wallet = proxyquireWallet();
        wallet = new Wallet(privateKey, stubbedProvider);
    });

    afterEach(() => {
        stubbedErc20Contract.approve.reset();
        stubbedClientFundContract.depositTokens.reset();
        stubbedClientFundContract.withdraw.reset();
        stubbedClientFundContract.unstage.reset();
        stubbedDriipSettlementChallengeContract.startChallengeFromPayment.reset();
        stubbedDriipSettlementChallengeContract.proposalStatus.reset();
        stubbedDriipSettlementChallengeContract.walletProposalMap.reset();
        stubbedDriipSettlementChallengeContract.challengePhase.reset();
        stubbedDriipSettlementContract.settlePayment.reset();
        stubbedDriipSettlementContract.settlementByNonce.reset();
        stubbedProvider.getNahmiiBalances.reset();
        stubbedProvider.getSupportedTokens.reset();
        stubbedProvider.getTransactionReceipt.reset();
        stubbedProvider.getApiAccessToken.reset();
    });

    context('an empty wallet', () => {
        beforeEach(() => {
            stubbedProvider.getNahmiiBalances
                .withArgs(walletAddress)
                .resolves([]);
        });

        it('has no nahmii balance', async () => {
            let balance = await wallet.getNahmiiBalance();
            expect(balance).to.eql({});
        });
    });

    context('a wallet with nahmii balance', () => {
        beforeEach(() => {
            stubbedProvider.getNahmiiBalances
                .withArgs(walletAddress)
                .resolves([
                    {
                        wallet: walletAddress,
                        currency: {
                            ct: '0x0000000000000000000000000000000000000000',
                            id: '0'
                        },
                        amount: '100200000000000000000'
                    },
                    {
                        wallet: walletAddress,
                        currency: {ct: testTokens[0].currency, id: '0'},
                        amount: '3140000000000000000'
                    }
                ]);
        });

        it('has a nahmii balance', async () => {
            let balance = await wallet.getNahmiiBalance();
            expect(balance).to.eql({
                'ETH': '100.2',
                'TT1': '3.14'
            });
        });
    });

    context('a wallet with a non-nahmii balance', () => {
        const fakeTx1 = {hash: 'magic tx hash 1'};
        const fakeTx2 = {hash: 'magic tx hash 2'};
        const expectedTxReceipt1 = {};
        const expectedTxReceipt2 = {};

        beforeEach(() => {
            stubbedProvider.getTransactionReceipt
                .withArgs(fakeTx1.hash)
                .resolves(expectedTxReceipt1);
            stubbedProvider.getTransactionReceipt
                .withArgs(fakeTx2.hash)
                .resolves(expectedTxReceipt2);
        });

        it('can deposit eth to nahmii', async () => {
            sinon.stub(wallet, 'send')
                .withArgs(stubbedClientFundContract.address, ethers.utils.parseEther('1.23'), {gasLimit: 1})
                .resolves(fakeTx1);
            let receipt = await wallet.depositEth('1.23', {gasLimit: 1});
            expect(receipt).to.equal(expectedTxReceipt1);
        });

        testTokens.forEach(t => {
            it(`can deposit ${t.symbol} tokens to nahmii`, async () => {
                stubbedErc20Contract.approve
                    .withArgs(stubbedClientFundContract.address, ethers.utils.parseUnits('2.71', t.decimals), {gasLimit: 1})
                    .resolves(fakeTx1);
                stubbedClientFundContract.depositTokens
                    .withArgs(ethers.utils.parseUnits('2.71', t.decimals), t.currency, '0', 'erc20', {gasLimit: 1})
                    .resolves(fakeTx2);
                let receipts = await wallet.depositToken('2.71', t.symbol, {gasLimit: 1});
                expect(receipts[0]).to.eql(expectedTxReceipt1);
                expect(receipts[1]).to.eql(expectedTxReceipt2);
            });
        });
    });

    context('a wallet with no non-nahmii balance', () => {
        beforeEach(() => {
            sinon.stub(wallet, 'send').rejects('insufficient funds');
            stubbedErc20Contract.approve.rejects('insufficient funds');
            stubbedClientFundContract.depositTokens.rejects('insufficient funds');
        });

        it('can not deposit eth to nahmii', (done) => {
            wallet.depositEth('1.23', {gasLimit: 1}).catch(err => {
                expect(err.name).to.eql('insufficient funds');
                done();
            });
        });

        it('can not deposit tokens to nahmii', (done) => {
            wallet.depositToken('2.71', 'TT1', {gasLimit: 1}).catch(err => {
                expect(err.message).to.match(/failed.*approve/i);
                done();
            });
        });
    });

    context('settle payment', () => {
        const fakeTx = {hash: 'magic tx hash 1'};
        const challengePhases = ['Dispute', 'Closed'];
        const challengeStatuses = ['Unknown', 'Qualified', 'Disqualified'];

        it('can start payment challenge period for eth', async () => {
            const currency = '0x0000000000000000000000000000000000000000';
            const receipt = Receipt.from({}, {
                amount: '100',
                currency: {ct: currency, id: 0},
                sender: {wallet: ''},
                recipient: {wallet: ''}
            });
            const amount = '1.23';
            const stageAmount = new MonetaryAmount(ethers.utils.parseUnits(amount, 18), currency, 0);
            stubbedDriipSettlementChallengeContract.startChallengeFromPayment
                .withArgs(receipt.toJSON(), stageAmount.toJSON().amount, {})
                .resolves(fakeTx);
            sinon.stub(wallet, 'getCurrentPaymentChallengePhase').resolves('Closed');
            let tx = await wallet.startChallengeFromPayment(receipt, stageAmount);
            expect(tx).to.equal(fakeTx);
        });

        it('can not start payment challenge period', (done) => {
            const receipt = {};
            const amount = '1.23';
            sinon.stub(wallet, 'getCurrentPaymentChallengePhase').resolves('Dispute');
            wallet.startChallengeFromPayment(receipt, amount).catch(err => {
                expect(err.message).to.match(/challenge.*dispute/i);
                done();
            });
        });

        testTokens.forEach(t => {
            it(`can start payment challenge period for token ${t.symbol}`, async () => {
                const receipt = Receipt.from({}, {
                    amount: '100',
                    currency: {ct: testTokens[1].currency, id: 0},
                    sender: {wallet: ''},
                    recipient: {wallet: ''}
                });
                const amount = '1.23';
                const stageAmount = new MonetaryAmount(ethers.utils.parseUnits(amount, 18), t.currency, 0);
                stubbedDriipSettlementChallengeContract.startChallengeFromPayment
                    .withArgs(receipt.toJSON(), stageAmount.toJSON().amount)
                    .resolves(fakeTx);
                sinon.stub(wallet, 'getCurrentPaymentChallengePhase').resolves('Closed');
                let tx = await wallet.startChallengeFromPayment(receipt, stageAmount);
                expect(tx).to.equal(fakeTx);
            });
        });

        it('can settle payment driip', async () => {
            const receipt = Receipt.from({}, {
                amount: '100',
                currency: {ct: '0x0000000000000000000000000000000000000000', id: 0},
                sender: {wallet: ''},
                recipient: {wallet: ''}
            });
            stubbedDriipSettlementContract.settlePayment
                .withArgs(receipt.toJSON(), {})
                .resolves(fakeTx);
            sinon.stub(wallet, 'getCurrentPaymentChallengePhase').resolves('Closed');
            sinon.stub(wallet, 'getCurrentPaymentChallengeStatus').resolves('Qualified');
            let tx = await wallet.settleDriipAsPayment(receipt, {});
            expect(tx).to.equal(fakeTx);
        });

        it('can not settle payment driip when phase is in dispute', (done) => {
            const receipt = Receipt.from({}, {
                amount: '100',
                currency: {ct: '0x0000000000000000000000000000000000000000', id: 0},
                sender: {wallet: ''},
                recipient: {wallet: ''}
            });
            stubbedDriipSettlementContract.settlePayment
                .withArgs(receipt.toJSON(), {})
                .resolves(fakeTx);
            sinon.stub(wallet, 'getCurrentPaymentChallengePhase').resolves('Dispute');
            sinon.stub(wallet, 'getCurrentPaymentChallengeStatus').resolves('Qualified');
            wallet.settleDriipAsPayment(receipt, {}).catch(err => {
                expect(err.message).to.match(/phase.*dispute/i);
                done();
            });
        });

        it('can not settle payment driip when status is in disqualified', (done) => {
            const receipt = Receipt.from({}, {
                amount: '100',
                currency: {ct: '0x0000000000000000000000000000000000000000', id: 0},
                sender: {wallet: ''},
                recipient: {wallet: ''}
            });
            stubbedDriipSettlementContract.settlePayment
                .withArgs(receipt.toJSON(), {})
                .resolves(fakeTx);
            sinon.stub(wallet, 'getCurrentPaymentChallengePhase').resolves('Closed');
            sinon.stub(wallet, 'getCurrentPaymentChallengeStatus').resolves('Disqualified');
            wallet.settleDriipAsPayment(receipt, {}).catch(err => {
                expect(err.message).to.match(/status.*disqualified/i);
                done();
            });
        });

        it('can not settle payment driip when the settlement is already done before', (done) => {
            const receipt = Receipt.from({}, {
                nonce: 1,
                amount: '100',
                currency: {ct: '0x0000000000000000000000000000000000000000', id: 0},
                sender: {wallet: ''},
                recipient: {wallet: ''}
            });
            const settlement = {
                origin: {wallet: wallet.address, done: true},
                target: {wallet: '', done: false}
            };
            stubbedDriipSettlementContract.settlementByNonce
                .withArgs(receipt.toJSON().nonce)
                .resolves(settlement);
            sinon.stub(wallet, 'getCurrentPaymentChallengePhase').resolves('Closed');
            sinon.stub(wallet, 'getCurrentPaymentChallengeStatus').resolves('Qualified');
            stubbedDriipSettlementContract.settlePayment
                .withArgs(receipt.toJSON(), {})
                .resolves(fakeTx);

            wallet.settleDriipAsPayment(receipt, {}).catch(err => {
                expect(err.message).to.match(/settlement.*done/i);
                done();
            });
        });

        challengePhases.forEach((t, i) => {
            it(`can correctly parse challenge phase ${t}`, async () => {
                stubbedDriipSettlementChallengeContract.challengePhase
                    .withArgs(wallet.address)
                    .resolves(i);
                const phase = await wallet.getCurrentPaymentChallengePhase();
                expect(phase).to.equal(t);
            });
        });

        challengeStatuses.forEach((t, i) => {
            it(`can correctly parse challenge status ${t}`, async () => {
                stubbedDriipSettlementChallengeContract.proposalStatus
                    .withArgs(wallet.address)
                    .resolves(i);
                const status = await wallet.getCurrentPaymentChallengeStatus();
                expect(status).to.equal(t);
            });
        });

        it('can get current challenge detailed object', async () => {
            const expectedDetails = {
                nonce: ethers.utils.bigNumberify(1),
                timeout: ethers.utils.bigNumberify(1),//represents the end time of the challenge period
                status: 1,
                driipType: 1,
                driipIndex: ethers.utils.bigNumberify(0),
                intendedStage: [],
                conjugateStage: [],
                intendedTargetBalance: [],
                conjugateTargetBalance: [],
                candidateType: 0,
                candidateIndex: ethers.utils.bigNumberify(0),
                challenger: '0x0000000000000000000000000000000000000000' 
            };
            
            stubbedDriipSettlementChallengeContract.walletProposalMap
                .withArgs(wallet.address)
                .resolves(expectedDetails);
            const details = await wallet.getCurrentPaymentChallenge();
            expect(details).to.equal(expectedDetails);
        });

        it('can get current settlement detailed object', async () => {
            const nonce = 1;
            const expectedSettlement = {
                origin: {wallet: '', done: true},
                target: {wallet: '', done: false}
            };
            stubbedDriipSettlementContract.settlementByNonce
                .withArgs(nonce)
                .resolves(expectedSettlement);

            const details = await wallet.getSettlementByNonce(nonce);
            expect(details).to.equal(expectedSettlement);
        });

        it('can not get current settlement detailed object', async () => {
            const nonce = 1;
            const expectedSettlement = null;
            stubbedDriipSettlementContract.settlementByNonce.rejects({});

            const details = await wallet.getSettlementByNonce(nonce);
            expect(details).to.equal(expectedSettlement);
        });
    });

    context('withdraw back into base layer', () => {
        const fakeTx = {hash: 'magic tx hash 1'};
        
        it('can withdraw eth or tokens', async () => {
            const amount = '1.23';
            const currency = '0x0000000000000000000000000000000000000000';
            const amountBN = ethers.utils.parseUnits(amount, 18);
            stubbedClientFundContract.withdraw
                .withArgs(amountBN.toString(), currency, '0', '', {})
                .resolves(fakeTx);
            const monetaryAmount = new MonetaryAmount(amountBN, currency, 0);
            let tx = await wallet.withdraw(monetaryAmount);
            expect(tx).to.equal(fakeTx);
        });
    });

    context('unstage nahmii balance', () => {
        const fakeTx = {hash: 'magic tx hash 1'};

        it('can unstage eth or tokens', async () => {
            const amount = '1.23';
            const currency = '0x0000000000000000000000000000000000000000';
            const amountBN = ethers.utils.parseUnits(amount, 18);
            stubbedClientFundContract.unstage
                .withArgs(amountBN.toString(), currency, '0', {})
                .resolves(fakeTx);
            const monetaryAmount = new MonetaryAmount(amountBN, currency, 0);
            let tx = await wallet.unstage(monetaryAmount);
            expect(tx).to.equal(fakeTx);
        });
    });
});
