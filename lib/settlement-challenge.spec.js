'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');
const Wallet = require('./wallet');
const Receipt = require('./receipt');
const MonetaryAmount = require('./monetary-amount');

const privateKey = '0x' + '0F'.repeat(32);

const stubbedProvider = {
    chainId: 3,
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

function proxyquireSettlementChallenge() {
    return proxyquire('./settlement-challenge', {
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
    let settlementChallenge;

    beforeEach(() => {
        wallet = new Wallet(privateKey, stubbedProvider);
        const SettlementChallenge = proxyquireSettlementChallenge();
        settlementChallenge = new SettlementChallenge(stubbedProvider);
    });

    afterEach(() => {
        stubbedDriipSettlementChallengeContract.startChallengeFromPayment.reset();
        stubbedDriipSettlementChallengeContract.proposalStatus.reset();
        stubbedDriipSettlementChallengeContract.walletProposalMap.reset();
        stubbedDriipSettlementChallengeContract.challengePhase.reset();
        stubbedDriipSettlementContract.settlePayment.reset();
        stubbedDriipSettlementContract.settlementByNonce.reset();
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
            sinon.stub(settlementChallenge, 'getCurrentPaymentChallengePhase').resolves('Closed');
            let tx = await settlementChallenge.startChallengeFromPayment(receipt, stageAmount, wallet);
            expect(tx).to.equal(fakeTx);
        });

        it('can not start payment challenge period', (done) => {
            const receipt = {};
            const amount = '1.23';
            sinon.stub(settlementChallenge, 'getCurrentPaymentChallengePhase').resolves('Dispute');
            settlementChallenge.startChallengeFromPayment(receipt, amount, wallet).catch(err => {
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
                sinon.stub(settlementChallenge, 'getCurrentPaymentChallengePhase').resolves('Closed');
                let tx = await settlementChallenge.startChallengeFromPayment(receipt, stageAmount, wallet);
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
            sinon.stub(settlementChallenge, 'getCurrentPaymentChallengePhase').resolves('Closed');
            sinon.stub(settlementChallenge, 'getCurrentPaymentChallengeStatus').resolves('Qualified');
            let tx = await settlementChallenge.settleDriipAsPayment(receipt, wallet);
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
            sinon.stub(settlementChallenge, 'getCurrentPaymentChallengePhase').resolves('Dispute');
            sinon.stub(settlementChallenge, 'getCurrentPaymentChallengeStatus').resolves('Qualified');
            settlementChallenge.settleDriipAsPayment(receipt, wallet).catch(err => {
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
            sinon.stub(settlementChallenge, 'getCurrentPaymentChallengePhase').resolves('Closed');
            sinon.stub(settlementChallenge, 'getCurrentPaymentChallengeStatus').resolves('Disqualified');
            settlementChallenge.settleDriipAsPayment(receipt, wallet).catch(err => {
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
            sinon.stub(settlementChallenge, 'getCurrentPaymentChallengePhase').resolves('Closed');
            sinon.stub(settlementChallenge, 'getCurrentPaymentChallengeStatus').resolves('Qualified');
            stubbedDriipSettlementContract.settlePayment
                .withArgs(receipt.toJSON(), {})
                .resolves(fakeTx);

            settlementChallenge.settleDriipAsPayment(receipt, wallet).catch(err => {
                expect(err.message).to.match(/settlement.*done/i);
                done();
            });
        });

        challengePhases.forEach((t, i) => {
            it(`can correctly parse challenge phase ${t}`, async () => {
                stubbedDriipSettlementChallengeContract.challengePhase
                    .withArgs(wallet.address)
                    .resolves(i);
                const phase = await settlementChallenge.getCurrentPaymentChallengePhase(wallet.address);
                expect(phase).to.equal(t);
            });
        });

        challengeStatuses.forEach((t, i) => {
            it(`can correctly parse challenge status ${t}`, async () => {
                stubbedDriipSettlementChallengeContract.proposalStatus
                    .withArgs(wallet.address)
                    .resolves(i);
                const status = await settlementChallenge.getCurrentPaymentChallengeStatus(wallet.address);
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
            const details = await settlementChallenge.getCurrentPaymentChallenge(wallet.address);
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

            const details = await settlementChallenge.getSettlementByNonce(nonce);
            expect(details).to.equal(expectedSettlement);
        });

        it('can not get current settlement detailed object', async () => {
            const nonce = 1;
            const expectedSettlement = null;
            stubbedDriipSettlementContract.settlementByNonce.rejects({});

            const details = await settlementChallenge.getSettlementByNonce(nonce);
            expect(details).to.equal(expectedSettlement);
        });
    });

});
