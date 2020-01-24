'use strict';

const CONTRACT_NAME = 'DriipSettlementChallengeByPayment';
const CONTRACT_FILE = 'driip-settlement-challenge-contract';

const ethers = require('ethers');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedNahmiiContractConstructor = sinon.stub();

function createContract(walletOrProvider) {
    const DriipSettlementChallengeContract = proxyquire('./' + CONTRACT_FILE, {
        '../contract': stubbedNahmiiContractConstructor
    });
    stubbedNahmiiContractConstructor
        .withArgs(CONTRACT_NAME, walletOrProvider)
        .returns(stubbedNahmiiContractConstructor);
    return new DriipSettlementChallengeContract(walletOrProvider);
}
const stubbedDriipSettlementChallengeBaseContract = {
    proposalNonce: sinon.stub(),
    proposalExpirationTime: sinon.stub(),
    hasProposalExpired: sinon.stub(),
    hasProposalTerminated: sinon.stub(),
    proposalStageAmount: sinon.stub(),
    proposalStatus: sinon.stub()
};
stubbedDriipSettlementChallengeBaseContract.reset = function() {
    this.proposalNonce.reset();
    this.proposalExpirationTime.reset();
    this.hasProposalExpired.reset();
    this.hasProposalTerminated.reset();
    this.proposalStageAmount.reset();
    this.proposalStatus.reset();
}.bind(stubbedDriipSettlementChallengeBaseContract);

describe(CONTRACT_NAME, () => {
    const fakeProvider = {
        network: {
            chainId: '123456789',
            name: 'some network'
        }
    };
    const fakeWallet = {
        provider: fakeProvider,
        address: '0x1'
    };
    const address0 = '0x2';
    const address0id = 0;

    let driipSettlementChallengeContract;

    beforeEach(() => {
        driipSettlementChallengeContract = createContract(fakeProvider);
        Object.assign(driipSettlementChallengeContract, stubbedDriipSettlementChallengeBaseContract);
    });
    afterEach(() => {
        stubbedDriipSettlementChallengeBaseContract.reset();
    });

    [
        ['wallet', fakeWallet],
        ['provider', fakeProvider]
    ].forEach(([description, walletOrProvider]) => {
        context('with ' + description, () => {
            it('is an instance of NahmiiContract', () => {
                expect(createContract(walletOrProvider)).to.be.instanceOf(stubbedNahmiiContractConstructor);
            });
        });
    });

    describe('#getCurrentProposalStatus()', () => {
        const challengeStatuses = ['Qualified', 'Disqualified'];
        challengeStatuses.forEach((t, i) => {
            it(`should parse proposal status ${t}`, async () => {
                stubbedDriipSettlementChallengeBaseContract.proposalStatus
                    .withArgs(fakeWallet.address, address0, address0id)
                    .resolves(i);
                const status = await driipSettlementChallengeContract.getCurrentProposalStatus(fakeWallet.address, address0, address0id);
                expect(status).to.equal(t);
            });
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null as settlement status when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementChallengeBaseContract.proposalStatus
                    .withArgs(fakeWallet.address, address0, address0id)
                    .throws(error);
                const status = await driipSettlementChallengeContract.getCurrentProposalStatus(fakeWallet.address, address0, address0id);
                expect(status).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', () => {
            const error = new Error('err');
            stubbedDriipSettlementChallengeBaseContract.proposalStatus
                .withArgs(fakeWallet.address, address0, address0id)
                .throws(error);
            return driipSettlementChallengeContract.getCurrentProposalStatus(fakeWallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*status/i);
                expect(e.innerError.message).to.match(/err/i);
            });
        });
    });

    describe('#getCurrentProposalNonce()', () => {
        it('should return nonce', async () => {
            const expectedNonce = ethers.utils.bigNumberify(1);
            stubbedDriipSettlementChallengeBaseContract.proposalNonce
                .withArgs(fakeWallet.address, address0, address0id)
                .resolves(expectedNonce);
            const nonce = await driipSettlementChallengeContract.getCurrentProposalNonce(fakeWallet.address, address0, address0id);
            expect(nonce).to.equal(expectedNonce);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementChallengeBaseContract.proposalNonce
                    .withArgs(fakeWallet.address, address0, address0id)
                    .throws(error);
                const nonce = await driipSettlementChallengeContract.getCurrentProposalNonce(fakeWallet.address, address0, address0id);
                expect(nonce).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedDriipSettlementChallengeBaseContract.proposalNonce
                .withArgs(fakeWallet.address, address0, address0id)
                .throws(error);
            driipSettlementChallengeContract.getCurrentProposalNonce(fakeWallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*nonce/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#getCurrentProposalExpirationTime()', () => {
        it('can return expiration time', async () => {
            const expectedTimeout = ethers.utils.bigNumberify(3000000);
            stubbedDriipSettlementChallengeBaseContract.proposalExpirationTime
                .withArgs(fakeWallet.address, address0, address0id)
                .resolves(expectedTimeout);
            const timeout = await driipSettlementChallengeContract.getCurrentProposalExpirationTime(fakeWallet.address, address0, address0id);
            expect(timeout).to.equal(expectedTimeout);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementChallengeBaseContract.proposalExpirationTime
                    .withArgs(fakeWallet.address, address0, address0id)
                    .throws(error);
                const time = await driipSettlementChallengeContract.getCurrentProposalExpirationTime(fakeWallet.address, address0, address0id);
                expect(time).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedDriipSettlementChallengeBaseContract.proposalExpirationTime
                .withArgs(fakeWallet.address, address0, address0id)
                .throws(error);
            driipSettlementChallengeContract.getCurrentProposalExpirationTime(fakeWallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*time/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#hasCurrentProposalExpired()', () => {
        it('can correctly return if expired', async () => {
            const hasExpired = true;
            stubbedDriipSettlementChallengeBaseContract.hasProposalExpired
                .withArgs(fakeWallet.address, address0, address0id)
                .resolves(hasExpired);
            const _hasExpired = await driipSettlementChallengeContract.hasCurrentProposalExpired(fakeWallet.address, address0, address0id);
            expect(_hasExpired).to.equal(hasExpired);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementChallengeBaseContract.hasProposalExpired
                    .withArgs(fakeWallet.address, address0, address0id)
                    .throws(error);
                const expired = await driipSettlementChallengeContract.hasCurrentProposalExpired(fakeWallet.address, address0, address0id);
                expect(expired).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedDriipSettlementChallengeBaseContract.hasProposalExpired
                .withArgs(fakeWallet.address, address0, address0id)
                .throws(error);
            driipSettlementChallengeContract.hasCurrentProposalExpired(fakeWallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*expired/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#hasCurrentProposalTerminated()', () => {
        it('can correctly return if terminated', async () => {
            const hasTerminated = true;
            stubbedDriipSettlementChallengeBaseContract.hasProposalTerminated
                .withArgs(fakeWallet.address, address0, address0id)
                .resolves(hasTerminated);
            const _hasTerminated = await driipSettlementChallengeContract.hasCurrentProposalTerminated(fakeWallet.address, address0, address0id);
            expect(_hasTerminated).to.equal(hasTerminated);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementChallengeBaseContract.hasProposalTerminated
                    .withArgs(fakeWallet.address, address0, address0id)
                    .throws(error);
                const terminated = await driipSettlementChallengeContract.hasCurrentProposalTerminated(fakeWallet.address, address0, address0id);
                expect(terminated).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedDriipSettlementChallengeBaseContract.hasProposalTerminated
                .withArgs(fakeWallet.address, address0, address0id)
                .throws(error);
            driipSettlementChallengeContract.hasCurrentProposalTerminated(fakeWallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*terminated/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#getCurrentProposalStageAmount()', () => {
        it('can correctly return proposal stage amount', async () => {
            const stageAmount = ethers.utils.bigNumberify(3000000);
            stubbedDriipSettlementChallengeBaseContract.proposalStageAmount
                .withArgs(fakeWallet.address, address0, address0id)
                .resolves(stageAmount);
            const _stageAmount = await driipSettlementChallengeContract.getCurrentProposalStageAmount(fakeWallet.address, address0, address0id);
            expect(_stageAmount).to.equal(stageAmount);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementChallengeBaseContract.proposalStageAmount
                    .withArgs(fakeWallet.address, address0, address0id)
                    .throws(error);
                const stageAmount = await driipSettlementChallengeContract.getCurrentProposalStageAmount(fakeWallet.address, address0, address0id);
                expect(stageAmount).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedDriipSettlementChallengeBaseContract.proposalStageAmount
                .withArgs(fakeWallet.address, address0, address0id)
                .throws(error);
            driipSettlementChallengeContract.getCurrentProposalStageAmount(fakeWallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*amount/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });
});
