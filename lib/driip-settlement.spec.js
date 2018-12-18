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
                nonce: 1,
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
            nonce: 1,
            amount: '100',
            currency: {ct: currency, id: 0},
            sender: {wallet: ''},
            recipient: {wallet: ''}
        });
        sinon.stub(driipSettlement, 'hasProposalExpired').resolves(false);
        driipSettlement.startChallengeFromPayment(receipt, amount, wallet).catch(err => {
            expect(err.message).to.match(/not.*start/i);
            expect(err.reasons.length).to.equal(1);
            expect(err.reasons[0].message).to.match(/expired/i);
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
            expect(err.message).to.match(/not.*start/i);
            expect(err.reasons.length).to.equal(1);
            expect(err.reasons[0].message).to.match(/restarted/i);
            done();
        });
    });

    testTokens.forEach(t => {
        it(`can start payment challenge period for token ${t.symbol}`, async () => {
            const receipt = Receipt.from({
                nonce: 1,
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
        sinon.stub(driipSettlement, 'hasProposalExpired').resolves(false);
        sinon.stub(driipSettlement, 'getCurrentProposalStatus').resolves('Qualified');
        driipSettlement.settleDriipAsPayment(receipt, wallet).catch(err => {
            expect(err.message).to.match(/not.*settle/i);
            expect(err.reasons.length).to.equal(1);
            expect(err.reasons[0].message).to.match(/expired/i);
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
        sinon.stub(driipSettlement, 'hasProposalExpired').resolves(true);
        sinon.stub(driipSettlement, 'getCurrentProposalStatus').resolves('Disqualified');
        driipSettlement.settleDriipAsPayment(receipt, wallet).catch(err => {
            expect(err.message).to.match(/not.*settle/i);
            expect(err.reasons.length).to.equal(1);
            expect(err.reasons[0].message).to.match(/qualified/i);
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

        driipSettlement.settleDriipAsPayment(receipt, wallet).catch(err => {
            expect(err.message).to.match(/not.*settle/i);
            expect(err.reasons.length).to.equal(1);
            expect(err.reasons[0].message).to.match(/replayed/i);
            done();
        });
    });

    describe('#getCurrentProposalStatus', () => {
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

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null as challenge status when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementChallengeContract.proposalStatus
                    .withArgs(wallet.address, address0, address0id)
                    .throws(error);
                const status = await driipSettlement.getCurrentProposalStatus(wallet.address, address0, address0id);
                expect(status).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', () => {
            const error = new Error();
            stubbedDriipSettlementChallengeContract.proposalStatus
                .withArgs(wallet.address, address0, address0id)
                .throws(error);
            return driipSettlement.getCurrentProposalStatus(wallet.address, address0, address0id).catch(e => {
                expect(e).to.equal(error);
            });
        });
    });

    describe('#getCurrentProposalNonce', () => {
        it('can correctly return nonce', async () => {
            const nonce = 1;
            stubbedDriipSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, address0, address0id)
                .resolves(nonce);
            const status = await driipSettlement.getCurrentProposalNonce(wallet.address, address0, address0id);
            expect(status).to.equal(nonce);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementChallengeContract.proposalNonce
                    .withArgs(wallet.address, address0, address0id)
                    .throws(error);
                const nonce = await driipSettlement.getCurrentProposalNonce(wallet.address, address0, address0id);
                expect(nonce).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error();
            stubbedDriipSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, address0, address0id)
                .throws(error);
            driipSettlement.getCurrentProposalNonce(wallet.address, address0, address0id).catch(e => {
                expect(e).to.equal(error);
                done();
            });
        });
    });

    describe('#getCurrentProposalExpirationTime', () => {
        it('can correctly return expiration time', async () => {
            const timeout = ethers.utils.bigNumberify(3000000);
            stubbedDriipSettlementChallengeContract.proposalExpirationTime
                .withArgs(wallet.address, address0, address0id)
                .resolves(timeout);
            const _timeout = await driipSettlement.getCurrentProposalExpirationTime(wallet.address, address0, address0id);
            expect(_timeout).to.equal(timeout);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementChallengeContract.proposalExpirationTime
                    .withArgs(wallet.address, address0, address0id)
                    .throws(error);
                const time = await driipSettlement.getCurrentProposalExpirationTime(wallet.address, address0, address0id);
                expect(time).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error();
            stubbedDriipSettlementChallengeContract.proposalExpirationTime
                .withArgs(wallet.address, address0, address0id)
                .throws(error);
            driipSettlement.getCurrentProposalExpirationTime(wallet.address, address0, address0id).catch(e => {
                expect(e).to.equal(error);
                done();
            });
        });
    });

    describe('hasProposalExpired', () => {
        it('can correctly return if expired', async () => {
            const hasExpired = true;
            stubbedDriipSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, address0, address0id)
                .resolves(hasExpired);
            const _hasExpired = await driipSettlement.hasProposalExpired(wallet.address, address0, address0id);
            expect(_hasExpired).to.equal(hasExpired);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementChallengeContract.hasProposalExpired
                    .withArgs(wallet.address, address0, address0id)
                    .throws(error);
                const expired = await driipSettlement.hasProposalExpired(wallet.address, address0, address0id);
                expect(expired).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error();
            stubbedDriipSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, address0, address0id)
                .throws(error);
            driipSettlement.hasProposalExpired(wallet.address, address0, address0id).catch(e => {
                expect(e).to.equal(error);
                done();
            });
        });
    });

    describe('#getCurrentProposalStageAmount', () => {
        it('can correctly return proposal stage amount', async () => {
            const stageAmount = ethers.utils.bigNumberify(3000000);
            stubbedDriipSettlementChallengeContract.proposalStageAmount
                .withArgs(wallet.address, address0, address0id)
                .resolves(stageAmount);
            const _stageAmount = await driipSettlement.getCurrentProposalStageAmount(wallet.address, address0, address0id);
            expect(_stageAmount).to.equal(stageAmount);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementChallengeContract.proposalStageAmount
                    .withArgs(wallet.address, address0, address0id)
                    .throws(error);
                const stageAmount = await driipSettlement.getCurrentProposalStageAmount(wallet.address, address0, address0id);
                expect(stageAmount).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error();
            stubbedDriipSettlementChallengeContract.proposalStageAmount
                .withArgs(wallet.address, address0, address0id)
                .throws(error);
            driipSettlement.getCurrentProposalStageAmount(wallet.address, address0, address0id).catch(e => {
                expect(e).to.equal(error);
                done();
            });
        });
    });

    describe('#getSettlementByNonce', () => {
        const nonce = 1;
        it('can get current settlement detailed object', async () => {
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

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementContract.settlementByNonce
                    .withArgs(nonce)
                    .throws(error);
                const settlementObj = await driipSettlement.getSettlementByNonce(nonce);
                expect(settlementObj).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error();
            stubbedDriipSettlementContract.settlementByNonce
                .withArgs(nonce)
                .throws(error);
            driipSettlement.getSettlementByNonce(nonce).catch(e => {
                expect(e).to.equal(error);
                done();
            });
        });
    });

    describe('#checkStartChallengeFromPayment', () => {
        const receipt = Receipt.from({
            nonce: 1,
            amount: '100',
            currency: {ct: address0, id: 0},
            sender: {wallet: ''},
            recipient: {wallet: ''}
        });
        const stageAmount = MonetaryAmount.from({amount: 1, currency: {ct: address0, id: address0id}});
        const {currency} = stageAmount.toJSON();

        it('should be valid to start new challenge', async () => {
            const expectedResult = {valid: true};
            stubbedDriipSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(ethers.utils.bigNumberify(0));
            const result = await driipSettlement.checkStartChallengeFromPayment(receipt, wallet.address);
            expect(result).to.deep.equal(expectedResult);
        });

        it('should be invalid to start new challenge', async () => {
            const notExpiredError = new Error('Current challenge proposal has not expired yet!');
            const replayError = new Error('The settlement can not be replayed!');
            const restartError = new Error('The challenge can not be restarted!');
            const expectedResult = {
                valid: false, 
                reasons: [notExpiredError, replayError, restartError]
            };
            const settlement = {
                origin: {wallet: wallet.address, done: true},
                target: {wallet: '', done: false}
            };

            stubbedDriipSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(false);
            stubbedDriipSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(ethers.utils.bigNumberify(1));
            stubbedDriipSettlementContract.settlementByNonce
                .withArgs(receipt.toJSON().nonce)
                .resolves(settlement);

            const result = await driipSettlement.checkStartChallengeFromPayment(receipt, wallet.address);
            expect(result.valid).to.equal(expectedResult.valid);
            expect(result.reasons.length).to.equal(expectedResult.reasons.length);
            for (let i = 0; i < result.reasons.length; i++) {
                const reason = result.reasons[i];
                expect(reason.message).to.equal(expectedResult.reasons[i].message);
            }
        });
    });

    describe('#checkSettleDriipAsPayment', () => {
        const receipt = Receipt.from({
            nonce: 1,
            amount: '100',
            currency: {ct: address0, id: 0},
            sender: {wallet: ''},
            recipient: {wallet: ''}
        });
        const stageAmount = MonetaryAmount.from({amount: 1, currency: {ct: address0, id: address0id}});
        const {currency} = stageAmount.toJSON();

        it('should be valid to settle', async () => {
            const expectedResult = {valid: true};
            stubbedDriipSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(ethers.utils.bigNumberify(0));
            stubbedDriipSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(true);
            const result = await driipSettlement.checkSettleDriipAsPayment(receipt, wallet.address);
            expect(result).to.deep.equal(expectedResult);
        });

        it('should be invalid to settle', async () => {
            const notExpiredError = new Error('Current challenge proposal has not expired yet!');
            const statusError = new Error('Current challenge proposal is disqualified!');
            const replayError = new Error('The settlement can not be replayed!');
            const expectedResult = {
                valid: false, 
                reasons: [notExpiredError, statusError, replayError]
            };
            const settlement = {
                origin: {wallet: wallet.address, done: true},
                target: {wallet: '', done: false}
            };

            stubbedDriipSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(false);
            stubbedDriipSettlementChallengeContract.proposalStatus
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(1);
            stubbedDriipSettlementContract.settlementByNonce
                .withArgs(receipt.toJSON().nonce)
                .resolves(settlement);

            const result = await driipSettlement.checkSettleDriipAsPayment(receipt, wallet.address);

            expect(result.valid).to.equal(expectedResult.valid);
            expect(result.reasons.length).to.equal(expectedResult.reasons.length);
            for (let i = 0; i < result.reasons.length; i++) {
                const reason = result.reasons[i];
                expect(reason.message).to.equal(expectedResult.reasons[i].message);
            }
        });
    });
});
// 