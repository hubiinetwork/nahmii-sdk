'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const ethers = require('../ethers');
const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const {EthereumAddressMatcher, CurrencyMatcher, MonetaryAmountMatcher} = require('../../test-utils');
const {EthereumAddress} = require('nahmii-ethereum-address');
const MonetaryAmount = require('../monetary-amount');
const Currency = require('../currency');

const stubbedProvider = {
    getTokenInfo: sinon.stub(),
    getNahmiiBalances: sinon.stub()
};
stubbedProvider.reset = function() {
    this.getTokenInfo.reset();
    this.getNahmiiBalances.reset();
}.bind(stubbedProvider);

const stubbedPaymentSettlement = {
    checkForCreate: sinon.stub(),
    load: sinon.stub(),
    create: sinon.stub()
};
stubbedPaymentSettlement.reset = function() {
    this.checkForCreate.reset();
    this.load.reset();
    this.create.reset();
}.bind(stubbedPaymentSettlement);

const stubbedOnchainBalanceSettlement = {
    checkForCreate: sinon.stub(),
    load: sinon.stub(),
    create: sinon.stub()
};
stubbedOnchainBalanceSettlement.reset = function() {
    this.checkForCreate.reset();
    this.load.reset();
    this.create.reset();
}.bind(stubbedOnchainBalanceSettlement);

function proxyquireSettlement() {
    return proxyquire('./settlement-factory', {
        './payment-settlement': stubbedPaymentSettlement,
        './onchain-balance-settlement': stubbedOnchainBalanceSettlement
    });
}

describe('SettlementFactory', () => {
    const fakeWallet = {address: '0x0000000000000000000000000000000000000002'};
    const currency = {ct: '0x0000000000000000000000000000000000000001', id: 0, decimals: 18};
    const SettlementFactory = proxyquireSettlement();
    let settlementFactory;

    beforeEach(() => {
        settlementFactory = new SettlementFactory(stubbedProvider);
    });

    afterEach(() => {
        stubbedProvider.reset();
        stubbedPaymentSettlement.reset();
        stubbedOnchainBalanceSettlement.reset();
    });

    describe('#calculateRequiredSettlements()', () => {
        context('when intended stage amount is less than or equal to the available balance', () => {
            beforeEach(() => {
                stubbedProvider.getTokenInfo
                    .withArgs(currency.ct, true)
                    .resolves({currency: currency.ct, decimals: currency.decimals});
                stubbedProvider.getNahmiiBalances
                    .withArgs(fakeWallet.address)
                    .resolves([{
                        currency,
                        amountAvailable: '10'
                    }]);
            });
            [
                {
                    name: 'should only create a payment settlement when stage amount is less than the max stage amount of payment settlement',
                    stageAmount: 1,
                    checks: {
                        balance: {canStart: true},
                        payment: {canStart: true, maxStageAmount: ethers.utils.bigNumberify(1)}
                    },
                    expects: {
                        stageAmounts: {
                            payment: 1
                        },
                        settlements: [{type: 'payment'}]
                    }
                },
                {
                    name: 'should create both payment and on-chain balance settlements when intended stage amount is greater than the max stage amount of payment settlement',
                    stageAmount: 2,
                    checks: {
                        balance: {canStart: true},
                        payment: {canStart: true, maxStageAmount: ethers.utils.bigNumberify(1)}
                    },
                    expects: {
                        stageAmounts: {
                            payment: 1,
                            balance: 1
                        },
                        settlements: [{type: 'payment'}, {type: 'onchain-balance'}]
                    }
                },
                {
                    name: 'should only create a on-chain balance settlement',
                    stageAmount: 2,
                    checks: {
                        balance: {canStart: true},
                        payment: {canStart: false, maxStageAmount: ethers.utils.bigNumberify(1)}
                    },
                    expects: {
                        stageAmounts: {
                            balance: 2
                        },
                        settlements: [{type: 'onchain-balance'}]
                    }
                },
                {
                    name: 'should throw error when on-chain balance settlement is not allowed',
                    stageAmount: 1,
                    checks: {
                        balance: {canStart: false},
                        payment: {canStart: true, maxStageAmount: ethers.utils.bigNumberify(1)}
                    },
                    expects: {
                        throws: /unable.*intended.*amount/i
                    }
                },
                {
                    name: 'should throw error when available amount is less than the stage amount',
                    stageAmount: 11,
                    checks: {
                        balance: {canStart: true},
                        payment: {canStart: true, maxStageAmount: ethers.utils.bigNumberify(1)}
                    },
                    expects: {
                        throws: /.*maximum.*allowable.*/i
                    }
                }
            ].forEach(({name, stageAmount, checks, expects}) => {
                it(name, async () => {
                    const currencyObj = Currency.from(currency);
                    stubbedOnchainBalanceSettlement.checkForCreate
                        .withArgs(EthereumAddressMatcher(fakeWallet.address), CurrencyMatcher(currencyObj), stubbedProvider)
                        .resolves(checks.balance);
                    stubbedPaymentSettlement.checkForCreate
                        .withArgs(EthereumAddressMatcher(fakeWallet.address), CurrencyMatcher(currencyObj), stubbedProvider)
                        .resolves(checks.payment);
                    
                    if (expects.stageAmounts && expects.stageAmounts.balance) {
                        const monetaryAmount = MonetaryAmount.from({
                            currency,
                            amount: ethers.utils.bigNumberify(expects.stageAmounts.balance)
                        });
                        stubbedOnchainBalanceSettlement.create
                            .withArgs(EthereumAddressMatcher(fakeWallet.address), MonetaryAmountMatcher(monetaryAmount), stubbedProvider)
                            .resolves({type: 'onchain-balance'});
                    }
                    if (expects.stageAmounts && expects.stageAmounts.payment) {
                        const monetaryAmount = MonetaryAmount.from({
                            currency,
                            amount: ethers.utils.bigNumberify(expects.stageAmounts.payment)
                        });
                        stubbedPaymentSettlement.create
                            .withArgs(EthereumAddressMatcher(fakeWallet.address), MonetaryAmountMatcher(monetaryAmount), stubbedProvider)
                            .resolves({type: 'payment'});
                    }
                    const stageMonetaryAmount = MonetaryAmount.from(stageAmount, currency.ct);
                    if (expects.throws) {
                        try {
                            await settlementFactory.calculateRequiredSettlements(fakeWallet.address, stageMonetaryAmount);
                        }
                        catch (error) {
                            expect(error.innerError.message).to.match(expects.throws);
                            return;
                        }
                        throw new Error('should throw error');
                    }
                    else {
                        const settlements = await settlementFactory.calculateRequiredSettlements(fakeWallet.address, stageMonetaryAmount);
                        expect(settlements).to.deep.equal(expects.settlements);
                    }
                });
            });
        });
    });
    describe('#getAllSettlements()', () => {
        [
            {
                name: 'should return both on-chain balance and payment settlements',
                loads: {
                    balance: true,
                    payment: true
                },
                expects: [{type: 'payment'}, {type: 'onchain-balance'}]
            },
            {
                name: 'should return on-chain balance settlement',
                loads: {
                    balance: true,
                    payment: false
                },
                expects: [{type: 'onchain-balance'}]
            },
            {
                name: 'should return payment settlement',
                loads: {
                    balance: false,
                    payment: true
                },
                expects: [{type: 'payment'}]
            },
            {
                name: 'should not return any settlements',
                loads: {
                    balance: false,
                    payment: false
                },
                expects: []
            }
        ].forEach(({name, loads, expects}) => {
            it(name, async () => {
                const currencyObj = Currency.from(currency);
                if (loads.balance) {
                    stubbedOnchainBalanceSettlement.load
                        .withArgs(EthereumAddressMatcher(fakeWallet.address), CurrencyMatcher(currencyObj), stubbedProvider)
                        .resolves({type: 'onchain-balance'});
                }
                if (loads.payment) {
                    stubbedPaymentSettlement.load
                        .withArgs(EthereumAddressMatcher(fakeWallet.address), CurrencyMatcher(currencyObj), stubbedProvider)
                        .resolves({type: 'payment'});
                }
                const settlements = await settlementFactory.getAllSettlements(EthereumAddress.from(fakeWallet.address), currency.ct);
                expect(settlements).to.deep.equal(expects);
            });
        });
    });
});
