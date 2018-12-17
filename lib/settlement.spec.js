'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');
const Receipt = require('./receipt');
const MonetaryAmount = require('./monetary-amount');

const privateKey = '0x' + '0F'.repeat(32);

const stubbedProvider = {
    getNahmiiBalances: sinon.stub(),
    getWalletReceipts: sinon.stub(),
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
    checkStartChallengeFromPayment: sinon.stub()
};

const stubbedNullSettlement = {
    checkSettleNull: sinon.stub(),
    startChallenge: sinon.stub(),
    settleNull: sinon.stub(),
    getCurrentProposalExpirationTime: sinon.stub(),
    getCurrentProposalStageAmount: sinon.stub(),
    checkStartChallenge: sinon.stub()
};

function proxyquireWallet() {
    return proxyquire('./wallet', {
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


describe('Settlement', () => {

    const currency = {
        ct: '0x0000000000000000000000000000000000000000',
        id: 0
    };
    const Wallet = proxyquireWallet();
    const Settlement = proxyquireSettlement();
    const settlement = new Settlement(stubbedProvider);
    const wallet = new Wallet(privateKey, stubbedProvider);
    const mockReceipt = {
        nonce: 1,
        amount: 100,
        currency,
        sender: {
            wallet: wallet.address,
            balances: {
                current: 200
            }
        },
        recipient: {
            wallet: '0x2'
        }
    };

    afterEach(() => {
        stubbedDriipSettlement.getCurrentProposalNonce.reset();
        stubbedDriipSettlement.getCurrentProposalStageAmount.reset();
        stubbedDriipSettlement.checkSettleDriipAsPayment.reset();
        stubbedDriipSettlement.startChallengeFromPayment.reset();
        stubbedDriipSettlement.settleDriipAsPayment.reset();
        stubbedDriipSettlement.getCurrentProposalExpirationTime.reset();
        stubbedDriipSettlement.checkStartChallengeFromPayment.reset();
        stubbedNullSettlement.checkSettleNull.reset();
        stubbedNullSettlement.startChallenge.reset();
        stubbedNullSettlement.settleNull.reset();
        stubbedNullSettlement.getCurrentProposalExpirationTime.reset();
        stubbedNullSettlement.getCurrentProposalStageAmount.reset();
        stubbedNullSettlement.checkStartChallenge.reset();
        stubbedProvider.getNahmiiBalances.reset();
        stubbedProvider.getTransactionConfirmation.reset();
    });

    describe('#getRequiredChallengesForIntendedStageAmount', () => {
        afterEach(() => {
            settlement.checkStartChallenge.restore();
        });
        [
            {
                describe: 'should return driip settlement as an required challenge',
                stageAmount: 100,
                receipt: mockReceipt,
                walletAddress: mockReceipt.sender.wallet,
                expect: [
                    {
                        type: 'payment-driip',
                        receipt: mockReceipt,
                        stageMonetaryAmount: new MonetaryAmount(100, currency.ct, currency.id)
                    }
                ]
            },
            {
                describe: 'should return null settlement as an required challenge',
                stageAmount: 100,
                receipt: null,
                notAllowNewDriipChallenge: true,
                walletAddress: mockReceipt.sender.wallet,
                expect: [
                    {
                        type: 'null',
                        stageMonetaryAmount: new MonetaryAmount(100, currency.ct, currency.id)
                    }
                ]
            },
            {
                describe: 'should return both null and driip settlements as required challenges',
                stageAmount: 300,
                receipt: mockReceipt,
                walletAddress: mockReceipt.sender.wallet,
                expect: [
                    {
                        type: 'payment-driip',
                        receipt: mockReceipt,
                        stageMonetaryAmount: new MonetaryAmount(mockReceipt.sender.balances.current, currency.ct, currency.id)
                    },
                    {
                        type: 'null',
                        stageMonetaryAmount: new MonetaryAmount(300 - mockReceipt.sender.balances.current, currency.ct, currency.id)
                    }
                ]
            },
            {
                describe: 'should return null settlement if can not start driip challenge',
                stageAmount: 300,
                receipt: null,
                walletAddress: mockReceipt.sender.wallet,
                notAllowNewDriipChallenge: true,
                expect: [
                    {
                        type: 'null',
                        stageMonetaryAmount: new MonetaryAmount(300, currency.ct, currency.id)
                    }
                ]
            },
            {
                describe: 'should return driip settlement if can not start null challenge',
                stageAmount: 300,
                receipt: mockReceipt,
                walletAddress: mockReceipt.sender.wallet,
                notAllowNewNullChallenge: true,
                expect: [
                    {
                        type: 'payment-driip',
                        stageMonetaryAmount: new MonetaryAmount(300, currency.ct, currency.id),
                        receipt: mockReceipt
                    }
                ]
            },
            {
                describe: 'should return empty array if both settlement types are not allowed to start new challenges',
                stageAmount: 300,
                receipt: mockReceipt,
                walletAddress: mockReceipt.sender.wallet,
                notAllowNewDriipChallenge: true,
                notAllowNewNullChallenge: true,
                expect: []
            }
        ].forEach(t => {
            it(t.describe, async () => {
                const allowedChallenges = [];
                if (!t.notAllowNewDriipChallenge)
                    allowedChallenges.push('payment-driip');

                if (!t.notAllowNewNullChallenge)
                    allowedChallenges.push('null');


                // settlement.checkStartChallenge = sinon.stub();
                sinon.stub(settlement, 'checkStartChallenge')
                    .withArgs(new MonetaryAmount(t.stageAmount, currency.ct, currency.id), t.receipt, wallet.address)
                    .resolves(allowedChallenges);

                const stageAmount = ethers.utils.bigNumberify(t.stageAmount);
                const stageMonetaryAmount = new MonetaryAmount(stageAmount, currency.ct, currency.id);

                const requiredChallenges = await settlement.getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, t.receipt, t.walletAddress);
                const actualRequiredChallenges = JSON.parse(JSON.stringify(requiredChallenges));
                const expectedRequiredChallenges = JSON.parse(JSON.stringify(t.expect));
                expect(actualRequiredChallenges).to.deep.equal(expectedRequiredChallenges);
            });
        });
    });
    describe('#checkStartChallenge', () => {
        [
            {
                null: {allow: true},
                driip: {allow: true},
                receipt: mockReceipt,
                allow: ['payment-driip', 'null']
            },
            {
                null: {allow: false},
                driip: {allow: true},
                receipt: mockReceipt,
                allow: ['payment-driip']
            },
            {
                null: {allow: true},
                driip: {allow: false},
                receipt: mockReceipt,
                allow: ['null']
            },
            {
                null: {allow: false},
                driip: {allow: false},
                receipt: mockReceipt,
                allow: []
            },
            {
                null: {allow: true},
                driip: {allow: false},
                receipt: mockReceipt,
                allow: ['null']
            }
        ].forEach(t => {
            it(`should not allow new challenge when allowed driip challenge: ${t.driip.allow}, null challenge: ${t.null.allow}, provided receipt: ${t.receipt? true: false}`, async () => {
                const stageMonetaryAmount = new MonetaryAmount('100', currency.ct, currency.id);
                const checkDriip = stubbedDriipSettlement.checkStartChallengeFromPayment
                    .withArgs(Receipt.from(t.receipt, stubbedProvider), wallet.address);
                const checkNull = stubbedNullSettlement.checkStartChallenge
                    .withArgs(stageMonetaryAmount, wallet.address);

                if (t.driip.allow)
                    checkDriip.resolves(true);
                else
                    checkDriip.rejects(true);

                if (t.null.allow)
                    checkNull.resolves(true);
                else
                    checkNull.rejects(true);

                const allowed = await settlement.checkStartChallenge(stageMonetaryAmount, t.receipt, wallet.address);
                expect(allowed).to.deep.equal(t.allow);
            });
        });
    });
    describe('#getSettleableChallenges', () => {
        it('should return driip settlement as a settleable challenge', async () => {
            const stageAmount = ethers.utils.bigNumberify(1);
            stubbedDriipSettlement.getCurrentProposalNonce
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(ethers.utils.bigNumberify(mockReceipt.nonce));
            stubbedDriipSettlement.getCurrentProposalStageAmount
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(stageAmount);
            stubbedDriipSettlement.checkSettleDriipAsPayment
                .withArgs(Receipt.from(mockReceipt, stubbedProvider), mockReceipt.sender.wallet)
                .resolves(true);
            stubbedNullSettlement.checkSettleNull
                .rejects(new Error());
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet, mockReceipt.nonce, 1)
                .resolves([mockReceipt]);

            const settleableChallenges = await settlement.getSettleableChallenges(mockReceipt.sender.wallet, currency.ct, currency.id);
            expect(settleableChallenges.length).to.equal(1);
            expect(settleableChallenges[0].type).to.equal('payment-driip');
            expect(settleableChallenges[0].receipt).to.deep.equal(mockReceipt);
            expect(settleableChallenges[0].intendedStageAmount.toJSON()).to.deep.equal(new MonetaryAmount(stageAmount, currency.ct, currency.id).toJSON());
        });
        it('should return null settlement as a settleable challenge', async () => {
            const stageAmount = ethers.utils.bigNumberify(1);
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet, mockReceipt.nonce, 1)
                .resolves([mockReceipt]);
            stubbedDriipSettlement.checkSettleDriipAsPayment
                .withArgs(Receipt.from(mockReceipt, stubbedProvider), mockReceipt.sender.wallet)
                .rejects(new Error());
            stubbedNullSettlement.getCurrentProposalStageAmount
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(stageAmount);
            stubbedNullSettlement.checkSettleNull
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(true);

            const settleableChallenges = await settlement.getSettleableChallenges(mockReceipt.sender.wallet, currency.ct, currency.id);
            expect(settleableChallenges.length).to.equal(1);
            expect(settleableChallenges[0].type).to.equal('null');
            expect(settleableChallenges[0].intendedStageAmount.toJSON()).to.deep.equal(new MonetaryAmount(stageAmount, currency.ct, currency.id).toJSON());
        });
        it('should return both null and driip settlements as settleable challenges', async () => {
            const stageAmount = ethers.utils.bigNumberify(1);
            const stageMonetaryAmount = new MonetaryAmount(stageAmount, currency.ct, currency.id);
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
                .resolves(true);
            stubbedNullSettlement.getCurrentProposalStageAmount
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(stageAmount);
            stubbedNullSettlement.checkSettleNull
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(true);

            const settleableChallenges = await settlement.getSettleableChallenges(mockReceipt.sender.wallet, currency.ct, currency.id);
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
            stubbedDriipSettlement.checkSettleDriipAsPayment
                .rejects(new Error());
            stubbedNullSettlement.checkSettleNull
                .rejects(new Error());
            const settleableChallenges = await settlement.getSettleableChallenges(mockReceipt.sender.wallet, currency.ct, currency.id);
            expect(settleableChallenges).to.deep.equal([]);
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
                        intendedStageAmount: new MonetaryAmount(1, currency.ct, currency.id)
                    },
                    {
                        type: 'null',
                        expirationTime: 200 * 1000,
                        intendedStageAmount: new MonetaryAmount(2, currency.ct, currency.id)
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
                        intendedStageAmount: new MonetaryAmount(1, currency.ct, currency.id)
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
                        intendedStageAmount: new MonetaryAmount(1, currency.ct, currency.id)
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
            const stageAmount = new MonetaryAmount(mockReceipt.amount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(wallet.address, null, 100)
                .resolves([mockReceipt]);
            settlement.getRequiredChallengesForIntendedStageAmount
                .withArgs(stageAmount, mockReceipt, wallet.address)
                .resolves([
                    {
                        type: 'payment-driip',
                        stageMonetaryAmount: stageAmount,
                        receipt: mockReceipt
                    }
                ]);
            stubbedDriipSettlement.startChallengeFromPayment
                .withArgs(Receipt.from(mockReceipt, wallet), stageAmount, wallet)
                .resolves(expectedTx);

            const txs = await settlement.startChallenge(stageAmount, wallet);
            expect(JSON.parse(JSON.stringify(txs))).to.deep.equal([{tx: fakeTxReceipt, type: 'payment-driip', intendedStageAmount: stageAmount.toJSON()}]);
        });
        it('should start null settlement challenge', async () => {
            const stageAmount = new MonetaryAmount(mockReceipt.amount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(wallet.address, null, 100)
                .resolves([mockReceipt]);
            settlement.getRequiredChallengesForIntendedStageAmount
                .withArgs(stageAmount, mockReceipt, wallet.address)
                .resolves([
                    {
                        type: 'null',
                        stageMonetaryAmount: stageAmount
                    }
                ]);
            stubbedNullSettlement.startChallenge
                .withArgs(wallet, stageAmount)
                .resolves(expectedTx);

            const txs = await settlement.startChallenge(stageAmount, wallet);
            expect(JSON.parse(JSON.stringify(txs))).to.deep.equal([{tx: fakeTxReceipt, type: 'null', intendedStageAmount: stageAmount.toJSON()}]);
        });
        it('should start both null and driip settlement challenges', async () => {
            const stageAmount = new MonetaryAmount(mockReceipt.amount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(wallet.address, null, 100)
                .resolves([mockReceipt]);
            settlement.getRequiredChallengesForIntendedStageAmount
                .withArgs(stageAmount, mockReceipt, wallet.address)
                .resolves([
                    {
                        type: 'null',
                        stageMonetaryAmount: stageAmount
                    },
                    {
                        type: 'payment-driip',
                        stageMonetaryAmount: stageAmount,
                        receipt: mockReceipt
                    }
                ]);
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
            const stageAmount = new MonetaryAmount(mockReceipt.amount, currency.ct, currency.id);
            settlement.getRequiredChallengesForIntendedStageAmount
                .resolves([]);

            const txs = await settlement.startChallenge(stageAmount, wallet);
            expect(txs).to.deep.equal([]);
        });

        it('show reformat exception when tx is sent and failed to be confirmed', () => {
            const stageAmount = new MonetaryAmount(mockReceipt.amount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(wallet.address, null, 100)
                .resolves([mockReceipt]);
            settlement.getRequiredChallengesForIntendedStageAmount
                .withArgs(stageAmount, mockReceipt, wallet.address)
                .resolves([
                    {
                        type: 'payment-driip',
                        stageMonetaryAmount: stageAmount,
                        receipt: mockReceipt
                    }
                ]);
            stubbedDriipSettlement.startChallengeFromPayment
                .withArgs(Receipt.from(mockReceipt, wallet), stageAmount, wallet)
                .resolves(expectedTx);

            stubbedProvider.getTransactionConfirmation
                .withArgs(expectedTx.hash)
                .rejects(true);

            return settlement.startChallenge(stageAmount, wallet).catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                const regex = new RegExp( `sent.*payment.*failed.*${expectedTx.hash}`, 'i' );
                expect(e.message).to.match(regex);
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
            const stageAmount = new MonetaryAmount('1', currency.ct, currency.id);
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves([
                    {
                        type: 'payment-driip',
                        receipt: mockReceipt,
                        intendedStageAmount: stageAmount
                    }
                ]);
            stubbedDriipSettlement.settleDriipAsPayment
                .withArgs(Receipt.from(mockReceipt, wallet), wallet)
                .resolves(expectedTx);

            const txs = await settlement.settle(currency.ct, currency.id, wallet);
            expect(JSON.parse(JSON.stringify(txs))).to.deep.equal([{tx: fakeTxReceipt, type: 'payment-driip', intendedStageAmount: stageAmount.toJSON()}]);
        });
        it('should settle a null', async () => {
            const stageAmount = new MonetaryAmount('1', currency.ct, currency.id);
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves([
                    {
                        type: 'null',
                        intendedStageAmount: stageAmount
                    }
                ]);
            stubbedNullSettlement.settleNull
                .withArgs(wallet, currency.ct, currency.id)
                .resolves(expectedTx);

            const txs = await settlement.settle(currency.ct, currency.id, wallet);
            expect(JSON.parse(JSON.stringify(txs))).to.deep.equal([{tx: fakeTxReceipt, type: 'null', intendedStageAmount: stageAmount.toJSON()}]);
        });
        it('should settle both a driip and a null', async () => {
            const stageAmountOne = new MonetaryAmount('1', currency.ct, currency.id);
            const stageAmountTwo = new MonetaryAmount('2', currency.ct, currency.id);
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves([
                    {
                        type: 'payment-driip',
                        receipt: mockReceipt,
                        intendedStageAmount: stageAmountOne
                    },
                    {
                        type: 'null',
                        intendedStageAmount: stageAmountTwo
                    }
                ]);
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
                .resolves([]);

            const txs = await settlement.settle(currency.ct, currency.id, wallet);
            expect(txs).to.deep.equal([]);
        });
        it('show reformat exception when tx is sent and failed to be confirmed', () => {
            const stageAmount = new MonetaryAmount('1', currency.ct, currency.id);
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves([
                    {
                        type: 'payment-driip',
                        receipt: mockReceipt,
                        intendedStageAmount: stageAmount
                    }
                ]);
            stubbedDriipSettlement.settleDriipAsPayment
                .withArgs(Receipt.from(mockReceipt, wallet), wallet)
                .resolves(expectedTx);
            stubbedProvider.getTransactionConfirmation
                .withArgs(expectedTx.hash)
                .rejects(true);

            return settlement.settle(currency.ct, currency.id, wallet).catch(e => {
                expect(e).to.be.an.instanceOf(Error);
                const regex = new RegExp( `sent.*payment.*failed.*${expectedTx.hash}`, 'i' );
                expect(e.message).to.match(regex);
            });
        });
    });
});
