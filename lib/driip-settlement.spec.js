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

const stubbedProvider = {
    network: {chainId: 3},
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
    challengePhase: sinon.stub(),
    proposalNonce: sinon.stub(),
    proposalExpirationTime: sinon.stub(),
    hasProposalExpired: sinon.stub(),
    proposalStageAmount: sinon.stub()
};

const stubbedDriipSettlementContract = {
    settlePayment: sinon.stub(),
    settlementByNonce: sinon.stub()
};

function proxyquireSettlementChallenge() {
    return proxyquire('./driip-settlement', {
        './driip-settlement-challenge-contract': function() {
            return stubbedDriipSettlementChallengeContract;
        },
        './driip-settlement-contract': function() {
            return stubbedDriipSettlementContract;
        }
    });
}


describe('Driip settlement operations', () => {
    let wallet;
    let driipSettlement;

    beforeEach(() => {
        wallet = {address: '0x0000000000000000000000000000000000000002'};
        const DriipSettlement = proxyquireSettlementChallenge();
        driipSettlement = new DriipSettlement(stubbedProvider);
    });

    afterEach(() => {
        stubbedDriipSettlementChallengeContract.startChallengeFromPayment.reset();
        stubbedDriipSettlementChallengeContract.proposalStatus.reset();
        stubbedDriipSettlementChallengeContract.walletProposalMap.reset();
        stubbedDriipSettlementChallengeContract.challengePhase.reset();
        stubbedDriipSettlementChallengeContract.proposalNonce.reset();
        stubbedDriipSettlementChallengeContract.proposalExpirationTime.reset();
        stubbedDriipSettlementChallengeContract.hasProposalExpired.reset();
        stubbedDriipSettlementChallengeContract.proposalStageAmount.reset();
        stubbedDriipSettlementContract.settlePayment.reset();
        stubbedDriipSettlementContract.settlementByNonce.reset();
    });

    const fakeTx = {hash: 'magic tx hash 1'};
    const address0 = '0x0000000000000000000000000000000000000000';
    const address0id = 0;

    [true, null].forEach(t => {
        it(`can start payment challenge period for eth when #hasProposalExpired returns ${t}`, async () => {
            const currency = address0;
            const receipt = Receipt.from({
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
            sinon.stub(driipSettlement, 'hasProposalExpired').resolves(t);
            let tx = await driipSettlement.startChallengeFromPayment(receipt, stageAmount, wallet);
            expect(tx).to.equal(fakeTx);
        });
    });

    it('can not start payment challenge period when current challenge proposal has not expired yet', (done) => {
        const amount = '1.23';
        const currency = address0;
        const receipt = Receipt.from({
            amount: '100',
            currency: {ct: currency, id: 0},
            sender: {wallet: ''},
            recipient: {wallet: ''}
        });
        sinon.stub(driipSettlement, 'hasProposalExpired').resolves(false);
        driipSettlement.startChallengeFromPayment(receipt, amount, wallet).catch(err => {
            expect(err.message).to.match(/not.*expired/i);
            done();
        });
    });

    it('can not start payment challenge period when the receipt nonce is less or equal to the latest proposal\'s', (done) => {
        const amount = '1.23';
        const currency = address0;
        const receipt = Receipt.from({
            nonce: 2,
            amount: '100',
            currency: {ct: currency, id: 0},
            sender: {wallet: ''},
            recipient: {wallet: ''}
        });
        sinon.stub(driipSettlement, 'getCurrentProposalNonce').resolves(3);
        driipSettlement.startChallengeFromPayment(receipt, amount, wallet).catch(err => {
            expect(err.message).to.match(/challenge.*restarted/i);
            done();
        });
    });

    testTokens.forEach(t => {
        it(`can start payment challenge period for token ${t.symbol}`, async () => {
            const receipt = Receipt.from({
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
            sinon.stub(driipSettlement, 'hasProposalExpired').resolves(true);
            let tx = await driipSettlement.startChallengeFromPayment(receipt, stageAmount, wallet);
            expect(tx).to.equal(fakeTx);
        });
    });

    it('can settle payment driip', async () => {
        const receipt = Receipt.from({
            amount: '100',
            currency: {ct: address0, id: 0},
            sender: {wallet: ''},
            recipient: {wallet: ''}
        });
        stubbedDriipSettlementContract.settlePayment
            .withArgs(receipt.toJSON(), {})
            .resolves(fakeTx);
        sinon.stub(driipSettlement, 'hasProposalExpired').resolves(true);
        sinon.stub(driipSettlement, 'getCurrentProposalStatus').resolves('Qualified');
        let tx = await driipSettlement.settleDriipAsPayment(receipt, wallet);
        expect(tx).to.equal(fakeTx);
    });

    it('can not settle payment driip when proposal has not expired yet', (done) => {
        const receipt = Receipt.from({
            amount: '100',
            currency: {ct: address0, id: 0},
            sender: {wallet: ''},
            recipient: {wallet: ''}
        });
        stubbedDriipSettlementContract.settlePayment
            .withArgs(receipt.toJSON(), {})
            .resolves(fakeTx);
        sinon.stub(driipSettlement, 'hasProposalExpired').resolves(false);
        sinon.stub(driipSettlement, 'getCurrentProposalStatus').resolves('Qualified');
        driipSettlement.settleDriipAsPayment(receipt, wallet).catch(err => {
            expect(err.message).to.match(/proposal.*expired/i);
            done();
        });
    });

    it('can not settle payment driip when proposal is disqualified', (done) => {
        const receipt = Receipt.from({
            amount: '100',
            currency: {ct: address0, id: 0},
            sender: {wallet: ''},
            recipient: {wallet: ''}
        });
        stubbedDriipSettlementContract.settlePayment
            .withArgs(receipt.toJSON(), {})
            .resolves(fakeTx);
        sinon.stub(driipSettlement, 'hasProposalExpired').resolves(true);
        sinon.stub(driipSettlement, 'getCurrentProposalStatus').resolves('Disqualified');
        driipSettlement.settleDriipAsPayment(receipt, wallet).catch(err => {
            expect(err.message).to.match(/proposal.*disqualified/i);
            done();
        });
    });

    it('can not replay a payment driip settlement', (done) => {
        const receipt = Receipt.from({
            nonce: 1,
            amount: '100',
            currency: {ct: address0, id: 0},
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
        sinon.stub(driipSettlement, 'hasProposalExpired').resolves(true);
        sinon.stub(driipSettlement, 'getCurrentProposalStatus').resolves('Qualified');
        stubbedDriipSettlementContract.settlePayment
            .withArgs(receipt.toJSON(), {})
            .resolves(fakeTx);

        driipSettlement.settleDriipAsPayment(receipt, wallet).catch(err => {
            expect(err.message).to.match(/settlement.*replayed/i);
            done();
        });
    });

    describe('proposal status', () => {
        const challengeStatuses = ['Qualified', 'Disqualified'];
        challengeStatuses.forEach((t, i) => {
            it(`can correctly parse proposal status ${t}`, async () => {
                stubbedDriipSettlementChallengeContract.proposalStatus
                    .withArgs(wallet.address, address0, address0id)
                    .resolves(i);
                const status = await driipSettlement.getCurrentProposalStatus(wallet.address, address0, address0id);
                expect(status).to.equal(t);
            });
        });
        it('should return null as challenge status when exception thrown', async () => {
            stubbedDriipSettlementChallengeContract.proposalStatus
                .withArgs(wallet.address, address0, address0id)
                .throws('reverted');
            const status = await driipSettlement.getCurrentProposalStatus(wallet.address, address0, address0id);
            expect(status).to.equal(null);
        });
    });

    describe('proposal nonce', () => {
        it('can correctly return nonce', async () => {
            const nonce = 1;
            stubbedDriipSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, address0, address0id)
                .resolves(nonce);
            const status = await driipSettlement.getCurrentProposalNonce(wallet.address, address0, address0id);
            expect(status).to.equal(nonce);
        });
        it('should return null as challenge nonce when exception thrown', async () => {
            stubbedDriipSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, address0, address0id)
                .throws('reverted');
            const status = await driipSettlement.getCurrentProposalNonce(wallet.address, address0, address0id);
            expect(status).to.equal(null);
        });
    });

    describe('proposal expiration time', () => {
        it('can correctly return expiration time', async () => {
            const timeout = ethers.utils.bigNumberify(3000000);
            stubbedDriipSettlementChallengeContract.proposalExpirationTime
                .withArgs(wallet.address, address0, address0id)
                .resolves(timeout);
            const _timeout = await driipSettlement.getCurrentProposalExpirationTime(wallet.address, address0, address0id);
            expect(_timeout).to.equal(timeout);
        });
        it('should return null as challenge expiration time when exception thrown', async () => {
            stubbedDriipSettlementChallengeContract.proposalExpirationTime
                .withArgs(wallet.address, address0, address0id)
                .throws('reverted');
            const _timeout = await driipSettlement.getCurrentProposalExpirationTime(wallet.address, address0, address0id);
            expect(_timeout).to.equal(null);
        });
    });

    describe('proposal expiration check', () => {
        it('can correctly return if expired', async () => {
            const hasExpired = true;
            stubbedDriipSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, address0, address0id)
                .resolves(hasExpired);
            const _hasExpired = await driipSettlement.hasProposalExpired(wallet.address, address0, address0id);
            expect(_hasExpired).to.equal(hasExpired);
        });
        it('should return null when exception thrown', async () => {
            stubbedDriipSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, address0, address0id)
                .throws('reverted');
            const _timeout = await driipSettlement.hasProposalExpired(wallet.address, address0, address0id);
            expect(_timeout).to.equal(null);
        });
    });

    describe('proposal stage amount', () => {
        it('can correctly return proposal stage amount', async () => {
            const stageAmount = ethers.utils.bigNumberify(3000000);
            stubbedDriipSettlementChallengeContract.proposalStageAmount
                .withArgs(wallet.address, address0, address0id)
                .resolves(stageAmount);
            const _stageAmount = await driipSettlement.getCurrentProposalStageAmount(wallet.address, address0, address0id);
            expect(_stageAmount).to.equal(stageAmount);
        });
        it('should return null when exception thrown', async () => {
            stubbedDriipSettlementChallengeContract.proposalStageAmount
                .withArgs(wallet.address, address0, address0id)
                .throws('reverted');
            const _hasExpired = await driipSettlement.getCurrentProposalStageAmount(wallet.address, address0, address0id);
            expect(_hasExpired).to.equal(null);
        });
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

        const details = await driipSettlement.getSettlementByNonce(nonce);
        expect(details).to.equal(expectedSettlement);
    });

    it('can not get current settlement detailed object', async () => {
        const nonce = 1;
        const expectedSettlement = null;
        stubbedDriipSettlementContract.settlementByNonce.rejects({});

        const details = await driipSettlement.getSettlementByNonce(nonce);
        expect(details).to.equal(expectedSettlement);
    });

});
