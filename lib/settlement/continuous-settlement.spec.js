'use strict';

const ethers = require('ethers');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedNullSettlementChallengeContract = {
    getCurrentProposalExpirationTime: sinon.stub(),
    hasCurrentProposalExpired: sinon.stub(),
    hasCurrentProposalTerminated: sinon.stub(),
    getCurrentProposalStageAmount: sinon.stub(),
    getCurrentProposalStatus: sinon.stub(),
    startChallenge: sinon.stub()
};
stubbedNullSettlementChallengeContract.reset = function () {
    this.getCurrentProposalExpirationTime.reset();
    this.hasCurrentProposalExpired.reset();
    this.hasCurrentProposalTerminated.reset();
    this.getCurrentProposalStageAmount.reset();
    this.getCurrentProposalStatus.reset();
    this.startChallenge.reset();
}.bind(stubbedNullSettlementChallengeContract);

const stubbedNullSettlementContract = {
    settleNull: sinon.stub()
};
stubbedNullSettlementContract.reset = function () {
    this.settleNull.reset();
}.bind(stubbedNullSettlementContract);

const ContinuousSettlement = proxyquire('./continuous-settlement', {
    './null-settlement-contract': function () {
        return stubbedNullSettlementContract;
    },
    './null-settlement-challenge-contract': function () {
        return stubbedNullSettlementChallengeContract;
    }
});

describe('ContinuousSettlement', () => {
    const fakeProvider = {};
    const fakeWallet1 = {
        address: '0x1'
    };
    const currency = {
        ct: '0x3',
        id: 0
    };
    const fakeContractStates = {
        stageAmount: 1
    };

    afterEach(() => {
        stubbedNullSettlementContract.reset();
        stubbedNullSettlementChallengeContract.reset();
    });

    context('initiate from constructor', () => {
        const expectedInstance = {
            address: fakeWallet1.address,
            currency: currency.ct,
            expirationTime: null,
            isCompleted: false,
            isOngoing: false,
            isStageable: false,
            isStarted: false,
            stageAmount: '1',
            status: undefined,
            type: 'continuous'
        };
        it('should return an instance with no states sync from contracts', () => {
            const continuousSettlement = new ContinuousSettlement(fakeWallet1.address, currency.ct, ethers.utils.bigNumberify(1), fakeProvider);
            expect(continuousSettlement.toJSON()).to.deep.equal(expectedInstance);
        });
    });

    context('#load()', () => {
        const expectedInstance = {
            address: fakeWallet1.address,
            currency: currency.ct,
            expirationTime: null,
            isCompleted: false,
            isOngoing: false,
            isStageable: false,
            isStarted: true,
            stageAmount: '1',
            status: undefined,
            type: 'continuous'
        };
        context('determine instance properties from contract states', () => {
            [{
                name: 'should return null when no on-chain states available',
                wallet: fakeWallet1,
                contract: {},
                expectedInstance: null
            },
            {
                name: 'should return ongoing settlement instance',
                wallet: fakeWallet1,
                contract: Object.assign({}, fakeContractStates, {expired: false}),
                expectedInstance: Object.assign({}, expectedInstance, {
                    isOngoing: true
                })
            },
            {
                name: 'should return stageable settlement instance',
                wallet: fakeWallet1,
                contract: Object.assign({}, fakeContractStates, {
                    expired: true,
                    expirationTime: 1,
                    status: 'Qualified'
                }),
                expectedInstance: Object.assign({}, expectedInstance, {
                    isStageable: true,
                    status: 'Qualified',
                    expirationTime: 1000
                })
            },
            {
                name: 'should return completed settlement instance',
                wallet: fakeWallet1,
                contract: Object.assign({}, fakeContractStates, {
                    expired: true,
                    status: 'Qualified',
                    terminated: true
                }),
                expectedInstance: Object.assign({}, expectedInstance, {
                    isCompleted: true,
                    status: 'Qualified'
                })
            },
            {
                name: 'should return disqualified settlement instance',
                wallet: fakeWallet1,
                contract: Object.assign({}, fakeContractStates, {
                    expired: true,
                    status: 'Disqualified'
                }),
                expectedInstance: Object.assign({}, expectedInstance, {
                    status: 'Disqualified'
                })
            }
            ].forEach(async ({
                name,
                wallet,
                contract,
                expectedInstance
            }) => {
                it(name, async () => {
                    mockContractStates(contract, wallet, currency);
                    const continuousSettlement = await ContinuousSettlement.load(wallet.address, currency.ct, fakeProvider);
                    if (continuousSettlement)
                        expect(continuousSettlement.toJSON()).to.deep.equal(expectedInstance);
                    else
                        expect(expectedInstance).to.equal(null);
                });
            });
        });
    });
    context('#create()', () => {
        const stageAmount = 1;
        const expectedInstance = {
            address: fakeWallet1.address,
            currency: currency.ct,
            expirationTime: null,
            isCompleted: false,
            isOngoing: false,
            isStageable: false,
            isStarted: false,
            stageAmount: stageAmount.toString(),
            status: undefined,
            type: 'continuous'
        };

        [{
            name: 'can create an instance when it is the first attempted settlement',
            wallet: fakeWallet1,
            stageAmount,
            contract: {},
            expectedInstance
        }, {
            name: 'can create an instance when the last settlement is completed',
            wallet: fakeWallet1,
            stageAmount,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                terminated: true
            }),
            expectedInstance
        }, {
            name: 'should throw error when last settlement has not completed yet',
            wallet: fakeWallet1,
            stageAmount,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified'
            }),
            expectedError: /not.*create.*completed/
        }].forEach(async ({
            name,
            wallet,
            stageAmount,
            contract,
            expectedInstance,
            expectedError
        }) => {
            it(name, async () => {
                mockContractStates(contract, wallet, currency);
                try {
                    const continuousSettlement = await ContinuousSettlement.create(wallet.address, currency.ct, stageAmount, fakeProvider);
                    if (continuousSettlement)
                        expect(continuousSettlement.toJSON()).to.deep.equal(expectedInstance);
                    else
                        expect(expectedInstance).to.equal(null);
                }
                catch (e) {
                    if (expectedError)
                        expect(e.message).to.match(expectedError);
                    else
                        throw e;
                }
            });
        });
    });

    context('#checkForCreate()', () => {

        [{
            name: 'can not create when the last settlement is not completed',
            wallet: fakeWallet1,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                terminated: false
            }),
            expectedResult: {
                canStart: false,
                receiptToUse: null,
                currentSettlement: {
                    address: fakeWallet1.address,
                    currency: currency.ct,
                    expirationTime: null,
                    isCompleted: false,
                    isOngoing: false,
                    isStageable: true,
                    isStarted: true,
                    stageAmount: '1',
                    status: 'Qualified',
                    type: 'continuous'
                }
            }
        }, {
            name: 'can create when the last settlement is completed',
            wallet: fakeWallet1,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                terminated: true
            }),
            expectedResult: {
                canStart: true
            }
        }, {
            name: 'can create when it is a first attempted settlement',
            wallet: fakeWallet1,
            contract: {},
            expectedResult: {
                canStart: true
            }
        }].forEach(async ({
            name,
            wallet,
            contract,
            expectedResult
        }) => {
            it(name, async () => {
                mockContractStates(contract, wallet, currency);
                const checks = await ContinuousSettlement.checkForCreate(wallet.address, currency.ct, fakeProvider);
                expect(checks.canStart).to.equal(expectedResult.canStart);
                if (expectedResult.currentSettlement)
                    expect(checks.currentSettlement.toJSON()).to.deep.equal(expectedResult.currentSettlement);
            });
        });
    });

    context('#start()', () => {
        const stageAmount = ethers.utils.bigNumberify(1);
        const newSettlementObject = {
            type: 'continuous',
            address: fakeWallet1.address,
            currency: currency.ct,
            stageAmount: stageAmount.toString(),
            status: undefined,
            isStarted: false,
            isOngoing: false,
            isStageable: false,
            isCompleted: false,
            expirationTime: null
        };
        const fakeTx = {hash: 'hash'};
        const options = {gasLimit: 1};
        let continuousSettlement;

        context('from #create()', () => {
            beforeEach(async () => {
                continuousSettlement = await ContinuousSettlement.create(fakeWallet1.address, currency.ct, stageAmount, fakeProvider);
            });
    
            it('should create a settlement object', () => {
                expect(continuousSettlement.toJSON()).to.deep.equal(newSettlementObject);
            });
    
            context('can start', () => {
                beforeEach(() => {
                    stubbedNullSettlementChallengeContract.startChallenge
                        .withArgs(stageAmount, currency.ct, currency.id, options)
                        .resolves(fakeTx);
                    mockContractStates({expired: false}, fakeWallet1, currency);
                });
                it('should re-sync', async () => {
                    const tx = await continuousSettlement.start(fakeWallet1, options);
                    expect(tx).to.equal(fakeTx);
                    expect(continuousSettlement.toJSON()).to.deep.equal(Object.assign({}, newSettlementObject, {isStarted: true, isOngoing: true}));
                });
            });
            context('throw exception when #startChallenge() throws', () => {
                const error = new Error('err');
                beforeEach(() => {
                    stubbedNullSettlementChallengeContract.startChallenge
                        .withArgs(stageAmount, currency.ct, currency.id)
                        .throws(error);
                    mockContractStates({expired: false}, fakeWallet1, currency);
                });
                it('should throw error and not re-sync', async () => {
                    try {
                        await continuousSettlement.start(fakeWallet1);
                    }
                    catch (e) {
                        expect(e.innerError.message).to.equal(error.message);
                        expect(continuousSettlement.toJSON()).to.deep.equal(newSettlementObject);
                    }
                });
            });
        });
        context('from #load()', () => {
            const contractStates = Object.assign({}, fakeContractStates, {
                status: 'Qualified'
            });
            beforeEach(async () => {
                mockContractStates(contractStates, fakeWallet1, currency);
                continuousSettlement = await ContinuousSettlement.load(fakeWallet1.address, currency.ct, fakeProvider);
            });
            it('should throw when #isStarted=true', (done) => {
                continuousSettlement.start(fakeWallet1, options).catch(error => {
                    expect(error.innerError.message).to.match(/.*not.*restart/);
                    done();
                });
            });
        });
    });
    context('#stage()', () => {
        const stageAmount = ethers.utils.bigNumberify(1);
        const newSettlementObject = {
            type: 'continuous',
            address: fakeWallet1.address,
            currency: currency.ct,
            stageAmount: stageAmount.toString(),
            status: 'Qualified',
            isStarted: true,
            isOngoing: false,
            isStageable: true,
            isCompleted: false,
            expirationTime: null
        };
        const fakeTx = {hash: 'hash'};
        const options = {gasLimit: 1};
        const contractStates = Object.assign({}, fakeContractStates, {
            expired: true,
            status: 'Qualified'
        });

        let continuousSettlement;

        beforeEach(async () => {
            mockContractStates(contractStates, fakeWallet1, currency);
            continuousSettlement = await ContinuousSettlement.load(fakeWallet1.address, currency.ct, fakeProvider);
        });

        it('should create a settlement object', () => {
            expect(continuousSettlement.toJSON()).to.deep.equal(newSettlementObject);
        });

        context('can stage', () => {
            beforeEach(() => {
                stubbedNullSettlementContract.settleNull
                    .withArgs(currency.ct, currency.id, 'ERC20', options)
                    .resolves(fakeTx);
                const updatedContractStates = Object.assign({}, contractStates, {
                    terminated: true
                });
                mockContractStates(updatedContractStates, fakeWallet1, currency);
            });
            it('should re-sync', async () => {
                const tx = await continuousSettlement.stage(fakeWallet1, options);
                expect(tx).to.equal(fakeTx);
                expect(continuousSettlement.toJSON()).to.deep.equal(Object.assign({}, newSettlementObject, {isStageable: false, isCompleted: true}));
            });
        });
        context('throw exception', () => {
            context('when #settleNull() throws', () => {
                const error = new Error('err');
                beforeEach(() => {
                    stubbedNullSettlementContract.settleNull
                        .withArgs(currency.ct, currency.id, 'ERC20', {})
                        .throws(error);
                    mockContractStates({expired: false}, fakeWallet1, currency);
                });
                it('should throw error and not re-sync', (done) => {
                    continuousSettlement.stage(fakeWallet1).catch(e => {
                        expect(e.innerError.message).to.equal(error.message);
                        expect(continuousSettlement.toJSON()).to.deep.equal(newSettlementObject);
                        done();
                    });
                });
            });
            context('when the condictions does not allow', () => {
                let continuousSettlement;
                beforeEach(async () => {
                    const updatedContractStates = Object.assign({}, contractStates, {
                        terminated: true
                    });
                    mockContractStates(updatedContractStates, fakeWallet1, currency);
                    continuousSettlement = await ContinuousSettlement.load(fakeWallet1.address, currency.ct, fakeProvider);
                });
                it('should throw when #isStageable=false', (done) => {
                    continuousSettlement.stage(fakeWallet1, options).catch(e => {
                        expect(e.innerError.message).to.match(/.*not.*stage/i);
                        expect(continuousSettlement.toJSON()).to.deep.equal(Object.assign({}, newSettlementObject, {isStageable: false, isCompleted: true}));
                        done();
                    });
                });
            });
        });
    });
});

function mockContractStates(contract, wallet, currency) {
    const stageAmount = contract.stageAmount ? ethers.utils.bigNumberify(contract.stageAmount) : null;
    const expirationTime = contract.expirationTime ? ethers.utils.bigNumberify(contract.expirationTime) : null;
    const status = contract.status;
    const expired = contract.expired;
    const terminated = contract.terminated;
    stubbedNullSettlementChallengeContract.getCurrentProposalStageAmount
        .withArgs(wallet.address, currency.ct, currency.id)
        .resolves(stageAmount);
    stubbedNullSettlementChallengeContract.getCurrentProposalExpirationTime
        .withArgs(wallet.address, currency.ct, currency.id)
        .resolves(expirationTime);
    stubbedNullSettlementChallengeContract.getCurrentProposalStatus
        .withArgs(wallet.address, currency.ct, currency.id)
        .resolves(status);
    stubbedNullSettlementChallengeContract.hasCurrentProposalExpired
        .withArgs(wallet.address, currency.ct, currency.id)
        .resolves(expired);
    stubbedNullSettlementChallengeContract.hasCurrentProposalTerminated
        .withArgs(wallet.address, currency.ct, currency.id)
        .resolves(terminated);
}