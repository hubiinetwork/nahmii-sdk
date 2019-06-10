'use strict';

const ethers = require('ethers');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedProvider = {
    getWalletReceipts: sinon.stub()
};
stubbedProvider.reset = function () {
    this.getWalletReceipts.reset;
}.bind(stubbedProvider);

const stubbedDriipSettlementChallengeContract = {
    getCurrentProposalNonce: sinon.stub(),
    getCurrentProposalExpirationTime: sinon.stub(),
    hasCurrentProposalExpired: sinon.stub(),
    getCurrentProposalStageAmount: sinon.stub(),
    getCurrentProposalStatus: sinon.stub(),
    startChallengeFromPayment: sinon.stub()
};
stubbedDriipSettlementChallengeContract.reset = function () {
    this.getCurrentProposalNonce.reset();
    this.getCurrentProposalExpirationTime.reset();
    this.hasCurrentProposalExpired.reset();
    this.getCurrentProposalStageAmount.reset();
    this.getCurrentProposalStatus.reset();
    this.startChallengeFromPayment.reset();
}.bind(stubbedDriipSettlementChallengeContract);

const stubbedDriipSettlementContract = {
    getSettlementByNonce: sinon.stub(),
    settlePayment: sinon.stub()
};
stubbedDriipSettlementContract.reset = function () {
    this.getSettlementByNonce.reset();
    this.settlePayment.reset();
}.bind(stubbedDriipSettlementContract);

const PaymentSettlement = proxyquire('./payment-settlement', {
    './driip-settlement-contract': function () {
        return stubbedDriipSettlementContract;
    },
    './driip-settlement-challenge-contract': function () {
        return stubbedDriipSettlementChallengeContract;
    }
});

describe('PaymentSettlement', () => {
    const fakeWallet1 = {
        address: '0x1'
    };
    const fakeWallet2 = {
        address: '0x2'
    };
    const currency = {
        ct: '0x3',
        id: 0
    };
    const fakeContractStates = {
        nonce: 1,
        stageAmount: 1,
        expired: false
    };
    const fakeReceipt1 = {
        currency,
        sender: {
            wallet: fakeWallet1.address,
            nonce: 1,
            balances: {
                current: '1'
            }
        },
        recipient: {
            wallet: fakeWallet2.address,
            nonce: 2,
            balances: {
                current: '2'
            }
        }
    };
    const fakeReceipt2 = {
        currency,
        sender: {
            wallet: fakeWallet1.address,
            nonce: 3,
            balances: {
                current: '3'
            }
        },
        recipient: {
            wallet: fakeWallet2.address,
            nonce: 4,
            balances: {
                current: '4'
            }
        }
    };
    const fakeReceipts = [fakeReceipt1, fakeReceipt2];

    afterEach(() => {
        stubbedDriipSettlementContract.reset();
        stubbedDriipSettlementChallengeContract.reset();
        stubbedProvider.reset();
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
            walletNonce: 1,
            receipt: fakeReceipt1,
            type: 'payment'
        };
        it('should return an instance with no states sync from contracts', () => {
            const paymentSettlement = new PaymentSettlement(fakeWallet1.address, fakeReceipt1, ethers.utils.bigNumberify(1), stubbedProvider);
            expect(paymentSettlement.toJSON()).to.deep.equal(expectedInstance);
        });
    });

    context('#load()', () => {
        const expectedInstance = {
            address: fakeWallet1.address,
            currency: fakeReceipt1.currency.ct,
            expirationTime: null,
            isCompleted: false,
            isOngoing: false,
            isStageable: false,
            isStarted: true,
            receipt: fakeReceipt1,
            stageAmount: '1',
            status: undefined,
            type: 'payment',
            walletNonce: 1
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
                contract: fakeContractStates,
                receipts: fakeReceipts,
                expectedInstance: Object.assign({}, expectedInstance, {
                    isOngoing: true
                })
            },
            {
                name: 'should return stageable settlement instance when settlementHistory is null',
                wallet: fakeWallet1,
                contract: Object.assign({}, fakeContractStates, {
                    expired: true,
                    expirationTime: 1,
                    status: 'Qualified',
                    settlementHistory: null
                }),
                receipts: fakeReceipts,
                expectedInstance: Object.assign({}, expectedInstance, {
                    isStageable: true,
                    status: 'Qualified',
                    expirationTime: 1000
                })
            },
            {
                name: 'should return stageable settlement instance when settlementHistory indicate the wallet has not done',
                wallet: fakeWallet1,
                contract: Object.assign({}, fakeContractStates, {
                    expired: true,
                    status: 'Qualified',
                    settlementHistory: {
                        origin: {
                            wallet: fakeWallet2.address,
                            done: true
                        },
                        target: {
                            wallet: fakeWallet1.address,
                            done: false
                        }
                    }
                }),
                receipts: fakeReceipts,
                expectedInstance: Object.assign({}, expectedInstance, {
                    isStageable: true,
                    status: 'Qualified'
                })
            },
            {
                name: 'should return completed settlement instance',
                wallet: fakeWallet1,
                contract: Object.assign({}, fakeContractStates, {
                    expired: true,
                    status: 'Qualified',
                    settlementHistory: {
                        origin: {
                            wallet: fakeWallet1.address,
                            done: true
                        },
                        target: {
                            wallet: '',
                            done: false
                        }
                    }
                }),
                receipts: fakeReceipts,
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
                receipts: fakeReceipts,
                expectedInstance: Object.assign({}, expectedInstance, {
                    status: 'Disqualified'
                })
            },
            {
                name: 'should return ongoing settlement instance with the correct nonce derived from the matched receipt',
                wallet: fakeWallet2,
                contract: Object.assign({}, fakeContractStates, {
                    nonce: fakeReceipt2.recipient.nonce
                }),
                receipts: fakeReceipts,
                expectedInstance: Object.assign({}, expectedInstance, {
                    address: fakeWallet2.address,
                    currency: fakeReceipt2.currency.ct,
                    isOngoing: true,
                    walletNonce: fakeReceipt2.recipient.nonce,
                    receipt: fakeReceipt2
                })
            }
            ].forEach(async ({
                name,
                wallet,
                contract,
                receipts,
                expectedInstance
            }) => {
                it(name, async () => {
                    mockContractStates(contract, wallet, currency);
                    stubbedProvider.getWalletReceipts
                        .withArgs(wallet.address)
                        .resolves(receipts);
                    const paymentSettlement = await PaymentSettlement.load(wallet.address, currency.ct, stubbedProvider);
                    if (paymentSettlement)
                        expect(paymentSettlement.toJSON()).to.deep.equal(expectedInstance);
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
            currency: fakeReceipt2.currency.ct,
            expirationTime: null,
            isCompleted: false,
            isOngoing: false,
            isStageable: false,
            isStarted: false,
            receipt: fakeReceipt2,
            stageAmount: stageAmount.toString(),
            status: undefined,
            type: 'payment',
            walletNonce: 3
        };

        [{
            name: 'can create an instance when it is the first attempted settlement',
            wallet: fakeWallet1,
            stageAmount,
            contract: {},
            receipts: fakeReceipts,
            expectedInstance
        }, {
            name: 'can create an instance when the last settlement is completed',
            wallet: fakeWallet1,
            stageAmount,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                settlementHistory: {
                    origin: {
                        wallet: fakeWallet1.address,
                        done: true
                    },
                    target: {
                        wallet: '',
                        done: false
                    }
                }
            }),
            receipts: fakeReceipts,
            expectedInstance
        }, {
            name: 'should throw error when last settlement has not completed yet',
            wallet: fakeWallet1,
            stageAmount,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified'
            }),
            receipts: fakeReceipts,
            expectedError: /not.*create.*completed/
        }, {
            name: 'should throw error when intended stage amount is greater than the receipt balance',
            wallet: fakeWallet1,
            stageAmount: parseInt(fakeReceipt2.sender.balances.current) + 1,
            contract: {},
            receipts: fakeReceipts,
            expectedError: /amount.*greater.*balance/
        }].forEach(async ({
            name,
            wallet,
            stageAmount,
            contract,
            receipts,
            expectedInstance,
            expectedError
        }) => {
            it(name, async () => {
                mockContractStates(contract, wallet, currency);
                stubbedProvider.getWalletReceipts
                    .withArgs(wallet.address)
                    .resolves(receipts);
                try {
                    const paymentSettlement = await PaymentSettlement.create(wallet.address, currency.ct, stageAmount, stubbedProvider);
                    if (paymentSettlement)
                        expect(paymentSettlement.toJSON()).to.deep.equal(expectedInstance);
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
            name: 'can not create when there are no receipts',
            wallet: fakeWallet1,
            contract: {},
            receipts: [],
            expectedResult: {
                canStart: false,
                receiptToUse: null
            }
        }, {
            name: 'can not create when the last settlement is not completed',
            wallet: fakeWallet1,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                settlementHistory: null
            }),
            receipts: fakeReceipts,
            expectedResult: {
                canStart: false,
                receiptToUse: null,
                currentSettlement: {
                    address: fakeWallet1.address,
                    currency: fakeReceipt2.currency.ct,
                    expirationTime: null,
                    isCompleted: false,
                    isOngoing: false,
                    isStageable: true,
                    isStarted: true,
                    receipt: fakeReceipt1,
                    stageAmount: '1',
                    status: 'Qualified',
                    type: 'payment',
                    walletNonce: 1
                }
            }
        }, {
            name: 'can not create when there are no new receipts',
            wallet: fakeWallet1,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                settlementHistory: {
                    origin: {
                        wallet: fakeWallet1.address,
                        done: true
                    },
                    target: {
                        wallet: '',
                        done: false
                    }
                }
            }),
            receipts: [fakeReceipt1],
            expectedResult: {
                canStart: false,
                receiptToUse: null,
                currentSettlement: {
                    address: fakeWallet1.address,
                    currency: fakeReceipt2.currency.ct,
                    expirationTime: null,
                    isCompleted: true,
                    isOngoing: false,
                    isStageable: false,
                    isStarted: true,
                    receipt: fakeReceipt1,
                    stageAmount: '1',
                    status: 'Qualified',
                    type: 'payment',
                    walletNonce: 1
                }
            }
        }, {
            name: 'can create when last settlement is completed',
            wallet: fakeWallet1,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                settlementHistory: {
                    origin: {
                        wallet: fakeWallet1.address,
                        done: true
                    },
                    target: {
                        wallet: '',
                        done: false
                    }
                }
            }),
            receipts: fakeReceipts,
            expectedResult: {
                canStart: true,
                receiptToUse: fakeReceipt2,
                maxStageAmount: ethers.utils.bigNumberify(fakeReceipt2.sender.balances.current)
            }
        }, {
            name: 'can create when it is the first attempted settlement',
            wallet: fakeWallet2,
            contract: {},
            receipts: fakeReceipts,
            expectedResult: {
                canStart: true,
                receiptToUse: fakeReceipt2,
                maxStageAmount: ethers.utils.bigNumberify(fakeReceipt2.recipient.balances.current)
            }
        }].forEach(async ({ 
            name,
            wallet,
            contract,
            receipts,
            expectedResult
        }) => {
            it(name, async () => {
                mockContractStates(contract, wallet, currency);
                stubbedProvider.getWalletReceipts
                    .withArgs(wallet.address)
                    .resolves(receipts);
                const checks = await PaymentSettlement.checkForCreate(wallet.address, currency.ct, stubbedProvider);
                expect(checks.canStart).to.equal(expectedResult.canStart);
                expect(checks.receiptToUse).to.equal(expectedResult.receiptToUse);
                expect(checks.maxStageAmount).to.deep.equal(expectedResult.maxStageAmount);
                if (expectedResult.currentSettlement)
                    expect(checks.currentSettlement.toJSON()).to.deep.equal(expectedResult.currentSettlement);
            });
        });
    });

    context('#start()', () => {
        const stageAmount = ethers.utils.bigNumberify(1);
        const newSettlementObject = {
            type: 'payment',
            address: fakeWallet1.address,
            currency: currency.ct,
            stageAmount: stageAmount.toString(),
            receipt: fakeReceipt2,
            status: undefined,
            walletNonce: 3,
            isStarted: false,
            isOngoing: false,
            isStageable: false,
            isCompleted: false,
            expirationTime: null
        };
        const fakeTx = {hash: 'hash'};
        const options = {gasLimit: 1};
        let paymentSettlement;

        context('from #create()', () => {
            beforeEach(async () => {
                paymentSettlement = await PaymentSettlement.create(fakeWallet1.address, currency.ct, stageAmount, stubbedProvider);
            });
    
            it('should create a settlement object', () => {
                expect(paymentSettlement.toJSON()).to.deep.equal(newSettlementObject);
            });
    
            context('can start', () => {
                beforeEach(() => {
                    stubbedDriipSettlementChallengeContract.startChallengeFromPayment
                        .withArgs(fakeReceipt2, stageAmount, options)
                        .resolves(fakeTx);
                    mockContractStates({expired: false}, fakeWallet1, currency);
                });
                it('should re-sync', async () => {
                    const tx = await paymentSettlement.start(fakeWallet1, options);
                    expect(tx).to.equal(fakeTx);
                    expect(paymentSettlement.toJSON()).to.deep.equal(Object.assign({}, newSettlementObject, {isStarted: true, isOngoing: true}));
                });
            });
            context('throw exception when #startChallengeFromPayment() throws', () => {
                const error = new Error('err');
                beforeEach(() => {
                    stubbedDriipSettlementChallengeContract.startChallengeFromPayment
                        .withArgs(fakeReceipt2, stageAmount, {})
                        .throws(error);
                    mockContractStates({expired: false}, fakeWallet1, currency);
                });
                it('should throw error and not re-sync', async () => {
                    try {
                        await paymentSettlement.start(fakeWallet1);
                    }
                    catch (e) {
                        expect(e.innerError.message).to.equal(error.message);
                        expect(paymentSettlement.toJSON()).to.deep.equal(newSettlementObject);
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
                paymentSettlement = await PaymentSettlement.load(fakeWallet1.address, currency.ct, stubbedProvider);
            });
            it('should throw when #isStarted=true', (done) => {
                paymentSettlement.start(fakeWallet1, options).catch(error => {
                    expect(error.innerError.message).to.match(/.*not.*restart/);
                    done();
                });
            });
        });
    });
    context('#stage()', () => {
        const stageAmount = ethers.utils.bigNumberify(1);
        const newSettlementObject = {
            type: 'payment',
            address: fakeWallet1.address,
            currency: currency.ct,
            stageAmount: stageAmount.toString(),
            receipt: fakeReceipt1,
            status: 'Qualified',
            walletNonce: fakeContractStates.nonce,
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
            status: 'Qualified',
            settlementHistory: null
        });

        let paymentSettlement;

        beforeEach(async () => {
            mockContractStates(contractStates, fakeWallet1, currency);
            paymentSettlement = await PaymentSettlement.load(fakeWallet1.address, currency.ct, stubbedProvider);
        });

        it('should create a settlement object', () => {
            expect(paymentSettlement.toJSON()).to.deep.equal(newSettlementObject);
        });

        context('can stage', () => {
            beforeEach(() => {
                stubbedDriipSettlementContract.settlePayment
                    .withArgs(fakeReceipt1, 'ERC20', {})
                    .resolves(fakeTx);
                const updatedContractStates = Object.assign({}, contractStates, {
                    settlementHistory: {
                        origin: {
                            wallet: fakeWallet1.address,
                            done: true
                        },
                        target: {
                            wallet: '',
                            done: false
                        }
                    }
                });
                mockContractStates(updatedContractStates, fakeWallet1, currency);
            });
            it('should re-sync', async () => {
                const tx = await paymentSettlement.stage(fakeWallet1);
                expect(tx).to.equal(fakeTx);
                expect(paymentSettlement.toJSON()).to.deep.equal(Object.assign({}, newSettlementObject, {isStageable: false, isCompleted: true}));
            });
        });
        context('throw exception', () => {
            context('when #settlePayment() throws', () => {
                const error = new Error('err');
                beforeEach(() => {
                    stubbedDriipSettlementContract.settlePayment
                        .withArgs(fakeReceipt1, 'ERC20', options)
                        .throws(error);
                    mockContractStates({expired: false}, fakeWallet1, currency);
                });
                it('should throw error and not re-sync', (done) => {
                    paymentSettlement.stage(fakeWallet1, options).catch(e => {
                        expect(e.innerError.message).to.equal(error.message);
                        expect(paymentSettlement.toJSON()).to.deep.equal(newSettlementObject);
                        done();
                    });
                });
            });
            context('when the condictions does not allow', () => {
                it('should throw when #isStageable=false', async () => {
                    const updatedContractStates = Object.assign({}, contractStates, {
                        settlementHistory: {
                            origin: {
                                wallet: fakeWallet1.address,
                                done: true
                            },
                            target: {
                                wallet: '',
                                done: false
                            }
                        }
                    });
                    mockContractStates(updatedContractStates, fakeWallet1, currency);
                    paymentSettlement = await PaymentSettlement.load(fakeWallet1.address, currency.ct, stubbedProvider);
                    return paymentSettlement.stage(fakeWallet1, options).catch(e => {
                        expect(e.innerError.message).to.match(/.*not.*stage/i);
                        expect(paymentSettlement.toJSON()).to.deep.equal(Object.assign({}, newSettlementObject, {isStageable: false, isCompleted: true}));
                    });
                });
            });
        });
    });
});

function mockContractStates(contract, wallet, currency) {
    const nonce = contract.nonce ? ethers.utils.bigNumberify(contract.nonce) : null;
    const stageAmount = contract.stageAmount ? ethers.utils.bigNumberify(contract.stageAmount) : null;
    const expirationTime = contract.expirationTime ? ethers.utils.bigNumberify(contract.expirationTime) : null;
    const settlementHistory = contract.settlementHistory;
    const status = contract.status;
    const expired = contract.expired;
    stubbedDriipSettlementChallengeContract.getCurrentProposalNonce
        .withArgs(wallet.address, currency.ct, currency.id)
        .resolves(nonce);
    stubbedDriipSettlementChallengeContract.getCurrentProposalStageAmount
        .withArgs(wallet.address, currency.ct, currency.id)
        .resolves(stageAmount);
    stubbedDriipSettlementChallengeContract.getCurrentProposalExpirationTime
        .withArgs(wallet.address, currency.ct, currency.id)
        .resolves(expirationTime);
    stubbedDriipSettlementChallengeContract.getCurrentProposalStatus
        .withArgs(wallet.address, currency.ct, currency.id)
        .resolves(status);
    stubbedDriipSettlementChallengeContract.hasCurrentProposalExpired
        .withArgs(wallet.address, currency.ct, currency.id)
        .resolves(expired);
    if (nonce) {
        stubbedDriipSettlementContract.getSettlementByNonce
            .withArgs(wallet.address, nonce.toNumber())
            .resolves(settlementHistory);
    }
}