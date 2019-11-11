'use strict';

const CONTRACT_NAME = 'DriipSettlementByPayment';
const CONTRACT_FILE = 'driip-settlement-contract';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedNahmiiContractConstructor = sinon.stub();

function createContract(walletOrProvider) {
    const DriipSettlementContract = proxyquire('./' + CONTRACT_FILE, {
        '../contract': stubbedNahmiiContractConstructor
    });
    stubbedNahmiiContractConstructor
        .withArgs(CONTRACT_NAME, walletOrProvider)
        .returns(stubbedNahmiiContractConstructor);
    return new DriipSettlementContract(walletOrProvider);
}
const stubbedDriipSettlementBaseContract = {
    settlementByWalletAndNonce: sinon.stub()
};
stubbedDriipSettlementBaseContract.reset = function() {
    this.settlementByWalletAndNonce.reset();
}.bind(stubbedDriipSettlementBaseContract);

describe(CONTRACT_NAME, () => {
    const fakeProvider = {
        network: {
            chainId: '123456789',
            name: 'some network'
        }
    };
    const fakeWallet = {
        provider: fakeProvider
    };
    let driipSettlementContract;

    beforeEach(() => {
        driipSettlementContract = createContract(fakeProvider);
        Object.assign(driipSettlementContract, stubbedDriipSettlementBaseContract);
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

    describe('#getSettlementByNonce()', () => {
        const nonce = 1;
        const address = '0x1';
        it('can get current settlement detailed object', async () => {
            const expectedSettlement = {
                origin: {wallet: '', done: true},
                target: {wallet: '', done: false}
            };
            stubbedDriipSettlementBaseContract.settlementByWalletAndNonce
                .withArgs(address, nonce)
                .resolves(expectedSettlement);

            const details = await driipSettlementContract.getSettlementByNonce(address, nonce);
            expect(details).to.equal(expectedSettlement);
        });

        [
            {code: 'CALL_EXCEPTION'},
            {code: -32000}
        ].forEach(error => {
            it(`should return null when ${error.code} exception thrown`, async () => {
                stubbedDriipSettlementBaseContract.settlementByWalletAndNonce
                    .withArgs(address, nonce)
                    .throws(error);
                const settlementObj = await driipSettlementContract.getSettlementByNonce(address, nonce);
                expect(settlementObj).to.equal(null);
            });
        });
        it('should rethrow unexpected exception', (done) => {
            const error = new Error('err');
            stubbedDriipSettlementBaseContract.settlementByWalletAndNonce
                .withArgs(address, nonce)
                .throws(error);
            driipSettlementContract.getSettlementByNonce(address, nonce).catch(e => {
                expect(e.message).to.match(/unable.*settlement/i);
                expect(e.innerError.message).to.match(/err/i);
                done();
            });
        });
    });
});
