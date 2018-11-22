'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');
const Wallet = require('./wallet');
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

const stubbedNullSettlementChallengeContract = {
    startChallenge: sinon.stub(),
    proposalStatus: sinon.stub(),
    proposalNonce: sinon.stub(),
    proposalExpirationTime: sinon.stub(),
    hasCurrentProposalExpired: sinon.stub(),
    proposalStageAmount: sinon.stub(),
    isLockedWallet: sinon.stub()
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
        wallet = new Wallet(privateKey, stubbedProvider);
        const NullSettlement = proxyquireSettlementChallenge();
        nullSettlement = new NullSettlement(stubbedProvider);
    });

    afterEach(() => {
        stubbedNullSettlementChallengeContract.startChallenge.reset();
        stubbedNullSettlementChallengeContract.proposalStatus.reset();
        stubbedNullSettlementChallengeContract.proposalNonce.reset();
        stubbedNullSettlementChallengeContract.proposalExpirationTime.reset();
        stubbedNullSettlementChallengeContract.hasCurrentProposalExpired.reset();
        stubbedNullSettlementChallengeContract.proposalStageAmount.reset();
        stubbedNullSettlementChallengeContract.isLockedWallet.reset();
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

    it('can not start challenge if wallet is locked', (done) => {
        const currency = address0;
        const amount = '1.23';
        const stageAmount = new MonetaryAmount(ethers.utils.parseUnits(amount, 18), currency, 0);
        sinon.stub(nullSettlement, 'isWalletLocked').resolves(true);
        sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(true);
        nullSettlement.startChallenge(wallet, stageAmount).catch(err => {
            expect(err.message).to.match(/wallet.*locked/i);
            done();
        });
    });

    it('can not start challenge when proposal has not expired yet', (done) => {
        const currency = address0;
        const amount = '1.23';
        const stageAmount = new MonetaryAmount(ethers.utils.parseUnits(amount, 18), currency, 0);
        sinon.stub(nullSettlement, 'isWalletLocked').resolves(false);
        sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(false);
        nullSettlement.startChallenge(wallet, stageAmount).catch(err => {
            expect(err.message).to.match(/not.*expired/i);
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

    it('can settle null', async () => {
        const currency = address0;
        stubbedNullSettlementContract.settleNull
            .withArgs(currency, 0, {})
            .resolves(fakeTx);
        sinon.stub(nullSettlement, 'isWalletLocked').resolves(false);
        sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(true);
        sinon.stub(nullSettlement, 'getCurrentProposalStatus').resolves('Qualified');
        let tx = await nullSettlement.settleNull(wallet, currency, 0);
        expect(tx).to.equal(fakeTx);
    });

    it('can not settle null if wallet is locked', (done) => {
        const currency = address0;
        stubbedNullSettlementContract.settleNull
            .withArgs(wallet.address, currency, 0, {})
            .resolves(fakeTx);
        sinon.stub(nullSettlement, 'isWalletLocked').resolves(true);
        sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(false);
        sinon.stub(nullSettlement, 'getCurrentProposalStatus').resolves('Qualified');
        nullSettlement.settleNull(currency, 0).catch(err => {
            expect(err.message).to.match(/wallet.*locked/i);
            done();
        });
    });

    it('can not settle null when proposal has not expired yet', (done) => {
        const currency = address0;
        stubbedNullSettlementContract.settleNull
            .withArgs(wallet.address, currency, 0, {})
            .resolves(fakeTx);
        sinon.stub(nullSettlement, 'isWalletLocked').resolves(false);
        sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(false);
        sinon.stub(nullSettlement, 'getCurrentProposalStatus').resolves('Qualified');
        nullSettlement.settleNull(currency, 0).catch(err => {
            expect(err.message).to.match(/proposal.*expired/i);
            done();
        });
    });

    it('can not settle null when proposal is disqualified', (done) => {
        const currency = address0;
        stubbedNullSettlementContract.settleNull
            .withArgs(wallet.address, currency, 0, {})
            .resolves(fakeTx);
        sinon.stub(nullSettlement, 'isWalletLocked').resolves(false);
        sinon.stub(nullSettlement, 'hasCurrentProposalExpired').resolves(true);
        sinon.stub(nullSettlement, 'getCurrentProposalStatus').resolves('Disqualified');
        nullSettlement.settleNull(currency, 0).catch(err => {
            expect(err.message).to.match(/proposal.*disqualified/i);
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
            expect(err.message).to.match(/settlement.*replayed/i);
            done();
        });
    });

    describe('proposal status', () => {
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
        it('should return null as challenge status when exception thrown', async () => {
            stubbedNullSettlementChallengeContract.proposalStatus
                .withArgs(wallet.address, address0, address0id)
                .throws('reverted');
            const status = await nullSettlement.getCurrentProposalStatus(wallet.address, address0, address0id);
            expect(status).to.equal(null);
        });
    });

    describe('proposal nonce', () => {
        it('can correctly return nonce', async () => {
            const nonce = 1;
            stubbedNullSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, address0, address0id)
                .resolves(nonce);
            const _nonce = await nullSettlement.getCurrentProposalNonce(wallet.address, address0, address0id);
            expect(_nonce).to.equal(nonce);
        });
        it('should return null as challenge nonce when exception thrown', async () => {
            stubbedNullSettlementChallengeContract.proposalNonce
                .withArgs(wallet.address, address0, address0id)
                .throws('reverted');
            const _nonce = await nullSettlement.getCurrentProposalNonce(wallet.address, address0, address0id);
            expect(_nonce).to.equal(null);
        });
    });

    describe('proposal expiration time', () => {
        it('can correctly return expiration time', async () => {
            const expirationTime = ethers.utils.bigNumberify(3000000);
            stubbedNullSettlementChallengeContract.proposalExpirationTime
                .withArgs(wallet.address, address0, address0id)
                .resolves(expirationTime);
            const _expirationTime = await nullSettlement.getCurrentProposalExpirationTime(wallet.address, address0, address0id);
            expect(_expirationTime).to.equal(expirationTime);
        });
        it('should return null as challenge expiration time when exception thrown', async () => {
            stubbedNullSettlementChallengeContract.proposalExpirationTime
                .withArgs(wallet.address, address0, address0id)
                .throws('reverted');
            const _expirationTime = await nullSettlement.getCurrentProposalExpirationTime(wallet.address, address0, address0id);
            expect(_expirationTime).to.equal(null);
        });
    });

    describe('proposal expiration check', () => {
        it('can correctly return if expired', async () => {
            const hasExpired = true;
            stubbedNullSettlementChallengeContract.hasCurrentProposalExpired
                .withArgs(wallet.address, address0, address0id)
                .resolves(hasExpired);
            const _hasExpired = await nullSettlement.hasCurrentProposalExpired(wallet.address, address0, address0id);
            expect(_hasExpired).to.equal(hasExpired);
        });
        it('should return null when exception thrown', async () => {
            stubbedNullSettlementChallengeContract.hasCurrentProposalExpired
                .withArgs(wallet.address, address0, address0id)
                .throws('reverted');
            const _hasExpired = await nullSettlement.hasCurrentProposalExpired(wallet.address, address0, address0id);
            expect(_hasExpired).to.equal(null);
        });
    });

    describe('proposal stage amount', () => {
        it('can correctly return proposal stage amount', async () => {
            const stageAmount = ethers.utils.bigNumberify(3000000);
            stubbedNullSettlementChallengeContract.proposalStageAmount
                .withArgs(wallet.address, address0, address0id)
                .resolves(stageAmount);
            const _stageAmount = await nullSettlement.getCurrentProposalStageAmount(wallet.address, address0, address0id);
            expect(_stageAmount).to.equal(stageAmount);
        });
        it('should return null when exception thrown', async () => {
            stubbedNullSettlementChallengeContract.proposalStageAmount
                .withArgs(wallet.address, address0, address0id)
                .throws('reverted');
            const _stageAmount = await nullSettlement.getCurrentProposalStageAmount(wallet.address, address0, address0id);
            expect(_stageAmount).to.equal(null);
        });
    });

    it('can get max null nonce for wallet and currency', async () => {
        const expectedNonce = 1;
        stubbedNullSettlementContract.walletCurrencyMaxNullNonce
            .withArgs(wallet.address, address0, address0id)
            .resolves(expectedNonce);

        const nonce = await nullSettlement.getMaxNullNonce(wallet.address, address0, address0id);
        expect(nonce).to.equal(expectedNonce);
    });

    it('can not get current settlement detailed object', async () => {
        stubbedNullSettlementContract.walletCurrencyMaxNullNonce.rejects({});

        const nonce = await nullSettlement.getMaxNullNonce(wallet.address, address0, address0id);
        expect(nonce).to.equal(null);
    });
});
