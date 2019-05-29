'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');
const PaymentSettlement = require('./payment-settlement');
const Receipt = require('../receipt');
const MonetaryAmount = require('../monetary-amount');

const privateKey = '0x' + '0F'.repeat(32);

const stubbedProvider = {
    network: {name: 'ropsten'},
    getNahmiiBalances: sinon.stub(),
    getWalletReceipts: sinon.stub(),
    getTokenInfo: sinon.stub(),
    getTransactionConfirmation: sinon.stub()
};

const stubbedClientFundContract = {
    address: 'client fund address'
};

const stubbedErc20Contract = {
    approve: sinon.stub()
};

const stubbedPaymentSettlement = {
    load: sinon.stub(),
};

const stubbedDriipSettlement = {
    getCurrentProposalNonce: sinon.stub(),
    getCurrentProposalStageAmount: sinon.stub(),
    checkSettleDriipAsPayment: sinon.stub(),
    startChallengeFromPayment: sinon.stub(),
    settleDriipAsPayment: sinon.stub(),
    getCurrentProposalExpirationTime: sinon.stub(),
    checkStartChallengeFromPayment: sinon.stub(),
    stopChallenge: sinon.stub()
};

const stubbedNullSettlement = {
    checkSettleNull: sinon.stub(),
    startChallenge: sinon.stub(),
    settleNull: sinon.stub(),
    getCurrentProposalExpirationTime: sinon.stub(),
    getCurrentProposalStageAmount: sinon.stub(),
    checkStartChallenge: sinon.stub(),
    stopChallenge: sinon.stub()
};

function proxyquireWallet() {
    return proxyquire('../wallet/wallet', {
        './client-fund-contract': function() {
            return stubbedClientFundContract;
        },
        './balance-tracker-contract': function() {
            return {};
        },
        './erc20-contract': function(address) {
            stubbedErc20Contract.address = address;
            return stubbedErc20Contract;
        }
    });
}

function proxyquireSettlement() {
    return proxyquire('./settlement-factory', {
        './driip-settlement': function() {
            return stubbedDriipSettlement;
        },
        './null-settlement': function() {
            return stubbedNullSettlement;
        }
    });
}

function proxyquireSettlementModule() {
    return proxyquire('./index', {
        './settlement-factory': proxyquireSettlement()
    });
}


describe.only('SettlementFactory', () => {
    let settlement;
    const currency = {
        ct: '0x0000000000000000000000000000000000000000',
        id: 0
    };
    const Wallet = proxyquireWallet();
    const {Settlement} = proxyquireSettlementModule();
    const wallet = new Wallet(privateKey, stubbedProvider);
    const mockReceipt = {
        amount: 100,
        currency,
        sender: {
            wallet: wallet.address,
            balances: {
                current: 200
            },
            nonce: 1,
            data: ''
        },
        recipient: {
            wallet: '0x2',
            balances: {
                current: 200
            },
            nonce: 2
        },
        operator: {
            id: 0,
            data: ''
        }
    };

    beforeEach(() => {
        settlement = new Settlement(stubbedProvider);
    });

    afterEach(() => {
        stubbedPaymentSettlement.load.reset();
        stubbedNullSettlement.checkSettleNull.reset();
        stubbedNullSettlement.startChallenge.reset();
        stubbedNullSettlement.settleNull.reset();
        stubbedNullSettlement.getCurrentProposalExpirationTime.reset();
        stubbedNullSettlement.getCurrentProposalStageAmount.reset();
        stubbedNullSettlement.checkStartChallenge.reset();
        stubbedNullSettlement.stopChallenge.reset();
        stubbedProvider.getNahmiiBalances.reset();
        stubbedProvider.getTransactionConfirmation.reset();
    });

    describe('#calculateRequiredSettlements()', () => {
        const stubs = {};

        beforeEach(() => {
            stubs.getLatestReceiptForSettlement = sinon.stub(settlement, 'getLatestReceiptForSettlement');
            stubs.checkStartChallenge = sinon.stub(settlement, 'checkStartChallenge');
        });

        afterEach(() => {
            settlement.checkStartChallenge.restore();
            settlement.getLatestReceiptForSettlement.restore();
        });

        [
            {
                describe: 'returns a required payment settlement',
                stageAmount: 100,
                receipt: mockReceipt,
                walletAddress: mockReceipt.sender.wallet,
                expect: [
                    new PaymentSettlement(mockReceipt.sender.wallet, mockReceipt, MonetaryAmount.from(100, currency.ct, currency.id).amount, stubbedProvider)
                ]
            },
            // {
            //     describe: 'returns null settlement as an required challenge',
            //     stageAmount: 100,
            //     receipt: null,
            //     notAllowNewDriipChallenge: true,
            //     walletAddress: mockReceipt.sender.wallet,
            //     expect: {
            //         requiredChallenges: [
            //             {
            //                 type: 'null',
            //                 stageMonetaryAmount: MonetaryAmount.from(100, currency.ct, currency.id)
            //             }
            //         ],
            //         invalidReasons: [{type: 'payment-driip', reasons: []}]
            //     }
            // },
            // {
            //     describe: 'returns both null and driip settlements as required challenges for sender',
            //     stageAmount: 300,
            //     receipt: mockReceipt,
            //     walletAddress: mockReceipt.sender.wallet,
            //     expect: {
            //         requiredChallenges: [
            //             {
            //                 type: 'payment-driip',
            //                 receipt: mockReceipt,
            //                 stageMonetaryAmount: MonetaryAmount.from(mockReceipt.sender.balances.current, currency.ct, currency.id)
            //             },
            //             {
            //                 type: 'null',
            //                 stageMonetaryAmount: MonetaryAmount.from(300 - mockReceipt.sender.balances.current, currency.ct, currency.id)
            //             }
            //         ],
            //         invalidReasons: []
            //     }
            // },
            // {
            //     describe: 'returns both null and driip settlements as required challenges for recipient',
            //     stageAmount: 300,
            //     receipt: mockReceipt,
            //     walletAddress: mockReceipt.recipient.wallet,
            //     expect: {
            //         requiredChallenges: [
            //             {
            //                 type: 'payment-driip',
            //                 receipt: mockReceipt,
            //                 stageMonetaryAmount: MonetaryAmount.from(mockReceipt.recipient.balances.current, currency.ct, currency.id)
            //             },
            //             {
            //                 type: 'null',
            //                 stageMonetaryAmount: MonetaryAmount.from(300 - mockReceipt.recipient.balances.current, currency.ct, currency.id)
            //             }
            //         ],
            //         invalidReasons: []
            //     }
            // },
            // {
            //     describe: 'returns null settlement if can not start driip challenge',
            //     stageAmount: 300,
            //     receipt: null,
            //     walletAddress: mockReceipt.sender.wallet,
            //     notAllowNewDriipChallenge: true,
            //     expect: {
            //         requiredChallenges: [
            //             {
            //                 type: 'null',
            //                 stageMonetaryAmount: MonetaryAmount.from(300, currency.ct, currency.id)
            //             }
            //         ],
            //         invalidReasons: [{type: 'payment-driip', reasons: []}]
            //     }
            // },
            // {
            //     describe: 'returns driip settlement if can not start null challenge',
            //     stageAmount: 300,
            //     receipt: mockReceipt,
            //     walletAddress: mockReceipt.sender.wallet,
            //     notAllowNewNullChallenge: true,
            //     expect: {
            //         requiredChallenges: [
            //             {
            //                 type: 'payment-driip',
            //                 stageMonetaryAmount: MonetaryAmount.from(300, currency.ct, currency.id),
            //                 receipt: mockReceipt
            //             }
            //         ],
            //         invalidReasons: [{type: 'null', reasons: []}]
            //     }
            // },
            // {
            //     describe: 'returns empty array if both settlement types are not allowed to start new challenges',
            //     stageAmount: 300,
            //     receipt: mockReceipt,
            //     walletAddress: mockReceipt.sender.wallet,
            //     notAllowNewDriipChallenge: true,
            //     notAllowNewNullChallenge: true,
            //     expect: {
            //         requiredChallenges: [],
            //         invalidReasons: [{
            //             type: 'payment-driip',
            //             reasons: []
            //         }, {type: 'null', reasons: []}]
            //     }
            // }
        ].forEach(t => {
            it(t.describe, async () => {
                const allowedChallenges = [];
                const invalidReasons = [];
                if (!t.notAllowNewDriipChallenge)
                    allowedChallenges.push('payment-driip');

                if (!t.notAllowNewNullChallenge)
                    allowedChallenges.push('null');

                if (t.notAllowNewDriipChallenge === true)
                    invalidReasons.push({type: 'payment-driip', reasons: []});

                if (t.notAllowNewNullChallenge === true)
                    invalidReasons.push({type: 'null', reasons: []});

                stubbedProvider.getWalletReceipts
                    .withArgs(t.walletAddress, null, 100)
                    .resolves(t.receipt);

                const stageAmount = ethers.utils.bigNumberify(t.stageAmount);
                const stageMonetaryAmount = MonetaryAmount.from(stageAmount, currency.ct, currency.id);

                const requiredChallenges = await settlement.calculateRequiredSettlements(t.walletAddress, stageMonetaryAmount);
                const actualRequiredChallenges = JSON.parse(JSON.stringify(requiredChallenges));
                const expectedRequiredSettlements = JSON.parse(JSON.stringify(t.expect));
                expect(actualRequiredChallenges).to.deep.equal(expectedRequiredSettlements);
            });
        });

        it('should rethrow exception', () => {
            stubs.getLatestReceiptForSettlement.rejects(new Error());
            return settlement.getRequiredChallengesForIntendedStageAmount().catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                expect(e.innerError).not.be.undefined;
            });
        });
    });
    xdescribe('#getAllSettlements()', () => {
        ['sender', 'recipient'].forEach(t => {
            it(`returns driip settlement as a settleable challenge for the ${t} wallet`, async () => {
                const stageAmount = ethers.utils.bigNumberify(1);
                stubbedDriipSettlement.getCurrentProposalNonce
                    .withArgs(mockReceipt[t].wallet, currency.ct, currency.id)
                    .resolves(ethers.utils.bigNumberify(mockReceipt[t].nonce));
                stubbedDriipSettlement.getCurrentProposalStageAmount
                    .withArgs(mockReceipt[t].wallet, currency.ct, currency.id)
                    .resolves(stageAmount);
                stubbedDriipSettlement.checkSettleDriipAsPayment
                    .withArgs(Receipt.from(mockReceipt, stubbedProvider), mockReceipt[t].wallet)
                    .resolves({valid: true});
                stubbedNullSettlement.checkSettleNull
                    .resolves({valid: false, reasons: []});
                stubbedProvider.getWalletReceipts
                    .withArgs(mockReceipt[t].wallet)
                    .resolves([mockReceipt]);

                const {settleableChallenges, invalidReasons} = await settlement.getSettleableChallenges(mockReceipt[t].wallet, currency.ct, currency.id);
                expect(settleableChallenges.length).to.equal(1);
                expect(settleableChallenges[0].type).to.equal('payment-driip');
                expect(settleableChallenges[0].receipt).to.deep.equal(mockReceipt);
                expect(settleableChallenges[0].intendedStageAmount.toJSON()).to.deep.equal(MonetaryAmount.from(stageAmount, currency.ct, currency.id).toJSON());

                expect(invalidReasons.length).to.equal(1);
                expect(invalidReasons[0].type).to.equal('null');
                expect(invalidReasons[0].reasons).to.deep.equal([]);
            });
        });
        it('returns null settlement as a settleable challenge', async () => {
            const stageAmount = ethers.utils.bigNumberify(1);
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet)
                .resolves([mockReceipt]);
            stubbedDriipSettlement.getCurrentProposalNonce
                .resolves(ethers.utils.bigNumberify(mockReceipt.sender.nonce));
            stubbedDriipSettlement.checkSettleDriipAsPayment
                .withArgs(Receipt.from(mockReceipt, stubbedProvider), mockReceipt.sender.wallet)
                .resolves({valid: false, reasons: []});
            stubbedNullSettlement.getCurrentProposalStageAmount
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(stageAmount);
            stubbedNullSettlement.checkSettleNull
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves({valid: true});

            const {settleableChallenges, invalidReasons} = await settlement.getSettleableChallenges(mockReceipt.sender.wallet, currency.ct, currency.id);
            expect(settleableChallenges.length).to.equal(1);
            expect(settleableChallenges[0].type).to.equal('null');
            expect(settleableChallenges[0].intendedStageAmount.toJSON()).to.deep.equal(MonetaryAmount.from(stageAmount, currency.ct, currency.id).toJSON());

            expect(invalidReasons.length).to.equal(1);
            expect(invalidReasons[0].type).to.equal('payment-driip');
            expect(invalidReasons[0].reasons).to.deep.equal([]);
        });
        it('returns both null and driip settlements as settleable challenges', async () => {
            const stageAmount = ethers.utils.bigNumberify(1);
            const stageMonetaryAmount = MonetaryAmount.from(stageAmount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet, mockReceipt.nonce, 1)
                .resolves([mockReceipt]);
            stubbedDriipSettlement.getCurrentProposalStageAmount
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(stageAmount);
            stubbedDriipSettlement.getCurrentProposalNonce
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(ethers.utils.bigNumberify(mockReceipt.sender.nonce));
            stubbedDriipSettlement.checkSettleDriipAsPayment
                .withArgs(Receipt.from(mockReceipt, stubbedProvider), mockReceipt.sender.wallet)
                .resolves({valid: true});
            stubbedNullSettlement.getCurrentProposalStageAmount
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(stageAmount);
            stubbedNullSettlement.checkSettleNull
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves({valid: true});

            const {settleableChallenges} = await settlement.getSettleableChallenges(mockReceipt.sender.wallet, currency.ct, currency.id);
            expect(JSON.parse(JSON.stringify(settleableChallenges))).to.deep.equal([
                {
                    type: 'payment-driip',
                    receipt: mockReceipt,
                    intendedStageAmount: stageMonetaryAmount.toJSON()
                },
                {
                    type: 'null',
                    intendedStageAmount: stageMonetaryAmount.toJSON()
                }
            ]);
        });
        it('returns empty settleable challenges when there are no qualified settlements', async () => {
            stubbedDriipSettlement.getCurrentProposalNonce
                .resolves(ethers.utils.bigNumberify(mockReceipt.sender.nonce));
            stubbedDriipSettlement.checkSettleDriipAsPayment
                .resolves({valid: false, reasons: []});
            stubbedNullSettlement.checkSettleNull
                .resolves({valid: false, reasons: []});
            const {settleableChallenges, invalidReasons} = await settlement.getSettleableChallenges(mockReceipt.sender.wallet, currency.ct, currency.id);
            expect(settleableChallenges).to.deep.equal([]);
            expect(invalidReasons).to.deep.equal([{
                type: 'payment-driip',
                reasons: []
            }, {type: 'null', reasons: []}]);
        });
        it('should rethrow exception', () => {
            stubbedDriipSettlement.getCurrentProposalNonce
                .rejects(new Error());
            return settlement.getSettleableChallenges().catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                expect(e.innerError).not.be.undefined;
            });
        });
    });
    xdescribe('#getMaxChallengesTimeout()', () => {
        let stubbedGetOngoingChallenges;
        beforeEach(() => {
            stubbedGetOngoingChallenges = sinon.stub(settlement, 'getOngoingChallenges');
        });
        afterEach(() => {
            settlement.getOngoingChallenges.restore();
        });
        it('returns the max expiration time from ongoing challenges', async () => {
            stubbedGetOngoingChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves([
                    {expirationTime: 1},
                    {expirationTime: 2}
                ]);
            const time = await settlement.getMaxChallengesTimeout(wallet.address, currency.ct, currency.id);
            expect(time).to.equal(2);
        });
        it('returns null when there is no ongoing challenges', async () => {
            stubbedGetOngoingChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves([]);
            const time = await settlement.getMaxChallengesTimeout(wallet.address, currency.ct, currency.id);
            expect(time).to.be.null;
        });
        it('should rethrow exception', () => {
            stubbedGetOngoingChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .rejects(new Error());
            return settlement.getMaxChallengesTimeout(wallet.address, currency.ct, currency.id).catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                expect(e.innerError).not.be.undefined;
            });
        });
    });
});
