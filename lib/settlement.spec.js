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
    getWalletReceipts: sinon.stub()
};

const stubbedClientFundContract = {
    address: 'client fund address'
};

const stubbedErc20Contract = {
    approve: sinon.stub()
};

const stubbedDriipSettlement = {
    getCurrentProposalNonce: sinon.stub(),
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
    checkStartChallenge: sinon.stub()
};

function proxyquireWallet() {
    return proxyquire('./wallet', {
        './client-fund-contract': function() {
            return stubbedClientFundContract;
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
        stubbedDriipSettlement.checkSettleDriipAsPayment.reset();
        stubbedDriipSettlement.startChallengeFromPayment.reset();
        stubbedDriipSettlement.settleDriipAsPayment.reset();
        stubbedDriipSettlement.getCurrentProposalExpirationTime.reset();
        stubbedDriipSettlement.checkStartChallengeFromPayment.reset();
        stubbedNullSettlement.checkSettleNull.reset();
        stubbedNullSettlement.startChallenge.reset();
        stubbedNullSettlement.settleNull.reset();
        stubbedNullSettlement.getCurrentProposalExpirationTime.reset();
        stubbedNullSettlement.checkStartChallenge.reset();
        stubbedProvider.getNahmiiBalances.reset();
    });

    describe('#getRequiredChallengesForIntendedStageAmount', () => {
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
            }
        ].forEach(t => {
            it(t.describe, async () => {
                const stageAmount = ethers.utils.bigNumberify(t.stageAmount);
                const stageMonetaryAmount = new MonetaryAmount(stageAmount, currency.ct, currency.id);
        
                const requiredChallenges = await settlement.getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, t.receipt, t.walletAddress);
                const actualRequiredChallenges = JSON.parse(JSON.stringify(requiredChallenges));
                const expectedRequiredChallenges = JSON.parse(JSON.stringify(t.expect));
                expect(actualRequiredChallenges).to.deep.equal(expectedRequiredChallenges);
            });
        });
    });
    describe('#checkStartChallengeFromPayment', () => {
        [
            {
                null: {allow: true}, 
                driip: {allow: true},
                receipt: mockReceipt,
                allow: true
            },
            {
                null: {allow: false}, 
                driip: {allow: true},
                receipt: mockReceipt,
                allow: false
            },
            {
                null: {allow: true}, 
                driip: {allow: false},
                receipt: mockReceipt,
                allow: false
            },
            {
                null: {allow: false}, 
                driip: {allow: false},
                receipt: mockReceipt,
                allow: false
            },
            {
                null: {allow: true}, 
                driip: {allow: false},
                allow: true
            }
        ].forEach(t => {
            it(`should not allow new challenge when allowed driip challenge: ${t.driip.allow}, null challenge: ${t.null.allow}, provided receipt: ${t.receipt? true: false}`, async () => {
                const stageMonetaryAmount = new MonetaryAmount('100', currency.ct, currency.id);
                const checkDriip = stubbedDriipSettlement.checkStartChallengeFromPayment
                    .withArgs(t.receipt, wallet.address);
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
                expect(allowed).to.equal(t.allow);
            });
        });
    });
    describe('#getSettleableChallenges', () => {
        it('should return driip settlement as a settleable challenge', async () => {
            stubbedDriipSettlement.getCurrentProposalNonce
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(ethers.utils.bigNumberify(mockReceipt.nonce));
            stubbedDriipSettlement.checkSettleDriipAsPayment
                .withArgs(Receipt.from(stubbedProvider, mockReceipt), mockReceipt.sender.wallet)
                .resolves(true);
            stubbedNullSettlement.checkSettleNull
                .rejects(new Error());
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet, null, 1000)
                .resolves([mockReceipt]);
            
            const settleableChallenges = await settlement.getSettleableChallenges(mockReceipt.sender.wallet, currency.ct, currency.id);
            expect(settleableChallenges.length).to.equal(1);
            expect(settleableChallenges[0].type).to.equal('payment-driip');
            expect(settleableChallenges[0].receipt).to.deep.equal(mockReceipt);
        });
        it('should return null settlement as a settleable challenge', async () => {
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet, null, 1000)
                .resolves([mockReceipt]);
            stubbedDriipSettlement.checkSettleDriipAsPayment
                .withArgs(Receipt.from(stubbedProvider, mockReceipt), mockReceipt.sender.wallet)
                .rejects(new Error());
            stubbedNullSettlement.checkSettleNull
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(true);
            
            const settleableChallenges = await settlement.getSettleableChallenges(mockReceipt.sender.wallet, currency.ct, currency.id);
            expect(settleableChallenges.length).to.equal(1);
            expect(settleableChallenges[0].type).to.equal('null');
        });
        it('should return both null and driip settlements as settleable challenges', async () => {
            stubbedProvider.getWalletReceipts
                .withArgs(mockReceipt.sender.wallet, null, 1000)
                .resolves([mockReceipt]);
            stubbedDriipSettlement.getCurrentProposalNonce
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(ethers.utils.bigNumberify(mockReceipt.nonce));
            stubbedDriipSettlement.checkSettleDriipAsPayment
                .withArgs(Receipt.from(stubbedProvider, mockReceipt), mockReceipt.sender.wallet)
                .resolves(true);
            stubbedNullSettlement.checkSettleNull
                .withArgs(mockReceipt.sender.wallet, currency.ct, currency.id)
                .resolves(true);
            
            const settleableChallenges = await settlement.getSettleableChallenges(mockReceipt.sender.wallet, currency.ct, currency.id);
            expect(settleableChallenges).to.deep.equal([
                {
                    type: 'payment-driip',
                    receipt: mockReceipt
                },
                {
                    type: 'null'
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
    describe('#getMaxCurrentExpirationTime', () => {
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
                expect: 200 * 1000
            },
            {
                driipExpirationTime: ethers.utils.bigNumberify(200),
                nullExpirationTime: ethers.utils.bigNumberify(100),
                expect: 200 * 1000
            },
            {
                driipExpirationTime: null,
                nullExpirationTime: ethers.utils.bigNumberify(100),
                expect: 100 * 1000
            },
            {
                driipExpirationTime: ethers.utils.bigNumberify(100),
                nullExpirationTime: null,
                expect: 100 * 1000
            },
            {
                driipExpirationTime: null,
                nullExpirationTime: null,
                expect: 1
            }
        ].forEach(t => {
            it(`when driip expiration time is ${t.driipExpirationTime ? t.driipExpirationTime.toNumber() : null} and null expiration time is ${t.nullExpirationTime ? t.nullExpirationTime.toNumber(): null}`, async () => {
                stubbedDriipSettlement.getCurrentProposalExpirationTime
                    .withArgs(wallet.address, currency.ct, currency.id)
                    .resolves(t.driipExpirationTime);
                stubbedNullSettlement.getCurrentProposalExpirationTime
                    .withArgs(wallet.address, currency.ct, currency.id)
                    .resolves(t.nullExpirationTime);
                const endtime = await settlement.getMaxCurrentExpirationTime(wallet.address, currency.ct, currency.id);
                expect(endtime).to.equal(t.expect);
            });
        });
    });
    describe('#startChallenge', () => {
        beforeEach(() => {
            settlement.getRequiredChallengesForIntendedStageAmount = sinon.stub();
        });
        afterEach(() => {
            settlement.getRequiredChallengesForIntendedStageAmount.reset();
        });
        it('should start driip settlement challenge', async () => {
            const expectedTx = {};
            const stageAmount = new MonetaryAmount(mockReceipt.amount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(wallet.address, null, 1000)
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
                .withArgs(Receipt.from(wallet, mockReceipt), stageAmount, wallet)
                .resolves(expectedTx);
            
            const txs = await settlement.startChallenge(stageAmount, wallet);
            expect(txs).to.deep.equal([{tx: expectedTx, type: 'payment-driip'}]);
        });
        it('should start null settlement challenge', async () => {
            const expectedTx = {};
            const stageAmount = new MonetaryAmount(mockReceipt.amount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(wallet.address, null, 1000)
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
            expect(txs).to.deep.equal([{tx: expectedTx, type: 'null'}]);
        });
        it('should start both null and driip settlement challenges', async () => {
            const expectedTx = {};
            const stageAmount = new MonetaryAmount(mockReceipt.amount, currency.ct, currency.id);
            stubbedProvider.getWalletReceipts
                .withArgs(wallet.address, null, 1000)
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
                .withArgs(Receipt.from(wallet, mockReceipt), stageAmount, wallet)
                .resolves(expectedTx);
            
            const txs = await settlement.startChallenge(stageAmount, wallet);
            expect(txs).to.deep.equal([
                {tx: expectedTx, type: 'null'},
                {tx: expectedTx, type: 'payment-driip'}
            ]);
        });
        it('should not start any challenges when the conditions are not allowed', async () => {
            const stageAmount = new MonetaryAmount(mockReceipt.amount, currency.ct, currency.id);
            settlement.getRequiredChallengesForIntendedStageAmount
                .resolves([]);
            
            const txs = await settlement.startChallenge(stageAmount, wallet);
            expect(txs).to.deep.equal([]);
        });
    });
    describe('#settle', () => {
        beforeEach(() => {
            settlement.getSettleableChallenges = sinon.stub();
        });
        afterEach(() => {
            settlement.getSettleableChallenges.reset();
        });
        it('should settle a driip', async () => {
            const expectedTx = {};
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves([
                    {
                        type: 'payment-driip',
                        receipt: mockReceipt
                    }
                ]);
            stubbedDriipSettlement.settleDriipAsPayment
                .withArgs(Receipt.from(wallet, mockReceipt), wallet)
                .resolves(expectedTx);
            
            const txs = await settlement.settle(currency.ct, currency.id, wallet);
            expect(txs).to.deep.equal([{tx: expectedTx, type: 'payment-driip'}]);
        });
        it('should settle a null', async () => {
            const expectedTx = {};
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves([
                    {
                        type: 'null'
                    }
                ]);
            stubbedNullSettlement.settleNull
                .withArgs(wallet, currency.ct, currency.id)
                .resolves(expectedTx);
            
            const txs = await settlement.settle(currency.ct, currency.id, wallet);
            expect(txs).to.deep.equal([{tx: expectedTx, type: 'null'}]);
        });
        it('should settle both a driip and a null', async () => {
            const expectedTx = {};
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves([
                    {
                        type: 'payment-driip',
                        receipt: mockReceipt
                    },
                    {
                        type: 'null'
                    }
                ]);
            stubbedDriipSettlement.settleDriipAsPayment
                .withArgs(Receipt.from(wallet, mockReceipt), wallet)
                .resolves(expectedTx);
            stubbedNullSettlement.settleNull
                .withArgs(wallet, currency.ct, currency.id)
                .resolves(expectedTx);
            
            const txs = await settlement.settle(currency.ct, currency.id, wallet);
            expect(txs).to.deep.equal([
                {tx: expectedTx, type: 'payment-driip'},
                {tx: expectedTx, type: 'null'}
            ]);
        });
        it('should not settle if there are no settleable challenges', async () => {
            settlement.getSettleableChallenges
                .withArgs(wallet.address, currency.ct, currency.id)
                .resolves([]);
            
            const txs = await settlement.settle(currency.ct, currency.id, wallet);
            expect(txs).to.deep.equal([]);
        });
    });
});
