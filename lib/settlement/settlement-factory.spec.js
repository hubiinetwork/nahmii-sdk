'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const ethers = require('ethers');
const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const MonetaryAmount = require('../monetary-amount');

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

const stubbedContinuousSettlement = {
    checkForCreate: sinon.stub(),
    load: sinon.stub(),
    create: sinon.stub()
};
stubbedContinuousSettlement.reset = function() {
    this.checkForCreate.reset();
    this.load.reset();
    this.create.reset();
}.bind(stubbedContinuousSettlement);

function proxyquireSettlement() {
    return proxyquire('./settlement-factory', {
        './payment-settlement': stubbedPaymentSettlement,
        './continuous-settlement': stubbedContinuousSettlement
    });
}

describe('SettlementFactory', () => {
    const fakeWallet = {address: '0x1'};
    const currency = {ct: '0x0000000000000000000000000000000000000001', id: 0, decimals: 18};
    const SettlementFactory = proxyquireSettlement();
    let settlementFactory;

    beforeEach(() => {
        settlementFactory = new SettlementFactory(stubbedProvider);
    });

    afterEach(() => {
        stubbedProvider.reset();
        stubbedPaymentSettlement.reset();
        stubbedContinuousSettlement.reset();
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
                        continuous: {canStart: true},
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
                    name: 'should create both payment and continuous settlements when intended stage amount is greater than the max stage amount of payment settlement',
                    stageAmount: 2,
                    checks: {
                        continuous: {canStart: true},
                        payment: {canStart: true, maxStageAmount: ethers.utils.bigNumberify(1)}
                    },
                    expects: {
                        stageAmounts: {
                            payment: 1,
                            continuous: 1
                        },
                        settlements: [{type: 'payment'}, {type: 'continuous'}]
                    }
                },
                {
                    name: 'should only create a continuous settlement',
                    stageAmount: 2,
                    checks: {
                        continuous: {canStart: true},
                        payment: {canStart: false, maxStageAmount: ethers.utils.bigNumberify(1)}
                    },
                    expects: {
                        stageAmounts: {
                            continuous: 2
                        },
                        settlements: [{type: 'continuous'}]
                    }
                },
                {
                    name: 'should throw error when continuous settlement is not allowed',
                    stageAmount: 1,
                    checks: {
                        continuous: {canStart: false},
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
                        continuous: {canStart: true},
                        payment: {canStart: true, maxStageAmount: ethers.utils.bigNumberify(1)}
                    },
                    expects: {
                        throws: /.*maximum.*allowable.*/i
                    }
                }
            ].forEach(({name, stageAmount, checks, expects}) => {
                it(name, async () => {
                    stubbedContinuousSettlement.checkForCreate
                        .withArgs(fakeWallet.address, currency.ct, stubbedProvider)
                        .resolves(checks.continuous);
                    stubbedPaymentSettlement.checkForCreate
                        .withArgs(fakeWallet.address, currency.ct, stubbedProvider)
                        .resolves(checks.payment);
                    if (expects.stageAmounts && expects.stageAmounts.continuous) {
                        stubbedContinuousSettlement.create
                            .withArgs(fakeWallet.address, currency.ct, ethers.utils.bigNumberify(expects.stageAmounts.continuous), stubbedProvider)
                            .resolves({type: 'continuous'});
                    }
                    if (expects.stageAmounts && expects.stageAmounts.payment) {
                        stubbedPaymentSettlement.create
                            .withArgs(fakeWallet.address, currency.ct, ethers.utils.bigNumberify(expects.stageAmounts.payment), stubbedProvider)
                            .resolves({type: 'payment'});
                    }
                    let stageMonetaryAmount = MonetaryAmount.from(stageAmount, currency.ct);
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
                name: 'should return both continuous and payment settlements',
                loads: {
                    continuous: true,
                    payment: true
                },
                expects: [{type: 'payment'}, {type: 'continuous'}]
            },
            {
                name: 'should return continuous settlement',
                loads: {
                    continuous: true,
                    payment: false
                },
                expects: [{type: 'continuous'}]
            },
            {
                name: 'should return payment settlement',
                loads: {
                    continuous: false,
                    payment: true
                },
                expects: [{type: 'payment'}]
            },
            {
                name: 'should not return any settlements',
                loads: {
                    continuous: false,
                    payment: false
                },
                expects: []
            }
        ].forEach(({name, loads, expects}) => {
            it(name, async () => {
                if (loads.continuous) {
                    stubbedContinuousSettlement.load
                        .withArgs(fakeWallet.address, currency.ct, stubbedProvider)
                        .resolves({type: 'continuous'});
                }
                if (loads.payment) {
                    stubbedPaymentSettlement.load
                        .withArgs(fakeWallet.address, currency.ct, stubbedProvider)
                        .resolves({type: 'payment'});
                }
                const settlements = await settlementFactory.getAllSettlements(fakeWallet.address, currency.ct);
                expect(settlements).to.deep.equal(expects);
            });
        });
    });
});
