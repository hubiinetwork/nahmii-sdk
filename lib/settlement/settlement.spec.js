'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');
const Receipt = require('../receipt');
const MonetaryAmount = require('../monetary-amount');

const privateKey = '0x' + '0F'.repeat(32);

const stubbedProvider = {
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
    return proxyquire('./settlement', {
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
        './settlement': proxyquireSettlement()
    });
}


describe('Settlement', () => {
    let settlement;
    const currency = {
        ct: '0x0000000000000000000000000000000000000000',
        id: 0
    };
    const Wallet = proxyquireWallet();
    const {Settlement} = proxyquireSettlementModule();
    const wallet = new Wallet(privateKey, stubbedProvider);
    const mockReceipt = {
        nonce: 1,
        amount: 100,
        currency,
        sender: {
            wallet: wallet.address,
            balances: {
                current: 200
            },
            nonce: 1
        },
        recipient: {
            wallet: '0x2',
            balances: {
                current: 200
            },
            nonce: 2
        }
    };

    beforeEach(() => {
        settlement = new Settlement(stubbedProvider);
    });

    afterEach(() => {
        stubbedDriipSettlement.getCurrentProposalNonce.reset();
        stubbedDriipSettlement.getCurrentProposalStageAmount.reset();
        stubbedDriipSettlement.checkSettleDriipAsPayment.reset();
        stubbedDriipSettlement.startChallengeFromPayment.reset();
        stubbedDriipSettlement.settleDriipAsPayment.reset();
        stubbedDriipSettlement.getCurrentProposalExpirationTime.reset();
        stubbedDriipSettlement.checkStartChallengeFromPayment.reset();
        stubbedDriipSettlement.stopChallenge.reset();
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

    describe('#getLatestReceiptForSettlement', () => {
        it('should return latest receipt matching the currency', async () => {
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet, null, 100)
                .resolves([mockReceipt, {nonce: 1, currency: {ct: '0x1'}}]);

            const latestReceipt = await settlement.getLatestReceiptForSettlement(mockReceipt.sender.wallet, currency.ct);
            expect(latestReceipt).to.deep.equal(mockReceipt);
        });

        it('should return latest receipt sorted by nonce in desc', async () => {
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet, null, 100)
                .resolves([{nonce: mockReceipt.nonce - 1, currency}, mockReceipt]);

            const latestReceipt = await settlement.getLatestReceiptForSettlement(mockReceipt.sender.wallet, currency.ct);
            expect(latestReceipt).to.deep.equal(mockReceipt);
        });

        it('should return null when returned no receipts', async () => {
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet, null, 100)
                .resolves([]);

            const latestReceipt = await settlement.getLatestReceiptForSettlement(mockReceipt.sender.wallet, currency.ct);
            expect(latestReceipt).to.equal(null);
        });

        it('should return null when no receipts matched the currency', async () => {
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet, null, 100)
                .resolves([{currency: {ct: '0x1'}}, {currency: {ct: '0x2'}}]);

            const latestReceipt = await settlement.getLatestReceiptForSettlement(mockReceipt.sender.wallet, currency.ct);
            expect(latestReceipt).to.equal(null);
        });

        it('should rethrow exception', () => {
            stubbedProvider.getWalletReceipts.rejects(new Error());
            return settlement.getLatestReceiptForSettlement().catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                expect(e.innerError).not.be.undefined;
            });
        });
    });

    describe('#getRequiredChallengesForIntendedStageAmount', () => {
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
                describe: 'should return driip settlement as an required challenge',
                stageAmount: 100,
                receipt: mockReceipt,
                walletAddress: mockReceipt.sender.wallet,
                expect: {
                    requiredChallenges: [
                        {
                            type: 'payment-driip',
                            receipt: mockReceipt,
                            stageMonetaryAmount: MonetaryAmount.from(100, currency.ct, currency.id)
                        }
                    ],
                    invalidReasons: []
                }
            },
            {
                describe: 'should return null settlement as an required challenge',
                stageAmount: 100,
                receipt: null,
                notAllowNewDriipChallenge: true,
                walletAddress: mockReceipt.sender.wallet,
                expect: {
                    requiredChallenges: [
                        {
                            type: 'null',
                            stageMonetaryAmount: MonetaryAmount.from(100, currency.ct, currency.id)
                        }
                    ],
                    invalidReasons: [{type: 'payment-driip', reasons: []}]
                }
            },
            {
                describe: 'should return both null and driip settlements as required challenges for sender',
                stageAmount: 300,
                receipt: mockReceipt,
                walletAddress: mockReceipt.sender.wallet,
                expect: {
                    requiredChallenges: [
                        {
                            type: 'payment-driip',
                            receipt: mockReceipt,
                            stageMonetaryAmount: MonetaryAmount.from(mockReceipt.sender.balances.current, currency.ct, currency.id)
                        },
                        {
                            type: 'null',
                            stageMonetaryAmount: MonetaryAmount.from(300 - mockReceipt.sender.balances.current, currency.ct, currency.id)
                        }
                    ],
                    invalidReasons: []
                }
            },
            {
                describe: 'should return both null and driip settlements as required challenges for recipient',
                stageAmount: 300,
                receipt: mockReceipt,
                walletAddress: mockReceipt.recipient.wallet,
                expect: {
                    requiredChallenges: [
                        {
                            type: 'payment-driip',
                            receipt: mockReceipt,
                            stageMonetaryAmount: MonetaryAmount.from(mockReceipt.recipient.balances.current, currency.ct, currency.id)
                        },
                        {
                            type: 'null',
                            stageMonetaryAmount: MonetaryAmount.from(300 - mockReceipt.recipient.balances.current, currency.ct, currency.id)
                        }
                    ],
                    invalidReasons: []
                }
            },
            {
                describe: 'should return null settlement if can not start driip challenge',
                stageAmount: 300,
                receipt: null,
                walletAddress: mockReceipt.sender.wallet,
                notAllowNewDriipChallenge: true,
                expect: {
                    requiredChallenges: [
                        {
                            type: 'null',
                            stageMonetaryAmount: MonetaryAmount.from(300, currency.ct, currency.id)
                        }
                    ],
                    invalidReasons: [{type: 'payment-driip', reasons: []}]
                }
            },
            {
                describe: 'should return driip settlement if can not start null challenge',
                stageAmount: 300,
                receipt: mockReceipt,
                walletAddress: mockReceipt.sender.wallet,
                notAllowNewNullChallenge: true,
                expect: {
                    requiredChallenges: [
                        {
                            type: 'payment-driip',
                            stageMonetaryAmount: MonetaryAmount.from(300, currency.ct, currency.id),
                            receipt: mockReceipt
                        }
                    ],
                    invalidReasons: [{type: 'null', reasons: []}]
                }
            },
            {
                describe: 'should return empty array if both settlement types are not allowed to start new challenges',
                stageAmount: 300,
                receipt: mockReceipt,
                walletAddress: mockReceipt.sender.wallet,
                notAllowNewDriipChallenge: true,
                notAllowNewNullChallenge: true,
                expect: {
                    requiredChallenges: [],
                    invalidReasons: [{type: 'payment-driip', reasons: []}, {type: 'null', reasons: []}]
                }
            }
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


                if (t.receipt) {
                    stubs.getLatestReceiptForSettlement
                        .withArgs(t.walletAddress, currency.ct)
                        .resolves(t.receipt);
                }
                else {
                    stubs.getLatestReceiptForSettlement
                        .withArgs(t.walletAddress, currency.ct)
                        .resolves(null);
                }


                stubs.checkStartChallenge
                    .withArgs(MonetaryAmount.from(t.stageAmount, currency.ct, currency.id), t.receipt, t.walletAddress)
                    .resolves({allowedChallenges, invalidReasons});

                const stageAmount = ethers.utils.bigNumberify(t.stageAmount);
                const stageMonetaryAmount = MonetaryAmount.from(stageAmount, currency.ct, currency.id);

                const requiredChallenges = await settlement.getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, t.walletAddress);
                const actualRequiredChallenges = JSON.parse(JSON.stringify(requiredChallenges));
                const expectedRequiredChallenges = JSON.parse(JSON.stringify(t.expect));
                expect(actualRequiredChallenges).to.deep.equal(expectedRequiredChallenges);
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
    describe('#checkStartChallenge', () => {
        beforeEach(() => {
            settlement.getOngoingChallenges = sinon.stub();
        });
        afterEach(() => {
            settlement.getOngoingChallenges.reset();
        });
        [
            {
                null: {allow: true},
                driip: {allow: true},
                receipt: mockReceipt,
                allow: ['payment-driip', 'null'],
                disallow: []
            },
            {
                null: {allow: false},
                driip: {allow: true},
                receipt: mockReceipt,
                allow: ['payment-driip'],
                disallow: [{type: 'null', reasons: []}]
            },
            {
                null: {allow: false},
                driip: {allow: true},
                receipt: mockReceipt,
                allow: [],
                ongoingChallenges: [{type: 'null'}],
                disallow: [{type: 'payment-driip', reasons: []}, {type: 'null', reasons: []}]
            },
            {
                null: {allow: true},
                driip: {allow: false},
                receipt: mockReceipt,
                allow: ['null'],
                disallow: [{type: 'payment-driip', reasons: []}]
            },
            {
                null: {allow: false},
                driip: {allow: false},
                receipt: mockReceipt,
                allow: [],
                disallow: [{type: 'payment-driip', reasons: []}, {type: 'null', reasons: []}]
            },
            {
                null: {allow: true},
                driip: {allow: false},
                receipt: mockReceipt,
                allow: ['null'],
                disallow: [{type: 'payment-driip', reasons: []}]
            }
        ].forEach(t => {
            it(`should not allow new challenge when allowed driip challenge: ${t.driip.allow}, null challenge: ${t.null.allow}, provided receipt: ${t.receipt? true: false}`, async () => {
                const amountBN = ethers.utils.bigNumberify('100');
                const amountAvailableBN = ethers.utils.bigNumberify('90');
                const stageMonetaryAmount = MonetaryAmount.from(amountAvailableBN.toString(), currency.ct, currency.id);
                const checkDriip = stubbedDriipSettlement.checkStartChallengeFromPayment
                    .withArgs(Receipt.from(t.receipt, stubbedProvider), wallet.address);
                const checkNull = stubbedNullSettlement.checkStartChallenge
                    .withArgs(stageMonetaryAmount, wallet.address);

                stubbedProvider.getTokenInfo
                    .withArgs(currency.ct, true)
                    .resolves({symbol: 'ETH', decimals: 18});
                stubbedProvider.getNahmiiBalances
                    .withArgs(wallet.address)
                    .resolves([{currency, amount: amountBN.toString(), amountAvailable: amountAvailableBN.toString()}]);

                settlement.getOngoingChallenges
                    .withArgs(wallet.address, currency.ct, currency.id)
                    .resolves(t.ongoingChallenges || []);

                if (t.driip.allow)
                    checkDriip.resolves({valid: true});
                else
                    checkDriip.resolves({valid: false, reasons: []});

                if (t.null.allow)
                    checkNull.resolves({valid: true});
                else
                    checkNull.resolves({valid: false, reasons: []});

                const {allowedChallenges, invalidReasons} = await settlement.checkStartChallenge(stageMonetaryAmount, t.receipt, wallet.address);
                expect(allowedChallenges).to.deep.equal(t.allow);
                expect(invalidReasons.map(r => r.type)).to.deep.equal(t.disallow.map(r => r.type));
            });
        });

        it('should throw exception when the nahmii balance is less than the stage amount', () => {
            const amountBN = ethers.utils.bigNumberify('100');
            const amountAvailableBN = amountBN.sub(1);
            const stageMonetaryAmount = MonetaryAmount.from(amountBN.toString(), currency.ct, currency.id);
            stubbedProvider.getTokenInfo
                .withArgs(currency.ct, true)
                .resolves({symbol: 'ETH', decimals: 18});
            stubbedProvider.getNahmiiBalances
                .withArgs(wallet.address)
                .resolves([{currency, amount: amountBN.toString(), amountAvailable: amountAvailableBN.toString()}]);

            return settlement.checkStartChallenge(stageMonetaryAmount, null, wallet.address).catch(e => {
                expect(e.innerError.message).to.match(/.*maximum.*allowable.*balance.*/i);
            });
        });
    });
    describe('#getSettleableChallenges', () => {
        ['sender', 'recipient'].forEach(t => {
            it(`should return driip settlement as a settleable challenge for the ${t} wallet`, async () => {
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
        it('should return null settlement as a settleable challenge', async () => {
            const stageAmount = ethers.utils.bigNumberify(1);
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet, mockReceipt.nonce, 1)
                .resolves([mockReceipt]);
            stubbedDriipSettlement.getCurrentProposalNonce
                .resolves(ethers.utils.bigNumberify(mockReceipt.nonce));
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
        it('should return both null and driip settlements as settleable challenges', async () => {
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
                .resolves(ethers.utils.bigNumberify(mockReceipt.nonce));
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
        it('should return empty settleable challenges when there are no qualified settlements', async () => {
            stubbedDriipSettlement.getCurrentProposalNonce
                .resolves(ethers.utils.bigNumberify(mockReceipt.nonce));
            stubbedDriipSettlement.checkSettleDriipAsPayment
                .resolves({valid: false, reasons: []});
            stubbedNullSettlement.checkSettleNull
                .resolves({valid: false, reasons: []});
            const {settleableChallenges, invalidReasons} = await settlement.getSettleableChallenges(mockReceipt.sender.wallet, currency.ct, currency.id);
            expect(settleableChallenges).to.deep.equal([]);
            expect(invalidReasons).to.deep.equal([{type: 'payment-driip', reasons: []}, {type: 'null', reasons: []}]);
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
    describe('#getOngoingChallenges', () => {
        beforeEach(() => {
            this.clock = sinon.useFakeTimers(1);
        });
        afterEach(() => {
            this.clock.restore();
        });

        [
            {
                driipExpirationTime: ethers.utils.bigNumberify(100),
                nullExpirationTime: ethers.utils.bigNumberify(200),
                driipStageAmount: ethers.utils.bigNumberify(1),
                nullStageAmount: ethers.utils.bigNumberify(2),
                expect: [
                    {
                        type: 'payment-driip',
                        expirationTime: 100 * 1000,
                        intendedStageAmount: MonetaryAmount.from(1, currency.ct, currency.id)
                    },
                    {
                        type: 'null',
                        expirationTime: 200 * 1000,
                        intendedStageAmount: MonetaryAmount.from(2, currency.ct, currency.id)
                    }
                ]
            },
            {
                driipExpirationTime: ethers.utils.bigNumberify(100),
                driipStageAmount: ethers.utils.bigNumberify(1),
                expect: [
                    {
                        type: 'payment-driip',
                        expirationTime: 100 * 1000,
                        intendedStageAmount: MonetaryAmount.from(1, currency.ct, currency.id)
                    }
                ]
            },
            {
                nullExpirationTime: ethers.utils.bigNumberify(100),
                nullStageAmount: ethers.utils.bigNumberify(1),
                expect: [
                    {
                        type: 'null',
                        expirationTime: 100 * 1000,
                        intendedStageAmount: MonetaryAmount.from(1, currency.ct, currency.id)
                    }
                ]
            },
            {
                expect: []
            }
        ].forEach(t => {
            it(`when driip expiration time is ${t.driipExpirationTime ? t.driipExpirationTime.toNumber() : null} and null expiration time is ${t.nullExpirationTime ? t.nullExpirationTime.toNumber(): null}`, async () => {
                stubbedDriipSettlement.getCurrentProposalExpirationTime
                    .withArgs(wallet.address, currency.ct, currency.id)
                    .resolves(t.driipExpirationTime);
                stubbedNullSettlement.getCurrentProposalExpirationTime
                    .withArgs(wallet.address, currency.ct, currency.id)
                    .resolves(t.nullExpirationTime);
                stubbedDriipSettlement.getCurrentProposalStageAmount
                    .withArgs(wallet.address, currency.ct, currency.id)
                    .resolves(t.driipStageAmount);
                stubbedNullSettlement.getCurrentProposalStageAmount
                    .withArgs(wallet.address, currency.ct, currency.id)
                    .resolves(t.nullStageAmount);
                const endtime = await settlement.getOngoingChallenges(wallet.address, currency.ct, currency.id);
                expect(JSON.parse(JSON.stringify(endtime))).to.deep.equal(JSON.parse(JSON.stringify(t.expect)));
            });
        });

        it('should rethrow exception', () => {
            stubbedDriipSettlement.getCurrentProposalExpirationTime
                .rejects(new Error());
            return settlement.getOngoingChallenges().catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                expect(e.innerError).not.be.undefined;
            });
        });
    });
    describe('#startChallenge', () => {
        const expectedTx = {hash: 'fake hash'};
        const fakeTxReceipt = {};

        beforeEach(() => {
            settlement.getRequiredChallengesForIntendedStageAmount = sinon.stub();
            stubbedProvider.getTransactionConfirmation
                .withArgs(expectedTx.hash)
                .resolves(fakeTxReceipt);
        });
        afterEach(() => {
            settlement.getRequiredChallengesForIntendedStageAmount.reset();
        });
        it('should start driip settlement challenge', async () => {
            const stageAmount = MonetaryAmount.from(mockReceipt.amount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(wallet.address, null, 100)
                .resolves([mockReceipt]);
            settlement.getRequiredChallengesForIntendedStageAmount
                .withArgs(stageAmount, wallet.address)
                .resolves({
                    requiredChallenges: [
                        {
                            type: 'payment-driip',
                            stageMonetaryAmount: stageAmount,
                            receipt: mockReceipt
                        }
                    ]}
                );
            stubbedDriipSettlement.startChallengeFromPayment
                .withArgs(Receipt.from(mockReceipt, wallet), stageAmount, wallet)
                .resolves(expectedTx);

            const txs = await settlement.startChallenge(stageAmount, wallet);
            expect(JSON.parse(JSON.stringify(txs))).to.deep.equal([{tx: fakeTxReceipt, type: 'payment-driip', intendedStageAmount: stageAmount.toJSON()}]);
        });
        it('should start null settlement challenge', async () => {
            const stageAmount = MonetaryAmount.from(mockReceipt.amount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(wallet.address, null, 100)
                .resolves([mockReceipt]);
            settlement.getRequiredChallengesForIntendedStageAmount
                .withArgs(stageAmount, wallet.address)
                .resolves({
                    requiredChallenges: [
                        {
                            type: 'null',
                            stageMonetaryAmount: stageAmount
                        }
                    ]}
                );
            stubbedNullSettlement.startChallenge
                .withArgs(wallet, stageAmount)
                .resolves(expectedTx);

            const txs = await settlement.startChallenge(stageAmount, wallet);
            expect(JSON.parse(JSON.stringify(txs))).to.deep.equal([{tx: fakeTxReceipt, type: 'null', intendedStageAmount: stageAmount.toJSON()}]);
        });
        it('should start both null and driip settlement challenges', async () => {
            const stageAmount = MonetaryAmount.from(mockReceipt.amount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(wallet.address, null, 100)
                .resolves([mockReceipt]);
            settlement.getRequiredChallengesForIntendedStageAmount
                .withArgs(stageAmount, wallet.address)
                .resolves({requiredChallenges: [
                    {
                        type: 'null',
                        stageMonetaryAmount: stageAmount
                    },
                    {
                        type: 'payment-driip',
                        stageMonetaryAmount: stageAmount,
                        receipt: mockReceipt
                    }
                ]});
            stubbedNullSettlement.startChallenge
                .withArgs(wallet, stageAmount)
                .resolves(expectedTx);
            stubbedDriipSettlement.startChallengeFromPayment
                .withArgs(Receipt.from(mockReceipt, wallet), stageAmount, wallet)
                .resolves(expectedTx);

            const txs = await settlement.startChallenge(stageAmount, wallet);
            expect(JSON.parse(JSON.stringify(txs))).to.deep.equal([
                {tx: fakeTxReceipt, type: 'null', intendedStageAmount: stageAmount.toJSON()},
                {tx: fakeTxReceipt, type: 'payment-driip', intendedStageAmount: stageAmount.toJSON()}
            ]);
        });
        it('should not start any challenges when the conditions are not allowed', async () => {
            const stageAmount = MonetaryAmount.from(mockReceipt.amount, currency.ct, currency.id);
            settlement.getRequiredChallengesForIntendedStageAmount
                .resolves({requiredChallenges: []});

            const txs = await settlement.startChallenge(stageAmount, wallet);
            expect(txs).to.deep.equal([]);
        });

        it('show reformat exception when tx is sent and failed to be confirmed', () => {
            const stageAmount = MonetaryAmount.from(mockReceipt.amount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(wallet.address, null, 100)
                .resolves([mockReceipt]);
            settlement.getRequiredChallengesForIntendedStageAmount
                .withArgs(stageAmount, wallet.address)
                .resolves({requiredChallenges: [
                    {
                        type: 'payment-driip',
                        stageMonetaryAmount: stageAmount,
                        receipt: mockReceipt
                    }
                ]});
            stubbedDriipSettlement.startChallengeFromPayment
                .withArgs(Receipt.from(mockReceipt, wallet), stageAmount, wallet)
                .resolves(expectedTx);

            stubbedProvider.getTransactionConfirmation
                .withArgs(expectedTx.hash)
                .rejects(true);

            return settlement.startChallenge(stageAmount, wallet).catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                const regex = new RegExp( `sent.*payment.*failed.*${expectedTx.hash}`, 'i' );
                expect(e.innerError.message).to.match(regex);
            });
        });
        it('#startByRequiredChallenge should rethrow exception', () => {
            stubbedNullSettlement.startChallenge
                .rejects(new Error());
            return settlement.startByRequiredChallenge({type: 'null'}, wallet).catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                expect(e.innerError).not.be.undefined;
            });
        });
    });
    describe('#stopChallenge', () => {
        const expectedTx = {hash: 'fake hash'};
        const fakeTxReceipt = {};
        const ongoingChallenges = [
            {
                type: 'payment-driip',
                expirationTime: 100 * 1000,
                intendedStageAmount: MonetaryAmount.from(1, currency.ct, currency.id)
            },
            {
                type: 'null',
                expirationTime: 200 * 1000,
                intendedStageAmount: MonetaryAmount.from(2, currency.ct, currency.id)
            }
        ];

        beforeEach(() => {
            settlement.getOngoingChallenges = sinon.stub();
            stubbedProvider.getTransactionConfirmation
                .withArgs(expectedTx.hash)
                .resolves(fakeTxReceipt);
        });
        afterEach(() => {
            settlement.getOngoingChallenges.reset();
        });
        it('should stop challenges if there are any non-expired challenges', async () => {
            settlement.getOngoingChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(ongoingChallenges);
            stubbedDriipSettlement.stopChallenge
                .withArgs(wallet, currency.ct, currency.id, {})
                .resolves(expectedTx);
            stubbedNullSettlement.stopChallenge
                .withArgs(wallet, currency.ct, currency.id, {})
                .resolves(expectedTx);

            const txs = await settlement.stopChallenges(wallet, currency.ct, currency.id);
            expect(txs).to.deep.equal([{type: 'payment-driip', tx: fakeTxReceipt}, {type: 'null', tx: fakeTxReceipt}]);
        });
        it('should handle exception thrown from #stopByOngoingChallenge', async () => {
            settlement.getOngoingChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(ongoingChallenges);
            stubbedDriipSettlement.stopChallenge
                .withArgs(wallet, currency.ct, currency.id, {})
                .rejects(true);

            await settlement.stopChallenges(wallet, currency.ct, currency.id).catch(e => {
                expect(e.message).to.match(/unable.*stop.*/i);
            });
        });
        it('should handle exception thrown from #getTransactionConfirmation', async () => {
            settlement.getOngoingChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves(ongoingChallenges);
            stubbedDriipSettlement.stopChallenge
                .withArgs(wallet, currency.ct, currency.id, {})
                .resolves(expectedTx);
            stubbedProvider.getTransactionConfirmation
                .withArgs(expectedTx.hash)
                .rejects(true);

            await settlement.stopChallenges(wallet, currency.ct, currency.id).catch(e => {
                expect(e.innerError.message).to.match(/.*failed.*confirm.*transaction/i);
            });
        });
    });
    describe('#settle', () => {
        const expectedTx = {hash: 'fake hash'};
        const fakeTxReceipt = {};

        beforeEach(() => {
            settlement.getSettleableChallenges = sinon.stub();
            stubbedProvider.getTransactionConfirmation
                .withArgs(expectedTx.hash)
                .resolves(fakeTxReceipt);
        });
        afterEach(() => {
            settlement.getSettleableChallenges.reset();
        });
        it('should settle a driip', async () => {
            const stageAmount = MonetaryAmount.from('1', currency.ct, currency.id);
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves({settleableChallenges: [
                    {
                        type: 'payment-driip',
                        receipt: mockReceipt,
                        intendedStageAmount: stageAmount
                    }
                ]});
            stubbedDriipSettlement.settleDriipAsPayment
                .withArgs(Receipt.from(mockReceipt, wallet), wallet)
                .resolves(expectedTx);

            const txs = await settlement.settle(currency.ct, currency.id, wallet);
            expect(JSON.parse(JSON.stringify(txs))).to.deep.equal([{tx: fakeTxReceipt, type: 'payment-driip', intendedStageAmount: stageAmount.toJSON()}]);
        });
        it('should settle a null', async () => {
            const stageAmount = MonetaryAmount.from('1', currency.ct, currency.id);
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves({settleableChallenges: [
                    {
                        type: 'null',
                        intendedStageAmount: stageAmount
                    }
                ]});
            stubbedNullSettlement.settleNull
                .withArgs(wallet, currency.ct, currency.id)
                .resolves(expectedTx);

            const txs = await settlement.settle(currency.ct, currency.id, wallet);
            expect(JSON.parse(JSON.stringify(txs))).to.deep.equal([{tx: fakeTxReceipt, type: 'null', intendedStageAmount: stageAmount.toJSON()}]);
        });
        it('should settle both a driip and a null', async () => {
            const stageAmountOne = MonetaryAmount.from('1', currency.ct, currency.id);
            const stageAmountTwo = MonetaryAmount.from('2', currency.ct, currency.id);
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves({settleableChallenges: [
                    {
                        type: 'payment-driip',
                        receipt: mockReceipt,
                        intendedStageAmount: stageAmountOne
                    },
                    {
                        type: 'null',
                        intendedStageAmount: stageAmountTwo
                    }
                ]});
            stubbedDriipSettlement.settleDriipAsPayment
                .withArgs(Receipt.from(mockReceipt, wallet), wallet)
                .resolves(expectedTx);
            stubbedNullSettlement.settleNull
                .withArgs(wallet, currency.ct, currency.id)
                .resolves(expectedTx);

            const txs = await settlement.settle(currency.ct, currency.id, wallet);
            expect(JSON.parse(JSON.stringify(txs))).to.deep.equal([
                {tx: fakeTxReceipt, type: 'payment-driip', intendedStageAmount: stageAmountOne.toJSON()},
                {tx: fakeTxReceipt, type: 'null', intendedStageAmount: stageAmountTwo.toJSON()}
            ]);
        });
        it('should not settle if there are no settleable challenges', async () => {
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves({settleableChallenges: []});

            const txs = await settlement.settle(currency.ct, currency.id, wallet);
            expect(txs).to.deep.equal([]);
        });
        it('show reformat exception when tx is sent and failed to be confirmed', () => {
            const stageAmount = MonetaryAmount.from('1', currency.ct, currency.id);
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves({settleableChallenges: [
                    {
                        type: 'payment-driip',
                        receipt: mockReceipt,
                        intendedStageAmount: stageAmount
                    }
                ]});
            stubbedDriipSettlement.settleDriipAsPayment
                .withArgs(Receipt.from(mockReceipt, wallet), wallet)
                .resolves(expectedTx);
            stubbedProvider.getTransactionConfirmation
                .withArgs(expectedTx.hash)
                .rejects(true);

            return settlement.settle(currency.ct, currency.id, wallet).catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                const regex = new RegExp( `sent.*payment.*failed.*${expectedTx.hash}`, 'i' );
                expect(e.innerError.message).to.match(regex);
            });
        });

        it('#settleBySettleableChallenge should rethrow exception', () => {
            return settlement.settleBySettleableChallenge({}, wallet).catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                expect(e.innerError).not.be.undefined;
            });
        });
    });
    describe('#getMaxChallengesTimeout', () => {
        let stubbedGetOngoingChallenges;
        beforeEach(() => {
            stubbedGetOngoingChallenges = sinon.stub(settlement, 'getOngoingChallenges');
        });
        afterEach(() => {
            settlement.getOngoingChallenges.restore();
        });
        it('should return the max expiration time from ongoing challenges', async () => {
            stubbedGetOngoingChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves([
                    {expirationTime: 1},
                    {expirationTime: 2}
                ]);
            const time = await settlement.getMaxChallengesTimeout(wallet.address, currency.ct, currency.id);
            expect(time).to.equal(2);
        });
        it('should return null when there is no ongoing challenges', async () => {
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
