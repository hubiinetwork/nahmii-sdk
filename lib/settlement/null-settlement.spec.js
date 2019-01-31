'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');
const MonetaryAmount = require('../monetary-amount');

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

const stubbedNullSettlementChallengeContract = {
    startChallenge: sinon.stub(),
    proposalStatus: sinon.stub(),
    proposalNonce: sinon.stub(),
    proposalExpirationTime: sinon.stub(),
    hasProposalExpired: sinon.stub(),
    proposalStageAmount: sinon.stub()
};

const stubbedNullSettlementContract = {
    settleNull: sinon.stub(),
    walletCurrencyMaxNullNonce: sinon.stub()
};

function proxyquireSettlementChallenge() {
    return proxyquire('./null-settlement', {
        './null-settlement-challenge-contract': function() {
            return stubbedNullSettlementChallengeContract;
        },
        './null-settlement-contract': function() {
            return stubbedNullSettlementContract;
        }
    });
}

describe('Null settlement operations', () => {
    let wallet;
    let nullSettlement;

    beforeEach(() => {
        wallet = {address: '0x0000000000000000000000000000000000000002'};
        const NullSettlement = proxyquireSettlementChallenge();
        nullSettlement = new NullSettlement(stubbedProvider);
    });

    afterEach(() => {
        stubbedNullSettlementChallengeContract.startChallenge.reset();
        stubbedNullSettlementChallengeContract.proposalStatus.reset();
        stubbedNullSettlementChallengeContract.proposalNonce.reset();
        stubbedNullSettlementChallengeContract.proposalExpirationTime.reset();
        stubbedNullSettlementChallengeContract.hasProposalExpired.reset();
        stubbedNullSettlementChallengeContract.proposalStageAmount.reset();
        stubbedNullSettlementContract.settleNull.reset();
        stubbedNullSettlementContract.walletCurrencyMaxNullNonce.reset();
    });

    const fakeTx = {hash: 'magic tx hash 1'};
    const address0 = '0x0000000000000000000000000000000000000000';
    const address0id = 0;

    [true, null].forEach(t => {
        it(`can start challenge for eth when #hasCurrentProposalExpired returns ${t}`, async () => {
            const currency = address0;
            const amount = '1.23';
            const stageAmount = new MonetaryAmount(ethers.utils.parseUnits(amount, 18), currency, 0);
            stubbedNullSettlementChallengeContract.startChallenge
                .withArgs(stageAmount.toJSON().amount, stageAmount.toJSON().currency.ct, stageAmount.toJSON().currency.id, {})
                .resolves(fakeTx);
            sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(t);
            let tx = await nullSettlement.startChallenge(wallet, stageAmount);
            expect(tx).to.equal(fakeTx);
        });
    });

    it('can not start challenge when proposal has not expired yet', (done) => {
        const currency = address0;
        const amount = '1.23';
        const stageAmount = new MonetaryAmount(ethers.utils.parseUnits(amount, 18), currency, 0);
        sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(false);
        nullSettlement.startChallenge(wallet, stageAmount).catch(err => {
            expect(err.message).to.match(/can.*not.*start/i);
            expect(err.reasons.length).to.equal(1);
            expect(err.reasons[0].message).to.match(/not.*expired/i);
            done();
        });
    });

    testTokens.forEach(t => {
        it(`can start challenge for token ${t.symbol}`, async () => {
            const amount = '1.23';
            const stageAmount = new MonetaryAmount(ethers.utils.parseUnits(amount, 18), t.currency, 0);
            stubbedNullSettlementChallengeContract.startChallenge
                .withArgs(stageAmount.toJSON().amount, stageAmount.toJSON().currency.ct, stageAmount.toJSON().currency.id, {})
                .resolves(fakeTx);
            sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(true);
            let tx = await nullSettlement.startChallenge(wallet, stageAmount);
            expect(tx).to.equal(fakeTx);
        });
    });

    describe('#settleNull', () => {
        it('can settle null', async () => {
            const currency = address0;
            stubbedNullSettlementContract.settleNull
                .withArgs(currency, 0, {})
                .resolves(fakeTx);
            sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(true);
            sinon.stub(nullSettlement, 'getCurrentProposalStatus').resolves('Qualified');
            let tx = await nullSettlement.settleNull(wallet, currency, 0);
            expect(tx).to.equal(fakeTx);
        });

        it('should rethrow from #settleNull', (done) => {
            const currency = address0;
            stubbedNullSettlementContract.settleNull
                .rejects(new Error());
            sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(true);
            sinon.stub(nullSettlement, 'getCurrentProposalStatus').resolves('Qualified');
            nullSettlement.settleNull(wallet, currency, 0).catch(e => {
                expect(e.message).to.match(/unable.*settle/i);
                done();
            });
        });
    
        it('can not settle null when proposal has not expired yet', (done) => {
            const currency = address0;
            stubbedNullSettlementContract.settleNull
                .withArgs(wallet.address, currency, 0, {})
                .resolves(fakeTx);
            sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(false);
            sinon.stub(nullSettlement, 'getCurrentProposalStatus').resolves('Qualified');
            nullSettlement.settleNull(currency, 0).catch(err => {
                expect(err.message).to.match(/not.*settle/i);
                expect(err.reasons.length).to.equal(1);
                expect(err.reasons[0].message).to.match(/expired/i);
                done();
            });
        });
    
        it('can not settle null when proposal is disqualified', (done) => {
            const currency = address0;
            stubbedNullSettlementContract.settleNull
                .withArgs(wallet.address, currency, 0, {})
                .resolves(fakeTx);
            sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(true);
            sinon.stub(nullSettlement, 'getCurrentProposalStatus').resolves('Disqualified');
            nullSettlement.settleNull(currency, 0).catch(err => {
                expect(err.message).to.match(/not.*settle/i);
                expect(err.reasons.length).to.equal(1);
                expect(err.reasons[0].message).to.match(/qualified/i);
                done();
            });
        });
    
        it('can not replay a null settlement', (done) => {
            const nonce = 1;
            const currency = address0;
            sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(true);
            sinon.stub(nullSettlement, 'getCurrentProposalStatus').resolves('Qualified');
            sinon.stub(nullSettlement, 'getCurrentProposalNonce').resolves(nonce);
            sinon.stub(nullSettlement, 'getMaxNullNonce').resolves(nonce);
            stubbedNullSettlementContract.settleNull
                .withArgs(wallet.address, currency, 0, {})
                .resolves(fakeTx);
            nullSettlement.settleNull(currency, 0).catch(err => {
                expect(err.message).to.match(/not.*settle/i);
                expect(err.reasons.length).to.equal(1);
                expect(err.reasons[0].message).to.match(/replayed/i);
                done();
            });
        });
    });

    describe('#getCurrentProposalStatus', () => {
        const challengeStatuses = ['Qualified', 'Disqualified'];
        challengeStatuses.forEach((t, i) => {
            it(`can correctly parse proposal status ${t}`, async () => {
                stubbedNullSettlementChallengeContract.proposalStatus
                    .withArgs(wallet.address, address0, address0id)
                    .resolves(i);
                const status = await nullSettlement.getCurrentProposalStatus(wallet.address, address0, address0id);
                expect(status).to.equal(t);
            });
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedNullSettlementChallengeContract.proposalStatus
                    .withArgs(wallet.address, address0, address0id)
                    .throws(error);
                const status = await nullSettlement.getCurrentProposalStatus(wallet.address, address0, address0id);
                expect(status).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedNullSettlementChallengeContract.proposalStatus
                .withArgs(wallet.address, address0, address0id)
                .throws(error);
            nullSettlement.getCurrentProposalStatus(wallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*get.*status/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#getCurrentProposalNonce', () => {
        it('can correctly return nonce', async () => {
            const nonce = 1;
            stubbedNullSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, address0, address0id)
                .resolves(nonce);
            const _nonce = await nullSettlement.getCurrentProposalNonce(wallet.address, address0, address0id);
            expect(_nonce).to.equal(nonce);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedNullSettlementChallengeContract.proposalNonce
                    .withArgs(wallet.address, address0, address0id)
                    .throws(error);
                const nonce = await nullSettlement.getCurrentProposalNonce(wallet.address, address0, address0id);
                expect(nonce).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedNullSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, address0, address0id)
                .throws(error);
            nullSettlement.getCurrentProposalNonce(wallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*get.*nonce/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#getCurrentProposalExpirationTime', () => {
        it('can correctly return expiration time', async () => {
            const expirationTime = ethers.utils.bigNumberify(3000000);
            stubbedNullSettlementChallengeContract.proposalExpirationTime
                .withArgs(wallet.address, address0, address0id)
                .resolves(expirationTime);
            const _expirationTime = await nullSettlement.getCurrentProposalExpirationTime(wallet.address, address0, address0id);
            expect(_expirationTime).to.equal(expirationTime);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedNullSettlementChallengeContract.proposalExpirationTime
                    .withArgs(wallet.address, address0, address0id)
                    .throws(error);
                const time = await nullSettlement.getCurrentProposalExpirationTime(wallet.address, address0, address0id);
                expect(time).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedNullSettlementChallengeContract.proposalExpirationTime
                .withArgs(wallet.address, address0, address0id)
                .throws(error);
            nullSettlement.getCurrentProposalExpirationTime(wallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*get.*time/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#hasCurrentProposalExpired', () => {
        it('can correctly return if expired', async () => {
            const hasExpired = true;
            stubbedNullSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, address0, address0id)
                .resolves(hasExpired);
            const _hasExpired = await nullSettlement.hasCurrentProposalExpired(wallet.address, address0, address0id);
            expect(_hasExpired).to.equal(hasExpired);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedNullSettlementChallengeContract.hasProposalExpired
                    .withArgs(wallet.address, address0, address0id)
                    .throws(error);
                const expired = await nullSettlement.hasCurrentProposalExpired(wallet.address, address0, address0id);
                expect(expired).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedNullSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, address0, address0id)
                .throws(error);
            nullSettlement.hasCurrentProposalExpired(wallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*check.*expired/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#getCurrentProposalStageAmount', () => {
        it('can correctly return proposal stage amount', async () => {
            const stageAmount = ethers.utils.bigNumberify(3000000);
            stubbedNullSettlementChallengeContract.proposalStageAmount
                .withArgs(wallet.address, address0, address0id)
                .resolves(stageAmount);
            const _stageAmount = await nullSettlement.getCurrentProposalStageAmount(wallet.address, address0, address0id);
            expect(_stageAmount).to.equal(stageAmount);
        });
        
        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedNullSettlementChallengeContract.proposalStageAmount
                    .withArgs(wallet.address, address0, address0id)
                    .throws(error);
                const amount = await nullSettlement.getCurrentProposalStageAmount(wallet.address, address0, address0id);
                expect(amount).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedNullSettlementChallengeContract.proposalStageAmount
                .withArgs(wallet.address, address0, address0id)
                .throws(error);
            nullSettlement.getCurrentProposalStageAmount(wallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*get.*stage/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#getMaxNullNonce', () => {
        it('can get max null nonce', async () => {
            const expectedNonce = 1;
            stubbedNullSettlementContract.walletCurrencyMaxNullNonce
                .withArgs(wallet.address, address0, address0id)
                .resolves(expectedNonce);
    
            const nonce = await nullSettlement.getMaxNullNonce(wallet.address, address0, address0id);
            expect(nonce).to.equal(expectedNonce);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedNullSettlementContract.walletCurrencyMaxNullNonce
                    .withArgs(wallet.address, address0, address0id)
                    .throws(error);
                const maxnonce = await nullSettlement.getMaxNullNonce(wallet.address, address0, address0id);
                expect(maxnonce).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedNullSettlementContract.walletCurrencyMaxNullNonce
                .withArgs(wallet.address, address0, address0id)
                .throws(error);
            nullSettlement.getMaxNullNonce(wallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*get.*nonce/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#checkStartChallenge', () => {
        const stageAmount = MonetaryAmount.from({amount: 1, currency: {ct: address0, id: address0id}});
        const {currency} = stageAmount.toJSON();

        it('should be valid to start new challenge', async () => {
            const expectedResult = {valid: true};
            const result = await nullSettlement.checkStartChallenge(stageAmount, wallet.address);
            expect(result).to.deep.equal(expectedResult);
        });

        it('should be invalid to start new challenge', async () => {
            const notExpiredError = new Error('Current challenge proposal has not expired!');
            const expectedResult = {
                valid: false, 
                reasons: [notExpiredError]
            };

            stubbedNullSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(false);

            const result = await nullSettlement.checkStartChallenge(stageAmount, wallet.address);
            expect(result.valid).to.equal(expectedResult.valid);
            expect(result.reasons.length).to.equal(expectedResult.reasons.length);
            for (let i = 0; i < result.reasons.length; i++) {
                const reason = result.reasons[i];
                expect(reason.message).to.equal(expectedResult.reasons[i].message);
            }
        });
        it('should rethrow exception', (done) => {
            stubbedNullSettlementChallengeContract.hasProposalExpired
                .throws(new Error());
            nullSettlement.checkStartChallenge(stageAmount, wallet.address).catch(e => {
                expect(e.message).to.match(/unable.*new.*challenge/i);
                done();
            });
        });
    });

    describe('#checkSettleNull', () => {
        const stageAmount = MonetaryAmount.from({amount: 1, currency: {ct: address0, id: address0id}});
        const {currency} = stageAmount.toJSON();

        it('should be valid to start new challenge', async () => {
            const expectedResult = {valid: true};
            stubbedNullSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(true);
            stubbedNullSettlementChallengeContract.proposalStatus
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(0);
            stubbedNullSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(ethers.utils.bigNumberify(2));
            stubbedNullSettlementContract.walletCurrencyMaxNullNonce
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(ethers.utils.bigNumberify(1));

            const result = await nullSettlement.checkSettleNull(wallet.address, currency.ct, currency.id);
            expect(result).to.deep.equal(expectedResult);
        });

        it('should be invalid to start new challenge', async () => {
            const notExpiredError = new Error('Current challenge proposal has not expired!');
            const statusError = new Error('Current challenge proposal is disqualified!');
            const replayError = new Error('The settlement can not be replayed!');

            const expectedResult = {valid: false, reasons: [notExpiredError, statusError, replayError]};

            stubbedNullSettlementChallengeContract.hasProposalExpired
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(null);
            stubbedNullSettlementChallengeContract.proposalStatus
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(1);
            stubbedNullSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(ethers.utils.bigNumberify(1));
            stubbedNullSettlementContract.walletCurrencyMaxNullNonce
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(ethers.utils.bigNumberify(2));

            const result = await nullSettlement.checkSettleNull(wallet.address, currency.ct, currency.id);
            expect(result.valid).to.equal(expectedResult.valid);
            expect(result.reasons.length).to.equal(expectedResult.reasons.length);
            for (let i = 0; i < result.reasons.length; i++) {
                const reason = result.reasons[i];
                expect(reason.message).to.equal(expectedResult.reasons[i].message);
            }
        });

        it('should rethrow exception', (done) => {
            stubbedNullSettlementChallengeContract.hasProposalExpired
                .throws(new Error());
            nullSettlement.checkSettleNull(wallet.address, currency.ct, currency.id).catch(e => {
                expect(e.message).to.match(/unable.*settle/i);
                done();
            });
        });
    });
});