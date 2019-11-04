'use strict';

const ethers = require('ethers');
const {EthereumAddress} = require('nahmii-ethereum-address');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const {EthereumAddressMatcher} = require('../../test-utils');
const Currency = require('../currency');
const MonetaryAmount = require('../monetary-amount');

const stubbedProvider = {
    getWalletReceipts: sinon.stub(),
    getTransactionCount: sinon.stub(),
    registerSettlement: sinon.stub(),
    getBlockNumber: sinon.stub(),
    chainId: 3
};
stubbedProvider.reset = function () {
    this.getWalletReceipts.reset();
    this.getTransactionCount.reset();
    this.registerSettlement.reset();
    this.getBlockNumber.reset();
}.bind(stubbedProvider);

const stubbedDriipSettlementChallengeContract = {
    getCurrentProposalNonce: sinon.stub(),
    getCurrentProposalExpirationTime: sinon.stub(),
    hasCurrentProposalExpired: sinon.stub(),
    hasCurrentProposalTerminated: sinon.stub(),
    getCurrentProposalStageAmount: sinon.stub(),
    getCurrentProposalStatus: sinon.stub(),
    interface: {
        functions: {
            startChallengeFromPayment: {
                encode: sinon.stub()
            }
        }
    },
    address: '0x1'
};
stubbedDriipSettlementChallengeContract.reset = function () {
    this.getCurrentProposalNonce.reset();
    this.getCurrentProposalExpirationTime.reset();
    this.hasCurrentProposalExpired.reset();
    this.hasCurrentProposalTerminated.reset();
    this.getCurrentProposalStageAmount.reset();
    this.getCurrentProposalStatus.reset();
    this.interface.functions.startChallengeFromPayment.encode.reset();
}.bind(stubbedDriipSettlementChallengeContract);

const stubbedDriipSettlementContract = {
    getSettlementByNonce: sinon.stub(),
    settlePayment: sinon.stub()
};
stubbedDriipSettlementContract.reset = function () {
    this.getSettlementByNonce.reset();
    this.settlePayment.reset();
}.bind(stubbedDriipSettlementContract);

const stubbedConfigurationContract = function() {};
stubbedConfigurationContract.prototype.earliestSettlementBlockNumber = sinon.stub();

const stubbedWallet = {
    address: '0x0000000000000000000000000000000000000001',
    sign: sinon.stub()
};
stubbedWallet.reset = function() {
    this.sign.reset();
}.bind(stubbedWallet);

const PaymentSettlement = proxyquire('./payment-settlement', {
    './driip-settlement-contract': function () {
        return stubbedDriipSettlementContract;
    },
    './driip-settlement-challenge-contract': function () {
        return stubbedDriipSettlementChallengeContract;
    },
    './settlement': proxyquire('./settlement', {
        './configuration-contract': stubbedConfigurationContract
    })
});

describe('PaymentSettlement', () => {
    const fakeWallet = {
        address: '0x0000000000000000000000000000000000000002'
    };
    const currency = {
        ct: '0x0000000000000000000000000000000000000003',
        id: '0'
    };
    const fakeContractStates = {
        nonce: 1,
        stageAmount: 1,
        expired: false
    };
    const fakeReceipt1 = {
        currency,
        sender: {
            wallet: stubbedWallet.address,
            nonce: 1,
            balances: {
                current: '1'
            }
        },
        recipient: {
            wallet: fakeWallet.address,
            nonce: 2,
            balances: {
                current: '2'
            }
        }
    };
    const fakeReceipt2 = {
        currency,
        sender: {
            wallet: stubbedWallet.address,
            nonce: 3,
            balances: {
                current: '3'
            }
        },
        recipient: {
            wallet: fakeWallet.address,
            nonce: 4,
            balances: {
                current: '4'
            }
        }
    };
    const fakeReceipts = [fakeReceipt1, fakeReceipt2];

    beforeEach(() => {
        stubbedProvider
            .getBlockNumber
            .resolves(100);
        stubbedConfigurationContract
            .prototype
            .earliestSettlementBlockNumber
            .resolves(ethers.utils.bigNumberify(1));
    });
    afterEach(() => {
        stubbedDriipSettlementContract.reset();
        stubbedDriipSettlementChallengeContract.reset();
        stubbedProvider.reset();
        stubbedWallet.reset();
    });

    context('initiate from constructor', () => {
        const expectedInstance = {
            address: stubbedWallet.address,
            currency,
            expirationTime: null,
            isCompleted: false,
            isTerminated: false,
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
            const paymentSettlement = new PaymentSettlement(
                EthereumAddress.from(stubbedWallet.address), fakeReceipt1, ethers.utils.bigNumberify(1), stubbedProvider
            );
            expect(paymentSettlement.toJSON()).to.deep.equal(expectedInstance);
        });
    });

    context('#load()', () => {
        const expectedInstance = {
            address: stubbedWallet.address,
            currency: fakeReceipt1.currency,
            expirationTime: null,
            isCompleted: false,
            isTerminated: false,
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
                wallet: stubbedWallet,
                contract: {},
                expectedInstance: null
            },
            {
                name: 'should return ongoing settlement instance',
                wallet: stubbedWallet,
                contract: fakeContractStates,
                receipts: fakeReceipts,
                expectedInstance: Object.assign({}, expectedInstance, {
                    isOngoing: true
                })
            },
            {
                name: 'should return terminated settlement instance',
                wallet: stubbedWallet,
                contract: Object.assign({}, fakeContractStates, {
                    terminated: true
                }),
                receipts: fakeReceipts,
                expectedInstance: Object.assign({}, expectedInstance, {
                    isTerminated: true
                })
            },
            {
                name: 'should return stageable settlement instance when settlementHistory is null',
                wallet: stubbedWallet,
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
                wallet: stubbedWallet,
                contract: Object.assign({}, fakeContractStates, {
                    expired: true,
                    status: 'Qualified',
                    settlementHistory: {
                        origin: {
                            wallet: fakeWallet.address,
                            doneBlockNumber: ethers.utils.bigNumberify('1')
                        },
                        target: {
                            wallet: stubbedWallet.address,
                            doneBlockNumber: ethers.utils.bigNumberify('0')
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
                wallet: stubbedWallet,
                contract: Object.assign({}, fakeContractStates, {
                    expired: true,
                    status: 'Qualified',
                    settlementHistory: {
                        origin: {
                            wallet: stubbedWallet.address,
                            doneBlockNumber: ethers.utils.bigNumberify('1')
                        },
                        target: {
                            wallet: '',
                            doneBlockNumber: ethers.utils.bigNumberify('0')
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
                wallet: stubbedWallet,
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
                wallet: fakeWallet,
                contract: Object.assign({}, fakeContractStates, {
                    nonce: fakeReceipt2.recipient.nonce
                }),
                receipts: fakeReceipts,
                expectedInstance: Object.assign({}, expectedInstance, {
                    address: fakeWallet.address,
                    currency: fakeReceipt2.currency,
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
                    const currencyObj = Currency.from(currency);
                    const paymentSettlement = await PaymentSettlement.load(EthereumAddress.from(wallet.address), currencyObj, stubbedProvider);
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
            address: stubbedWallet.address,
            currency: fakeReceipt2.currency,
            expirationTime: null,
            isCompleted: false,
            isTerminated: false,
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
            wallet: stubbedWallet,
            stageAmount,
            contract: {},
            receipts: fakeReceipts,
            expectedInstance
        }, {
            name: 'can create an instance when the last settlement is completed',
            wallet: stubbedWallet,
            stageAmount,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                settlementHistory: {
                    origin: {
                        wallet: stubbedWallet.address,
                        doneBlockNumber: ethers.utils.bigNumberify('1')
                    },
                    target: {
                        wallet: '',
                        doneBlockNumber: ethers.utils.bigNumberify('0')
                    }
                }
            }),
            receipts: fakeReceipts,
            expectedInstance
        }, {
            name: 'should throw error when last settlement has not completed yet',
            wallet: stubbedWallet,
            stageAmount,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified'
            }),
            receipts: fakeReceipts,
            expectedError: /not.*create.*completed/
        }, {
            name: 'should throw error when intended stage amount is greater than the receipt balance',
            wallet: stubbedWallet,
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
                    const monetaryAmount = MonetaryAmount.from({
                        currency,
                        amount: stageAmount
                    });
                    const paymentSettlement = await PaymentSettlement.create(EthereumAddress.from(wallet.address), monetaryAmount, stubbedProvider);
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
            wallet: stubbedWallet,
            contract: {},
            receipts: [],
            expectedResult: {
                canStart: false,
                receiptToUse: null
            }
        }, {
            name: 'can not create when the last settlement is not completed',
            wallet: stubbedWallet,
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
                    address: stubbedWallet.address,
                    currency: fakeReceipt2.currency,
                    expirationTime: null,
                    isCompleted: false,
                    isTerminated: false,
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
            wallet: stubbedWallet,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                settlementHistory: {
                    origin: {
                        wallet: stubbedWallet.address,
                        doneBlockNumber: ethers.utils.bigNumberify('1')
                    },
                    target: {
                        wallet: '',
                        doneBlockNumber: ethers.utils.bigNumberify('0')
                    }
                }
            }),
            receipts: [fakeReceipt1],
            expectedResult: {
                canStart: false,
                receiptToUse: null,
                currentSettlement: {
                    address: stubbedWallet.address,
                    currency: fakeReceipt2.currency,
                    expirationTime: null,
                    isCompleted: true,
                    isTerminated: false,
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
            wallet: stubbedWallet,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                settlementHistory: {
                    origin: {
                        wallet: stubbedWallet.address,
                        doneBlockNumber: ethers.utils.bigNumberify('1')
                    },
                    target: {
                        wallet: '',
                        doneBlockNumber: ethers.utils.bigNumberify('0')
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
            wallet: fakeWallet,
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
                const currencyObj = Currency.from(currency);
                const checks = await PaymentSettlement.checkForCreate(EthereumAddress.from(wallet.address), currencyObj, stubbedProvider);
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
            address: stubbedWallet.address,
            currency,
            stageAmount: stageAmount.toString(),
            receipt: fakeReceipt2,
            status: undefined,
            walletNonce: 3,
            isStarted: false,
            isOngoing: false,
            isStageable: false,
            isCompleted: false,
            isTerminated: false,
            expirationTime: null
        };
        const fakeTx = {hash: 'hash'};
        const signedTx = '0x1234';
        const fakeNonce = 1;
        const options = {gasLimit: 1};
        const data = '0x01';
        let paymentSettlement;

        context('from #create()', () => {
            beforeEach(async () => {
                stubbedProvider.getWalletReceipts
                    .withArgs(stubbedWallet.address)
                    .resolves(fakeReceipts);
                const monetaryAmount = MonetaryAmount.from({
                    currency,
                    amount: stageAmount
                });
                paymentSettlement = await PaymentSettlement.create(EthereumAddress.from(stubbedWallet.address), monetaryAmount, stubbedProvider);
            });
    
            it('should create a settlement object', () => {
                expect(paymentSettlement.toJSON()).to.deep.equal(newSettlementObject);
            });
    
            context('when starts successfully', () => {
                beforeEach(() => {
                    stubbedProvider.getTransactionCount
                        .withArgs(stubbedWallet.address)
                        .resolves(fakeNonce);
                    stubbedDriipSettlementChallengeContract
                        .interface.functions.startChallengeFromPayment.encode
                        .withArgs([
                            paymentSettlement.receipt,
                            paymentSettlement.stageAmount
                        ])
                        .returns(data);
                    stubbedWallet
                        .sign
                        .withArgs({
                            data,
                            to: stubbedDriipSettlementChallengeContract.address,
                            nonce: fakeNonce,
                            gasLimit: options.gasLimit,
                            gasPrice: options.gasPrice,
                            chainId: stubbedProvider.chainId
                        })
                        .resolves(signedTx);
                    stubbedProvider.registerSettlement
                        .withArgs(signedTx)
                        .resolves({data: {parsedRawTransaction: fakeTx}});
                    mockContractStates({expired: false}, stubbedWallet, currency);
                });
                it('returns tx', async () => {
                    const tx = await paymentSettlement.start(stubbedWallet, options);
                    expect(tx).to.deep.equal(fakeTx);
                });
            });
            context('throw exception when #startChallengeFromPayment() throws', () => {
                const error = new Error('err');
                beforeEach(() => {
                    stubbedProvider.getTransactionCount
                        .withArgs(stubbedWallet.address)
                        .rejects(error);
                    mockContractStates({expired: false}, stubbedWallet, currency);
                });
                it('should throw error', async () => {
                    try {
                        await paymentSettlement.start(stubbedWallet);
                    }
                    catch (e) {
                        expect(e.innerError.message).to.equal(error.message);
                    }
                });
            });
        });
        context('from #load()', () => {
            const contractStates = Object.assign({}, fakeContractStates, {
                status: 'Qualified'
            });
            beforeEach(async () => {
                mockContractStates(contractStates, stubbedWallet, currency);
                stubbedProvider.getWalletReceipts
                    .withArgs(stubbedWallet.address)
                    .resolves(fakeReceipts);
                const currencyObj = Currency.from(currency);
                paymentSettlement = await PaymentSettlement.load(EthereumAddress.from(stubbedWallet.address), currencyObj, stubbedProvider);
            });
            it('should throw when #isStarted=true', (done) => {
                paymentSettlement.start(stubbedWallet, options).catch(error => {
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
            address: stubbedWallet.address,
            currency,
            stageAmount: stageAmount.toString(),
            receipt: fakeReceipt1,
            status: 'Qualified',
            walletNonce: fakeContractStates.nonce,
            isStarted: true,
            isOngoing: false,
            isStageable: true,
            isCompleted: false,
            isTerminated: false,
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
            mockContractStates(contractStates, stubbedWallet, currency);
            stubbedProvider.getWalletReceipts
                .withArgs(stubbedWallet.address)
                .resolves(fakeReceipts);
            const currencyObj = Currency.from(currency);
            paymentSettlement = await PaymentSettlement.load(EthereumAddress.from(stubbedWallet.address), currencyObj, stubbedProvider);
        });

        it('should create a settlement object', () => {
            expect(paymentSettlement.toJSON()).to.deep.equal(newSettlementObject);
        });

        context('when stages successfully', () => {
            beforeEach(() => {
                stubbedDriipSettlementContract.settlePayment
                    .withArgs(fakeReceipt1, 'ERC20', {})
                    .resolves(fakeTx);
                const updatedContractStates = Object.assign({}, contractStates, {
                    settlementHistory: {
                        origin: {
                            wallet: stubbedWallet.address,
                            doneBlockNumber: ethers.utils.bigNumberify('1')
                        },
                        target: {
                            wallet: '',
                            doneBlockNumber: ethers.utils.bigNumberify('0')
                        }
                    }
                });
                mockContractStates(updatedContractStates, stubbedWallet, currency);
            });
            it('returns transaction', async () => {
                const tx = await paymentSettlement.stage(stubbedWallet);
                expect(tx).to.equal(fakeTx);
            });
        });
        context('throw exception', () => {
            context('when #settlePayment() throws', () => {
                const error = new Error('err');
                beforeEach(() => {
                    stubbedDriipSettlementContract.settlePayment
                        .withArgs(fakeReceipt1, 'ERC20', options)
                        .throws(error);
                    mockContractStates({expired: false}, stubbedWallet, currency);
                });
                it('should throw error', (done) => {
                    paymentSettlement.stage(stubbedWallet, options).catch(e => {
                        expect(e.innerError.message).to.equal(error.message);
                        done();
                    });
                });
            });
            context('when the condictions does not allow', () => {
                it('should throw when #isStageable=false', async () => {
                    const updatedContractStates = Object.assign({}, contractStates, {
                        settlementHistory: {
                            origin: {
                                wallet: stubbedWallet.address,
                                doneBlockNumber: ethers.utils.bigNumberify('1')
                            },
                            target: {
                                wallet: '',
                                doneBlockNumber: ethers.utils.bigNumberify('0')
                            }
                        }
                    });
                    mockContractStates(updatedContractStates, stubbedWallet, currency);
                    const currencyObj = Currency.from(currency);
                    paymentSettlement = await PaymentSettlement.load(EthereumAddress.from(stubbedWallet.address), currencyObj, stubbedProvider);
                    return paymentSettlement.stage(stubbedWallet, options).catch(e => {
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
    const termianted = contract.terminated;
    stubbedDriipSettlementChallengeContract.getCurrentProposalNonce
        .withArgs(EthereumAddressMatcher(wallet.address), EthereumAddressMatcher(currency.ct), parseInt(currency.id))
        .resolves(nonce);
    stubbedDriipSettlementChallengeContract.getCurrentProposalStageAmount
        .withArgs(EthereumAddressMatcher(wallet.address), EthereumAddressMatcher(currency.ct), parseInt(currency.id))
        .resolves(stageAmount);
    stubbedDriipSettlementChallengeContract.getCurrentProposalExpirationTime
        .withArgs(EthereumAddressMatcher(wallet.address), EthereumAddressMatcher(currency.ct), parseInt(currency.id))
        .resolves(expirationTime);
    stubbedDriipSettlementChallengeContract.getCurrentProposalStatus
        .withArgs(EthereumAddressMatcher(wallet.address), EthereumAddressMatcher(currency.ct), parseInt(currency.id))
        .resolves(status);
    stubbedDriipSettlementChallengeContract.hasCurrentProposalExpired
        .withArgs(EthereumAddressMatcher(wallet.address), EthereumAddressMatcher(currency.ct), parseInt(currency.id))
        .resolves(expired);
    stubbedDriipSettlementChallengeContract.hasCurrentProposalTerminated
        .withArgs(EthereumAddressMatcher(wallet.address), EthereumAddressMatcher(currency.ct), parseInt(currency.id))
        .resolves(termianted);
    if (nonce) {
        stubbedDriipSettlementContract.getSettlementByNonce
            .withArgs(EthereumAddressMatcher(wallet.address), nonce.toNumber())
            .resolves(settlementHistory);
    }
}
