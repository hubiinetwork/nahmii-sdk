'use strict';

const ethers = require('ethers');
const {EthereumAddress} = require('nahmii-ethereum-address');
const MonetaryAmount = require('../monetary-amount');
const Currency = require('../currency');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const {EthereumAddressMatcher} = require('../../test-utils');

const stubbedProvider = {
    getTransactionCount: sinon.stub(),
    registerSettlement: sinon.stub(),
    getBlockNumber: sinon.stub(),
    chainId: 3
};
stubbedProvider.reset = function() {
    this.getTransactionCount.reset();
    this.registerSettlement.reset();
    this.getBlockNumber.reset();
};
const stubbedNullSettlementChallengeContract = {
    getCurrentProposalExpirationTime: sinon.stub(),
    hasCurrentProposalExpired: sinon.stub(),
    hasCurrentProposalTerminated: sinon.stub(),
    getCurrentProposalStageAmount: sinon.stub(),
    getCurrentProposalStatus: sinon.stub(),
    interface: {
        functions: {
            startChallenge: {
                encode: sinon.stub()
            }
        }
    },
    address: '0x1'
};
stubbedNullSettlementChallengeContract.reset = function () {
    this.getCurrentProposalExpirationTime.reset();
    this.hasCurrentProposalExpired.reset();
    this.hasCurrentProposalTerminated.reset();
    this.getCurrentProposalStageAmount.reset();
    this.getCurrentProposalStatus.reset();
    this.interface.functions.startChallenge.encode.reset();
}.bind(stubbedNullSettlementChallengeContract);

const stubbedNullSettlementContract = {
    settleNull: sinon.stub()
};
stubbedNullSettlementContract.reset = function () {
    this.settleNull.reset();
}.bind(stubbedNullSettlementContract);

const stubbedConfigurationContract = function() {};
stubbedConfigurationContract.prototype.earliestSettlementBlockNumber = sinon.stub();

const stubbedWallet = {
    sign: sinon.stub(),
    address: '0x0000000000000000000000000000000000000001'
};
stubbedWallet.reset = function() {
    this.sign.reset();
}.bind(stubbedWallet);

const OnchainBalanceSettlement = proxyquire('./onchain-balance-settlement', {
    './null-settlement-contract': function () {
        return stubbedNullSettlementContract;
    },
    './null-settlement-challenge-contract': function () {
        return stubbedNullSettlementChallengeContract;
    },
    './settlement': proxyquire('./settlement', {
        './configuration-contract': stubbedConfigurationContract
    })
});

describe('OnchainBalanceSettlement', () => {
    const currency = {
        ct: '0x0000000000000000000000000000000000000003',
        id: '0'
    };
    const fakeContractStates = {
        stageAmount: 1
    };

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
        stubbedNullSettlementContract.reset();
        stubbedNullSettlementChallengeContract.reset();
        stubbedProvider.reset();
    });

    context('initiate from constructor', () => {
        const expectedInstance = {
            address: stubbedWallet.address,
            currency,
            expirationTime: null,
            isTerminated: false,
            isCompleted: false,
            isOngoing: false,
            isStageable: false,
            isStarted: false,
            stageAmount: '1',
            status: undefined,
            type: 'onchain-balance'
        };
        it('should return an instance with no states sync from contracts', () => {
            const walletAddress = EthereumAddress.from(stubbedWallet.address);
            const stageAmount = ethers.utils.bigNumberify(1);
            const monetaryAmount = MonetaryAmount.from({
                currency,
                amount: stageAmount
            });
            const onchainBalanceSettlement = new OnchainBalanceSettlement(walletAddress, monetaryAmount, stubbedProvider);
            expect(onchainBalanceSettlement.toJSON()).to.deep.equal(expectedInstance);
        });
    });

    context('#load()', () => {
        const expectedInstance = {
            address: stubbedWallet.address,
            currency,
            expirationTime: null,
            isTerminated: false,
            isCompleted: false,
            isOngoing: false,
            isStageable: false,
            isStarted: true,
            stageAmount: '1',
            status: undefined,
            type: 'onchain-balance'
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
                contract: Object.assign({}, fakeContractStates, {expired: false}),
                expectedInstance: Object.assign({}, expectedInstance, {
                    isOngoing: true
                })
            },
            {
                name: 'should return stageable settlement instance',
                wallet: stubbedWallet,
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
                wallet: stubbedWallet,
                contract: Object.assign({}, fakeContractStates, {
                    expired: true,
                    status: 'Qualified',
                    terminated: true
                }),
                expectedInstance: Object.assign({}, expectedInstance, {
                    isCompleted: true,
                    isTerminated: true,
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
                    const currencyObj = Currency.from(currency);
                    const onchainBalanceSettlement = await OnchainBalanceSettlement.load(
                        EthereumAddress.from(wallet.address), 
                        currencyObj, 
                        stubbedProvider
                    );
                    if (onchainBalanceSettlement)
                        expect(onchainBalanceSettlement.toJSON()).to.deep.equal(expectedInstance);
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
            currency,
            expirationTime: null,
            isTerminated: false,
            isCompleted: false,
            isOngoing: false,
            isStageable: false,
            isStarted: false,
            stageAmount: stageAmount.toString(),
            status: undefined,
            type: 'onchain-balance'
        };

        [{
            name: 'can create an instance when it is the first attempted settlement',
            wallet: stubbedWallet,
            stageAmount,
            contract: {},
            expectedInstance
        }, {
            name: 'can create an instance when the last settlement is completed',
            wallet: stubbedWallet,
            stageAmount,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                terminated: true
            }),
            expectedInstance
        }, {
            name: 'should throw error when last settlement has not completed yet',
            wallet: stubbedWallet,
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
                    const monetaryAmount = MonetaryAmount.from({
                        currency,
                        amount: stageAmount
                    });
                    const onchainBalanceSettlement = await OnchainBalanceSettlement.create(
                        EthereumAddress.from(wallet.address), 
                        monetaryAmount, 
                        stubbedProvider
                    );
                    if (onchainBalanceSettlement)
                        expect(onchainBalanceSettlement.toJSON()).to.deep.equal(expectedInstance);
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
            wallet: stubbedWallet,
            contract: Object.assign({}, fakeContractStates, {
                expired: true,
                status: 'Qualified',
                terminated: false
            }),
            expectedResult: {
                canStart: false,
                receiptToUse: null,
                currentSettlement: {
                    address: stubbedWallet.address,
                    currency,
                    expirationTime: null,
                    isTerminated: false,
                    isCompleted: false,
                    isOngoing: false,
                    isStageable: true,
                    isStarted: true,
                    stageAmount: '1',
                    status: 'Qualified',
                    type: 'onchain-balance'
                }
            }
        }, {
            name: 'can create when the last settlement is completed',
            wallet: stubbedWallet,
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
            wallet: stubbedWallet,
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
                const currencyObj = Currency.from(currency);
                const checks = await OnchainBalanceSettlement.checkForCreate(
                    EthereumAddress.from(wallet.address), 
                    currencyObj, 
                    stubbedProvider
                );
                expect(checks.canStart).to.equal(expectedResult.canStart);
                if (expectedResult.currentSettlement)
                    expect(checks.currentSettlement.toJSON()).to.deep.equal(expectedResult.currentSettlement);
            });
        });
    });

    context('#start()', () => {
        const stageAmount = ethers.utils.bigNumberify(1);
        const newSettlementObject = {
            type: 'onchain-balance',
            address: stubbedWallet.address,
            currency,
            stageAmount: stageAmount.toString(),
            status: undefined,
            isStarted: false,
            isOngoing: false,
            isStageable: false,
            isTerminated: false,
            isCompleted: false,
            expirationTime: null
        };
        const fakeNonce = 1;
        const fakeTx = {hash: 'hash'};
        const signedTx = '0x1234';
        const options = {gasLimit: 1};
        let onchainBalanceSettlement;

        context('from #create()', () => {
            beforeEach(async () => {
                const moneytarAmount = MonetaryAmount.from({
                    currency,
                    amount: stageAmount
                });
                onchainBalanceSettlement = await OnchainBalanceSettlement.create(
                    EthereumAddress.from(stubbedWallet.address), 
                    moneytarAmount, 
                    stubbedProvider
                );
            });
    
            it('should create a settlement object', () => {
                expect(onchainBalanceSettlement.toJSON()).to.deep.equal(newSettlementObject);
            });
    
            context('when starts successfully', () => {
                const data = '0x01';
                beforeEach(() => {
                    stubbedProvider.getTransactionCount
                        .withArgs(stubbedWallet.address)
                        .resolves(fakeNonce);
                    stubbedNullSettlementChallengeContract
                        .interface.functions.startChallenge.encode
                        .withArgs([
                            onchainBalanceSettlement.stageAmount,
                            onchainBalanceSettlement.currency.ct.toString(),
                            onchainBalanceSettlement.currency.id
                        ])
                        .returns(data);
                    stubbedWallet
                        .sign
                        .withArgs({
                            data,
                            to: stubbedNullSettlementChallengeContract.address,
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
                    const tx = await onchainBalanceSettlement.start(stubbedWallet, options);
                    expect(tx).to.deep.equal(fakeTx);
                });
            });
            context('when throws exception', () => {
                const error = new Error('err');
                beforeEach(() => {
                    stubbedProvider.getTransactionCount
                        .withArgs(stubbedWallet.address)
                        .throws(error);
                    mockContractStates({expired: false}, stubbedWallet, currency);
                });
                it('should throw error', async () => {
                    try {
                        await onchainBalanceSettlement.start(stubbedWallet);
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
                const currencyObj = Currency.from(currency);
                onchainBalanceSettlement = await OnchainBalanceSettlement.load(
                    EthereumAddress.from(stubbedWallet.address), 
                    currencyObj, 
                    stubbedProvider
                );
            });
            it('should throw when #isStarted=true', (done) => {
                onchainBalanceSettlement.start(stubbedWallet, options).catch(error => {
                    expect(error.innerError.message).to.match(/.*not.*restart/);
                    done();
                });
            });
        });
    });
    context('#stage()', () => {
        const stageAmount = ethers.utils.bigNumberify(1);
        const newSettlementObject = {
            type: 'onchain-balance',
            address: stubbedWallet.address,
            currency,
            stageAmount: stageAmount.toString(),
            status: 'Qualified',
            isStarted: true,
            isOngoing: false,
            isStageable: true,
            isTerminated: false,
            isCompleted: false,
            expirationTime: null
        };
        const fakeTx = {hash: 'hash'};
        const options = {gasLimit: 1};
        const contractStates = Object.assign({}, fakeContractStates, {
            expired: true,
            status: 'Qualified'
        });

        let onchainBalanceSettlement;

        beforeEach(async () => {
            mockContractStates(contractStates, stubbedWallet, currency);
            const currencyObj = Currency.from(currency);
            onchainBalanceSettlement = await OnchainBalanceSettlement.load(
                EthereumAddress.from(stubbedWallet.address), 
                currencyObj, 
                stubbedProvider
            );
        });

        it('should create a settlement object', () => {
            expect(onchainBalanceSettlement.toJSON()).to.deep.equal(newSettlementObject);
        });

        context('when stages successfully', () => {
            beforeEach(() => {
                stubbedNullSettlementContract.settleNull
                    .withArgs(currency.ct, parseInt(currency.id), 'ERC20', options)
                    .resolves(fakeTx);
                const updatedContractStates = Object.assign({}, contractStates, {
                    terminated: true
                });
                mockContractStates(updatedContractStates, stubbedWallet, currency);
            });
            it('returns transaction', async () => {
                const tx = await onchainBalanceSettlement.stage(stubbedWallet, options);
                expect(tx).to.equal(fakeTx);
            });
        });
        context('throw exception', () => {
            context('when #settleNull() throws', () => {
                const error = new Error('err');
                beforeEach(() => {
                    stubbedNullSettlementContract.settleNull
                        .withArgs(currency.ct, parseInt(currency.id), 'ERC20', {})
                        .throws(error);
                    mockContractStates({expired: false}, stubbedWallet, currency);
                });
                it('should throw error', (done) => {
                    onchainBalanceSettlement.stage(stubbedWallet).catch(e => {
                        expect(e.innerError.message).to.equal(error.message);
                        done();
                    });
                });
            });
            context('when the condictions does not allow', () => {
                let onchainBalanceSettlement;
                beforeEach(async () => {
                    const updatedContractStates = Object.assign({}, contractStates, {
                        terminated: true
                    });
                    mockContractStates(updatedContractStates, stubbedWallet, currency);
                    const currencyObj = Currency.from(currency);
                    onchainBalanceSettlement = await OnchainBalanceSettlement.load(
                        EthereumAddress.from(stubbedWallet.address), 
                        currencyObj, 
                        stubbedProvider
                    );
                });
                it('should throw when #isStageable=false', (done) => {
                    onchainBalanceSettlement.stage(stubbedWallet, options).catch(e => {
                        expect(e.innerError.message).to.match(/.*not.*stage/i);
                        expect(onchainBalanceSettlement.toJSON()).to.deep.equal(Object.assign({}, newSettlementObject, {
                            isStageable: false, isCompleted: true, isTerminated: true
                        }));
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
        .withArgs(EthereumAddressMatcher(wallet.address), EthereumAddressMatcher(currency.ct), parseInt(currency.id))
        .resolves(stageAmount);
    stubbedNullSettlementChallengeContract.getCurrentProposalExpirationTime
        .withArgs(EthereumAddressMatcher(wallet.address), EthereumAddressMatcher(currency.ct), parseInt(currency.id))
        .resolves(expirationTime);
    stubbedNullSettlementChallengeContract.getCurrentProposalStatus
        .withArgs(EthereumAddressMatcher(wallet.address), EthereumAddressMatcher(currency.ct), parseInt(currency.id))
        .resolves(status);
    stubbedNullSettlementChallengeContract.hasCurrentProposalExpired
        .withArgs(EthereumAddressMatcher(wallet.address), EthereumAddressMatcher(currency.ct), parseInt(currency.id))
        .resolves(expired);
    stubbedNullSettlementChallengeContract.hasCurrentProposalTerminated
        .withArgs(EthereumAddressMatcher(wallet.address), EthereumAddressMatcher(currency.ct), parseInt(currency.id))
        .resolves(terminated);
}