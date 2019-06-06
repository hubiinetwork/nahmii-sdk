'use strict';

const CONTRACT_NAME = 'NullSettlementChallengeByPayment';
const CONTRACT_FILE = 'null-settlement-challenge-contract';

const ethers = require('ethers');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedNahmiiContractConstructor = sinon.stub();

function createContract(walletOrProvider) {
    const NullSettlementChallengeContract = proxyquire('./' + CONTRACT_FILE, {
        '../contract': stubbedNahmiiContractConstructor
    });
    stubbedNahmiiContractConstructor
        .withArgs(CONTRACT_NAME, walletOrProvider)
        .returns(stubbedNahmiiContractConstructor);
    return new NullSettlementChallengeContract(walletOrProvider);
}
const stubbedNullSettlementChallengeBaseContract = {
    proposalExpirationTime: sinon.stub(),
    hasProposalExpired: sinon.stub(),
    hasProposalTerminated: sinon.stub(),
    proposalStageAmount: sinon.stub(),
    proposalStatus: sinon.stub()
};
stubbedNullSettlementChallengeBaseContract.reset = function() {
    this.proposalExpirationTime.reset();
    this.hasProposalExpired.reset();
    this.hasProposalTerminated.reset();
    this.proposalStageAmount.reset();
    this.proposalStatus.reset();
}.bind(stubbedNullSettlementChallengeBaseContract);

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

    let nullSettlementChallengeContract;

    beforeEach(() => {
        nullSettlementChallengeContract = createContract(fakeProvider);
        Object.assign(nullSettlementChallengeContract, stubbedNullSettlementChallengeBaseContract);
    });
    afterEach(() => {
        stubbedNullSettlementChallengeBaseContract.reset();
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
                stubbedNullSettlementChallengeBaseContract.proposalStatus
                    .withArgs(fakeWallet.address, address0, address0id)
                    .resolves(i);
                const status = await nullSettlementChallengeContract.getCurrentProposalStatus(fakeWallet.address, address0, address0id);
                expect(status).to.equal(t);
            });
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null as settlement status when ${error.code} exception thrown`, async () => {
                stubbedNullSettlementChallengeBaseContract.proposalStatus
                    .withArgs(fakeWallet.address, address0, address0id)
                    .throws(error);
                const status = await nullSettlementChallengeContract.getCurrentProposalStatus(fakeWallet.address, address0, address0id);
                expect(status).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', () => {
            const error = new Error('err');
            stubbedNullSettlementChallengeBaseContract.proposalStatus
                .withArgs(fakeWallet.address, address0, address0id)
                .throws(error);
            return nullSettlementChallengeContract.getCurrentProposalStatus(fakeWallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*status/i);
                expect(e.innerError.message).to.match(/err/i);
            });
        });
    });

    describe('#getCurrentProposalExpirationTime()', () => {
        it('can return expiration time', async () => {
            const expectedTimeout = ethers.utils.bigNumberify(3000000);
            stubbedNullSettlementChallengeBaseContract.proposalExpirationTime
                .withArgs(fakeWallet.address, address0, address0id)
                .resolves(expectedTimeout);
            const timeout = await nullSettlementChallengeContract.getCurrentProposalExpirationTime(fakeWallet.address, address0, address0id);
            expect(timeout).to.equal(expectedTimeout);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedNullSettlementChallengeBaseContract.proposalExpirationTime
                    .withArgs(fakeWallet.address, address0, address0id)
                    .throws(error);
                const time = await nullSettlementChallengeContract.getCurrentProposalExpirationTime(fakeWallet.address, address0, address0id);
                expect(time).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedNullSettlementChallengeBaseContract.proposalExpirationTime
                .withArgs(fakeWallet.address, address0, address0id)
                .throws(error);
            nullSettlementChallengeContract.getCurrentProposalExpirationTime(fakeWallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*time/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#hasCurrentProposalExpired()', () => {
        it('can correctly return if expired', async () => {
            const hasExpired = true;
            stubbedNullSettlementChallengeBaseContract.hasProposalExpired
                .withArgs(fakeWallet.address, address0, address0id)
                .resolves(hasExpired);
            const _hasExpired = await nullSettlementChallengeContract.hasCurrentProposalExpired(fakeWallet.address, address0, address0id);
            expect(_hasExpired).to.equal(hasExpired);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedNullSettlementChallengeBaseContract.hasProposalExpired
                    .withArgs(fakeWallet.address, address0, address0id)
                    .throws(error);
                const expired = await nullSettlementChallengeContract.hasCurrentProposalExpired(fakeWallet.address, address0, address0id);
                expect(expired).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedNullSettlementChallengeBaseContract.hasProposalExpired
                .withArgs(fakeWallet.address, address0, address0id)
                .throws(error);
            nullSettlementChallengeContract.hasCurrentProposalExpired(fakeWallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*expired/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#hasCurrentProposalTerminated()', () => {
        it('can correctly return if expired', async () => {
            const hasExpired = true;
            stubbedNullSettlementChallengeBaseContract.hasProposalTerminated
                .withArgs(fakeWallet.address, address0, address0id)
                .resolves(hasExpired);
            const _hasExpired = await nullSettlementChallengeContract.hasCurrentProposalTerminated(fakeWallet.address, address0, address0id);
            expect(_hasExpired).to.equal(hasExpired);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedNullSettlementChallengeBaseContract.hasProposalTerminated
                    .withArgs(fakeWallet.address, address0, address0id)
                    .throws(error);
                const expired = await nullSettlementChallengeContract.hasCurrentProposalTerminated(fakeWallet.address, address0, address0id);
                expect(expired).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedNullSettlementChallengeBaseContract.hasProposalTerminated
                .withArgs(fakeWallet.address, address0, address0id)
                .throws(error);
            nullSettlementChallengeContract.hasCurrentProposalTerminated(fakeWallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*terminated/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });

    describe('#getCurrentProposalStageAmount()', () => {
        it('can correctly return proposal stage amount', async () => {
            const stageAmount = ethers.utils.bigNumberify(3000000);
            stubbedNullSettlementChallengeBaseContract.proposalStageAmount
                .withArgs(fakeWallet.address, address0, address0id)
                .resolves(stageAmount);
            const _stageAmount = await nullSettlementChallengeContract.getCurrentProposalStageAmount(fakeWallet.address, address0, address0id);
            expect(_stageAmount).to.equal(stageAmount);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedNullSettlementChallengeBaseContract.proposalStageAmount
                    .withArgs(fakeWallet.address, address0, address0id)
                    .throws(error);
                const stageAmount = await nullSettlementChallengeContract.getCurrentProposalStageAmount(fakeWallet.address, address0, address0id);
                expect(stageAmount).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedNullSettlementChallengeBaseContract.proposalStageAmount
                .withArgs(fakeWallet.address, address0, address0id)
                .throws(error);
            nullSettlementChallengeContract.getCurrentProposalStageAmount(fakeWallet.address, address0, address0id).catch(e => {
                expect(e.message).to.match(/unable.*amount/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });
});
