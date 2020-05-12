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
    let wallet, currency, tokenInfo;
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
        tokenInfo = {
            decimals: 15
        };
    });

    beforeEach(() => {
        stubbedProvider = {
            getTokenInfo: sinon.stub().returns(tokenInfo)
        };
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
        let firstAccrual;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            firstAccrual = 0;
            stubbedTokenHolderRevenueFundContractEnsemble.closedAccrualsCount
                .resolves(4);
            stubbedTokenHolderRevenueFundContractEnsemble.fullyClaimed
                .withArgs(wallet, currency, firstAccrual)
                .resolves(false)
                .withArgs(wallet, currency, firstAccrual + 1)
                .resolves(true)
                .withArgs(wallet, currency, firstAccrual + 2)
                .resolves(false)
                .withArgs(wallet, currency, firstAccrual + 3)
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
        let firstAccrual, lastAccrual;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            firstAccrual = 1;
            lastAccrual = 2;
            stubbedTokenHolderRevenueFundContractEnsemble.claimableAmountByAccruals
                .withArgs(wallet, currency, firstAccrual, lastAccrual)
                .resolves(ethers.utils.parseUnits('1000', tokenInfo.decimals));
        });

        describe('when token info exists', () => {
            it('should return the formatted fees claimable by accruals', async () => {
                (await feesClaimant.claimableFeesForAccruals(wallet, currency, firstAccrual, lastAccrual))
                    .should.equal('1000.0');
            });
        });

        describe('when token info does not exist', () => {
            beforeEach(() => {
                stubbedProvider.getTokenInfo.reset();
            });

            it('should return the raw fees claimable by accruals', async () => {
                (await feesClaimant.claimableFeesForAccruals(wallet, currency, firstAccrual, lastAccrual))
                    .should.equal('1000000000000000000');
            });
        });
    });

    describe('claimFeesForAccruals()', () => {
        let firstAccrual, lastAccrual, options;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            firstAccrual = 1;
            lastAccrual = 2;
            options = {};
        });

        describe('when ensemble claim and stage succeeds', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContractEnsemble.claimAndStageByAccruals
                    .withArgs(wallet, currency, firstAccrual, lastAccrual, options)
                    .returns(ethers.constants.HashZero);
            });

            it('should return the fees claimable by accruals', async () => {
                (await feesClaimant.claimFeesForAccruals(wallet, currency, firstAccrual, lastAccrual, options))
                    .should.equal(ethers.constants.HashZero);
            });
        });

        describe('when ensemble claim and stage throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContractEnsemble.claimAndStageByAccruals
                    .withArgs(wallet, currency, firstAccrual, lastAccrual, options)
                    .throws();
            });

            it('should reject', async () => {
                await feesClaimant.claimFeesForAccruals(wallet, currency, firstAccrual, lastAccrual, options)
                    .should.be.rejectedWith(NestedError, 'Unable to claim fees for accruals.');
            });
        });
    });

    describe('claimableFeesForBlocks()', () => {
        let firstBlock, lastBlock;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            firstBlock = 1000000;
            lastBlock = 2000000;
            stubbedTokenHolderRevenueFundContractEnsemble.claimableAmountByBlockNumbers
                .withArgs(wallet, currency, firstBlock, lastBlock)
                .resolves(ethers.utils.parseUnits('1000', tokenInfo.decimals));
        });

        describe('when token info exists', () => {
            it('should return the formatted fees claimable by blocks', async () => {
                (await feesClaimant.claimableFeesForBlocks(wallet, currency, firstBlock, lastBlock))
                    .should.equal('1000.0');
            });
        });

        describe('when token info does not exist', () => {
            beforeEach(() => {
                stubbedProvider.getTokenInfo.reset();
            });

            it('should return the raw fees claimable by blocks', async () => {
                (await feesClaimant.claimableFeesForBlocks(wallet, currency, firstBlock, lastBlock))
                    .should.equal('1000000000000000000');
            });
        });
    });

    describe('claimFeesForBlocks()', () => {
        let firstBlock, lastBlock, options;

        beforeEach(() => {
            feesClaimant = new FeesClaimant(stubbedProvider);
            firstBlock = 1000000;
            lastBlock = 2000000;
            options = {};
        });

        describe('when ensemble claim and stage succeeds', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContractEnsemble.claimAndStageByBlockNumbers
                    .withArgs(wallet, currency, firstBlock, lastBlock, options)
                    .returns(ethers.constants.HashZero);
            });

            it('should return the fees claimable by blocks', async () => {
                (await feesClaimant.claimFeesForBlocks(wallet, currency, firstBlock, lastBlock, options))
                    .should.equal(ethers.constants.HashZero);
            });
        });

        describe('when ensemble claim and stage throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContractEnsemble.claimAndStageByBlockNumbers
                    .withArgs(wallet, currency, firstBlock, lastBlock, options)
                    .throws(new Error('Unable to claim and stage for blocks numbers'));
            });

            it('should reject', async () => {
                await feesClaimant.claimFeesForBlocks(wallet, currency, firstBlock, lastBlock, options)
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
                .resolves(ethers.utils.parseUnits('1000', tokenInfo.decimals));
        });

        describe('when token info exists', () => {
            it('should return the formatted withdrawable amount', async () => {
                (await feesClaimant.withdrawableFees(wallet, currency))
                    .should.equal('1000.0');
            });
        });

        describe('when token info does not exist', () => {
            beforeEach(() => {
                stubbedProvider.getTokenInfo.reset();
            });

            it('should return the raw fees claimable by blocks', async () => {
                (await feesClaimant.withdrawableFees(wallet, currency))
                    .should.equal('1000000000000000000');
            });
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