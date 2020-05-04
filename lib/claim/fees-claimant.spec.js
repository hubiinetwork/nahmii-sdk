'use strict';

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const sinon = require('sinon');
const chai = require('chai');
const ethers = require('ethers');
const {EthereumAddress} = require('nahmii-ethereum-address');
const MonetaryAmount = require('../monetary-amount');
const Currency = require('../currency');
const NestedError = require('../nested-error');

chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));
chai.should();

describe('Fees claimant', () => {
    let wallet, currency;
    let stubbedProvider;
    let stubbedTokenHolderRevenueFundContractEnsembleConstructor;
    let stubbedTokenHolderRevenueFundContractEnsemble;
    let FeesClaimant;
    let feesClaimant;

    before(() => {
        wallet = EthereumAddress.from('0x0000000000000000000000000000000000000001');
        currency = Currency.from({
            ct: EthereumAddress.from('0x0000000000000000000000000000000000000002'),
            id: 0
        });
    });

    beforeEach(() => {
        stubbedProvider = {};
        stubbedTokenHolderRevenueFundContractEnsemble = {
            closedAccrualsCount: sinon.stub(),
            fullyClaimed: sinon.stub(),
            claimableAmountByAccruals: sinon.stub(),
            claimAndStageByAccruals: sinon.stub(),
            claimableAmountByBlockNumbers: sinon.stub(),
            claimAndStageByBlockNumbers: sinon.stub(),
            stagedBalance: sinon.stub(),
            withdraw: sinon.stub()
        };
        stubbedTokenHolderRevenueFundContractEnsembleConstructor = sinon.stub()
            .withArgs(stubbedProvider)
            .returns(stubbedTokenHolderRevenueFundContractEnsemble)
            .withArgs(stubbedProvider, ['abstraction1', 'abstraction2'])
            .returns(stubbedTokenHolderRevenueFundContractEnsemble);

        FeesClaimant = proxyquire('./fees-claimant', {
            './token-holder-revenue-fund-contracts-ensemble': stubbedTokenHolderRevenueFundContractEnsembleConstructor
        });
    });

    describe('when instantiating', () => {
        describe('if called without abstraction names', () => {
            it('succeeds', () => {
                new FeesClaimant(stubbedProvider);
                stubbedTokenHolderRevenueFundContractEnsembleConstructor
                    .should.have.been.calledWithExactly(stubbedProvider, undefined);
            });
        });

        describe('if called with abstraction names', () => {
            it('succeeds', () => {
                new FeesClaimant(stubbedProvider, ['abstraction1', 'abstraction2']);
                stubbedTokenHolderRevenueFundContractEnsembleConstructor
                    .should.have.been.calledWithExactly(stubbedProvider, ['abstraction1', 'abstraction2']);
            });
        });
    });

    describe('claimableAccruals()', () => {
        let startAccrual;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            startAccrual = 0;
            stubbedTokenHolderRevenueFundContractEnsemble.closedAccrualsCount
                .resolves(4);
            stubbedTokenHolderRevenueFundContractEnsemble.fullyClaimed
                .withArgs(wallet, currency, startAccrual)
                .resolves(false)
                .withArgs(wallet, currency, startAccrual + 1)
                .resolves(true)
                .withArgs(wallet, currency, startAccrual + 2)
                .resolves(false)
                .withArgs(wallet, currency, startAccrual + 3)
                .resolves(true);
        });

        describe('when providing range of accruals', () => {
            it('should return the accruals that are claimable in the limited range', async () => {
                (await feesClaimant.claimableAccruals(wallet, currency, 1, 2))
                    .should.deep.equal([2]);
            });
        });

        describe('when not providing range of accruals', () => {
            it('should return the accruals that are claimable in the extended range', async () => {
                (await feesClaimant.claimableAccruals(wallet, currency))
                    .should.deep.equal([0, 2]);
            });
        });
    });

    describe('claimableFeesForAccruals()', () => {
        let startAccrual, endAccrual;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            startAccrual = 1;
            endAccrual = 2;
            stubbedTokenHolderRevenueFundContractEnsemble.claimableAmountByAccruals
                .withArgs(wallet, currency, startAccrual, endAccrual)
                .resolves(1000);
        });

        it('should return the fees claimable by accruals', async () => {
            (await feesClaimant.claimableFeesForAccruals(wallet, currency, startAccrual, endAccrual))
                .should.equal(1000);
        });
    });

    describe('claimFeesForAccruals()', () => {
        let startAccrual, endAccrual, options;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            startAccrual = 1;
            endAccrual = 2;
            options = {};
        });

        describe('when ensemble claim and stage succeeds', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContractEnsemble.claimAndStageByAccruals
                    .withArgs(wallet, currency, startAccrual, endAccrual, options)
                    .returns(ethers.constants.HashZero);
            });

            it('should return the fees claimable by accruals', async () => {
                (await feesClaimant.claimFeesForAccruals(wallet, currency, startAccrual, endAccrual, options))
                    .should.equal(ethers.constants.HashZero);
            });
        });

        describe('when ensemble claim and stage throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContractEnsemble.claimAndStageByAccruals
                    .withArgs(wallet, currency, startAccrual, endAccrual, options)
                    .throws();
            });

            it('should reject', async () => {
                await feesClaimant.claimFeesForAccruals(wallet, currency, startAccrual, endAccrual, options)
                    .should.be.rejectedWith(NestedError, 'Unable to claim fees for accruals.');
            });
        });
    });

    describe('claimableFeesForBlocks()', () => {
        let startBlock, endBlock;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            startBlock = 1000000;
            endBlock = 2000000;
            stubbedTokenHolderRevenueFundContractEnsemble.claimableAmountByBlockNumbers
                .withArgs(wallet, currency, startBlock, endBlock)
                .resolves(1000);
        });

        it('should return the fees claimable by blocks', async () => {
            (await feesClaimant.claimableFeesForBlocks(wallet, currency, startBlock, endBlock))
                .should.equal(1000);
        });
    });

    describe('claimFeesForBlocks()', () => {
        let startBlock, endBlock, options;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            startBlock = 1000000;
            endBlock = 2000000;
            options = {};
        });

        describe('when ensemble claim and stage succeeds', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContractEnsemble.claimAndStageByBlockNumbers
                    .withArgs(wallet, currency, startBlock, endBlock, options)
                    .returns(ethers.constants.HashZero);
            });

            it('should return the fees claimable by blocks', async () => {
                (await feesClaimant.claimFeesForBlocks(wallet, currency, startBlock, endBlock, options))
                    .should.equal(ethers.constants.HashZero);
            });
        });

        describe('when ensemble claim and stage throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContractEnsemble.claimAndStageByBlockNumbers
                    .withArgs(wallet, currency, startBlock, endBlock, options)
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
            stubbedTokenHolderRevenueFundContractEnsemble.stagedBalance
                .withArgs(wallet, currency)
                .resolves(1000);
        });

        it('should return the claimable amount by accruals', async () => {
            (await feesClaimant.withdrawableFees(wallet, currency))
                .should.equal(1000);
        });
    });

    describe('withdrawFees()', () => {
        let monetaryAmount, options;

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
                stubbedTokenHolderRevenueFundContractEnsemble.withdraw
                    .withArgs(wallet, monetaryAmount, 'ERC20', options)
                    .returns(ethers.constants.HashZero);
            });

            it('should return the claimable amount by accruals', async () => {
                (await feesClaimant.withdrawFees(wallet, monetaryAmount, options))
                    .should.equal(ethers.constants.HashZero);
            });
        });

        describe('when withdraw throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContractEnsemble.withdraw
                    .withArgs(wallet, monetaryAmount, 'ERC20', options)
                    .throws(new Error('Unable to withdraw'));
            });

            it('should reject', async () => {
                await feesClaimant.withdrawFees(wallet, monetaryAmount, options)
                    .should.be.rejectedWith(NestedError, 'Unable to withdraw fees.');
            });
        });
    });
});