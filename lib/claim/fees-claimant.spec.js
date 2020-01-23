'use strict';

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const sinon = require('sinon');
const chai = require('chai');
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));
const ethers = require('ethers');
const {EthereumAddress} = require('nahmii-ethereum-address');
const MonetaryAmount = require('../monetary-amount');
const Currency = require('../currency');
const NestedError = require('../nested-error');

const stubbedProvider = {};
const stubbedTokenHolderRevenueFund = {};
const stubbedTokenHolderRevenueFundContract = sinon.stub()
    .withArgs(stubbedProvider)
    .returns(stubbedTokenHolderRevenueFund);

const FeesClaimant = proxyquire('./fees-claimant', {
    './token-holder-revenue-fund-contract': stubbedTokenHolderRevenueFundContract
});

describe('Fees claimant', () => {
    let wallet, currency;

    before(() => {
        wallet = EthereumAddress.from('0x0000000000000000000000000000000000000001');
        currency = Currency.from({
            ct: EthereumAddress.from('0x0000000000000000000000000000000000000002'),
            id: 0
        });
    });

    describe('when instantiating', () => {
        it('succeeds', () => {
            new FeesClaimant(stubbedProvider);
        });
    });

    describe('claimableFeesForAccruals()', () => {
        let feesClaimant, startAccrual, endAccrual;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            startAccrual = 1;
            endAccrual = 2;
            stubbedTokenHolderRevenueFund.claimableAmountByAccruals = sinon.stub()
                .withArgs(wallet.address, currency.ct.toString(), currency.id, startAccrual, endAccrual)
                .resolves(1000);
        });

        it('should return the fees claimable by accruals', async () => {
            (await feesClaimant.claimableFeesForAccruals(wallet, currency, startAccrual, endAccrual))
                .should.equal(1000);
        });
    });

    describe('claimFeesForAccruals()', () => {
        let feesClaimant, startAccrual, endAccrual, options;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            startAccrual = 1;
            endAccrual = 2;
            options = {};
        });

        describe('when claim and stage succeeds', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFund.connect = sinon.stub()
                    .withArgs(wallet)
                    .returns(stubbedTokenHolderRevenueFund);
                stubbedTokenHolderRevenueFund.claimAndStageByAccruals = sinon.stub()
                    .withArgs(currency.ct.toString(), currency.id, startAccrual, endAccrual, options)
                    .returns(ethers.constants.HashZero);
            });

            it('should return the fees claimable by accruals', async () => {
                (await feesClaimant.claimFeesForAccruals(wallet, currency, startAccrual, endAccrual, options))
                    .should.equal(ethers.constants.HashZero);
            });
        });

        describe('when connect throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFund.connect = sinon.stub()
                    .withArgs(wallet)
                    .throws(new Error('Unable to connect'));
                stubbedTokenHolderRevenueFund.claimAndStageByAccruals = sinon.stub()
                    .withArgs(currency.ct.toString(), currency.id, startAccrual, endAccrual, options)
                    .returns(ethers.constants.HashZero);
            });

            it('should reject', async () => {
                await feesClaimant.claimFeesForAccruals(wallet, currency, startAccrual, endAccrual, options)
                    .should.be.rejectedWith(NestedError, 'Unable to claim fees for accruals.');
            });
        });

        describe('when claim and stage throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFund.connect = sinon.stub()
                    .withArgs(wallet)
                    .returns(stubbedTokenHolderRevenueFund);
                stubbedTokenHolderRevenueFund.claimAndStageByAccruals = sinon.stub()
                    .withArgs(currency.ct.toString(), currency.id, startAccrual, endAccrual, options)
                    .throws(new Error('Unable to claim and stage for accruals'));
            });

            it('should reject', async () => {
                await feesClaimant.claimFeesForAccruals(wallet, currency, startAccrual, endAccrual, options)
                    .should.be.rejectedWith(NestedError, 'Unable to claim fees for accruals.');
            });
        });
    });

    describe('claimableFeesForBlocks()', () => {
        let feesClaimant, startBlock, endBlock;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            startBlock = 1000000;
            endBlock = 2000000;
            stubbedTokenHolderRevenueFund.claimableAmountByBlockNumbers = sinon.stub()
                .withArgs(wallet.address, currency.ct.toString(), currency.id, startBlock, endBlock)
                .resolves(1000);
        });

        it('should return the fees claimable by blocks', async () => {
            (await feesClaimant.claimableFeesForBlocks(wallet, currency, startBlock, endBlock))
                .should.equal(1000);
        });
    });

    describe('claimFeesForBlocks()', () => {
        let feesClaimant, startBlock, endBlock, options;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            startBlock = 1000000;
            endBlock = 2000000;
            options = {};
        });

        describe('when claim and stage succeeds', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFund.connect = sinon.stub()
                    .withArgs(wallet)
                    .returns(stubbedTokenHolderRevenueFund);
                stubbedTokenHolderRevenueFund.claimAndStageByBlockNumbers = sinon.stub()
                    .withArgs(currency.ct.toString(), currency.id, startBlock, endBlock, options)
                    .returns(ethers.constants.HashZero);
            });

            it('should return the fees claimable by blocks', async () => {
                (await feesClaimant.claimFeesForBlocks(wallet, currency, startBlock, endBlock, options))
                    .should.equal(ethers.constants.HashZero);
            });
        });

        describe('when connect throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFund.connect = sinon.stub()
                    .withArgs(wallet)
                    .throws(new Error('Unable to connect'));
                stubbedTokenHolderRevenueFund.claimAndStageByBlockNumbers = sinon.stub()
                    .withArgs(currency.ct.toString(), currency.id, startBlock, endBlock, options)
                    .returns(ethers.constants.HashZero);
            });

            it('should reject', async () => {
                await feesClaimant.claimFeesForBlocks(wallet, currency, startBlock, endBlock, options)
                    .should.be.rejectedWith(NestedError, 'Unable to claim fees for blocks.');
            });
        });

        describe('when claim and stage throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFund.connect = sinon.stub()
                    .withArgs(wallet)
                    .returns(stubbedTokenHolderRevenueFund);
                stubbedTokenHolderRevenueFund.claimAndStageByBlockNumbers = sinon.stub()
                    .withArgs(currency.ct.toString(), currency.id, startBlock, endBlock, options)
                    .throws(new Error('Unable to claim and stage for blocks numbers'));
            });

            it('should reject', async () => {
                await feesClaimant.claimFeesForBlocks(wallet, currency, startBlock, endBlock, options)
                    .should.be.rejectedWith(NestedError, 'Unable to claim fees for blocks.');
            });
        });
    });

    describe('withdrawableFees()', () => {
        let feesClaimant;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            stubbedTokenHolderRevenueFund.stagedBalance = sinon.stub()
                .withArgs(wallet.address, currency.ct.toString(), currency.id)
                .resolves(1000);
        });

        it('should return the claimable amount by accruals', async () => {
            (await feesClaimant.withdrawableFees(wallet, currency))
                .should.equal(1000);
        });
    });

    describe('withdrawFees()', () => {
        let feesClaimant, monetaryAmount, options;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            monetaryAmount = MonetaryAmount.from({
                currency: {
                    ct: currency.ct,
                    id: 0
                },
                amount: 1000
            });
            options = {};
        });

        describe('when withdraw succeeds', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFund.connect = sinon.stub()
                    .withArgs(wallet)
                    .returns(stubbedTokenHolderRevenueFund);
                stubbedTokenHolderRevenueFund.withdraw = sinon.stub()
                    .withArgs(monetaryAmount.currency.ct.toString(), monetaryAmount.currency.id, options)
                    .returns(ethers.constants.HashZero);
            });

            it('should return the claimable amount by accruals', async () => {
                (await feesClaimant.withdrawFees(wallet, monetaryAmount, options))
                    .should.equal(ethers.constants.HashZero);
            });
        });

        describe('when connect throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFund.connect = sinon.stub()
                    .withArgs(wallet)
                    .throws(new Error('Unable to connect'));
                stubbedTokenHolderRevenueFund.withdraw = sinon.stub()
                    .withArgs(monetaryAmount.currency.ct.toString(), monetaryAmount.currency.id, options)
                    .returns(ethers.constants.HashZero);
            });

            it('should reject', async () => {
                await feesClaimant.withdrawFees(wallet, monetaryAmount, options)
                    .should.be.rejectedWith(NestedError, 'Unable to withdraw fees.');
            });
        });

        describe('when withdraw throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFund.connect = sinon.stub()
                    .withArgs(wallet)
                    .returns(stubbedTokenHolderRevenueFund);
                stubbedTokenHolderRevenueFund.withdraw = sinon.stub()
                    .withArgs(monetaryAmount.currency.ct.toString(), monetaryAmount.currency.id, options)
                    .throws(new Error('Unable to withdraw'));
            });

            it('should reject', async () => {
                await feesClaimant.withdrawFees(wallet, monetaryAmount, options)
                    .should.be.rejectedWith(NestedError, 'Unable to withdraw fees.');
            });
        });
    });
});