'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);
const {constants, utils} = require('ethers');
const MonetaryAmount = require('../monetary-amount');
const Currency = require('../currency');
const Wallet = require('../wallet');
const NestedError = require('../nested-error');

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const privateKey = '0x' + '0F'.repeat(32);
const hashZero = constants.HashZero;
const hashOne = hashZero.replace(/0$/, '1');

describe('TokenHolderRevenueFundContractsEnsemble', () => {
    const fakeProvider = {
        network: {
            chainId: '123456789',
            name: 'some network'
        }
    };

    let stubbedTokenHolderRevenueFundConstructor;
    let stubbedTokenHolderRevenueFundContract;
    let stubbedAccruals;
    let TokenHolderRevenueFundContractsEnsemble;
    let currency;
    let wallet;

    before(() => {
        currency = Currency.from({ct: constants.AddressZero, id: 0});
        wallet = new Wallet(privateKey);
    });

    beforeEach(() => {
        stubbedTokenHolderRevenueFundConstructor = sinon.stub();

        stubbedTokenHolderRevenueFundContract = {
            closedAccrualsCount: sinon.stub(),
            closedAccrualsByCurrency: sinon.stub(),
            fullyClaimed: sinon.stub(),
            claimableAmountByAccruals: sinon.stub(),
            claimAndStageByAccruals: sinon.stub(),
            claimableAmountByBlockNumbers: sinon.stub(),
            claimAndStageByBlockNumbers: sinon.stub(),
            stagedBalance: sinon.stub(),
            withdraw: sinon.stub(),
            connect: sinon.stub()
        };

        stubbedTokenHolderRevenueFundContract.connect.returns(stubbedTokenHolderRevenueFundContract);

        stubbedAccruals = [
            {
                startBlock: utils.bigNumberify(900001),
                endBlock: utils.bigNumberify(1000000)
            },
            {
                startBlock: utils.bigNumberify(1900001),
                endBlock: utils.bigNumberify(2000000)
            },
            {
                startBlock: utils.bigNumberify(2000001),
                endBlock: utils.bigNumberify(2100000)
            },
            {
                startBlock: utils.bigNumberify(5900001),
                endBlock: utils.bigNumberify(6000000)
            }
        ];

        stubbedTokenHolderRevenueFundContract.closedAccrualsCount
            .withArgs(currency.ct.toString(), currency.id)
            .onFirstCall()
            .returns(utils.bigNumberify(10))
            .onSecondCall()
            .returns(utils.bigNumberify(20));

        stubbedTokenHolderRevenueFundConstructor
            .withArgs(fakeProvider, 'TokenHolderRevenueFund')
            .returns(stubbedTokenHolderRevenueFundContract)
            .withArgs(fakeProvider, 'abstraction1')
            .returns(stubbedTokenHolderRevenueFundContract)
            .withArgs(fakeProvider, 'abstraction2')
            .returns(stubbedTokenHolderRevenueFundContract);

        TokenHolderRevenueFundContractsEnsemble = proxyquire('./token-holder-revenue-fund-contracts-ensemble', {
            './token-holder-revenue-fund-contract': stubbedTokenHolderRevenueFundConstructor
        });
    });

    describe('constructor', () => {
        describe('without abstractions names', () => {
            it('should successfully construct', () => {
                new TokenHolderRevenueFundContractsEnsemble(fakeProvider);
                expect(stubbedTokenHolderRevenueFundConstructor)
                    .to.have.been.calledWithNew.and
                    .to.have.been.calledOnce;
            });
        });

        describe('with abstractions names', () => {
            it('should successfully construct', () => {
                new TokenHolderRevenueFundContractsEnsemble(fakeProvider, ['abstraction1', 'abstraction2']);
                expect(stubbedTokenHolderRevenueFundConstructor)
                    .to.have.been.calledWithNew.and
                    .to.have.been.calledTwice;
            });
        });
    });

    describe('firstAccrualOffset', () => {
        let ensemble;

        describe('when constructed with default firstAccrualOffset parameter', () => {
            beforeEach(() => {
                ensemble = new TokenHolderRevenueFundContractsEnsemble(fakeProvider, ['abstraction1', 'abstraction2']);
            });

            it('should return 0', () => {
                expect(ensemble.firstAccrualOffset).to.be.eq(0);
            });
        });

        describe('when constructed with positive first accrual offset parameter', () => {
            beforeEach(() => {
                ensemble = new TokenHolderRevenueFundContractsEnsemble(fakeProvider, ['abstraction1', 'abstraction2'], 10);
            });

            it('should return the given parameter', () => {
                expect(ensemble.firstAccrualOffset).to.be.eq(10);
            });
        });
    });

    describe('closedAccrualsCount', () => {
        let ensemble;

        beforeEach(() => {
            ensemble = new TokenHolderRevenueFundContractsEnsemble(fakeProvider, ['abstraction1', 'abstraction2']);
        });

        it('should return the value obtained from the spans combined', async () => {
            expect((await ensemble.closedAccrualsCount(currency)).toNumber())
                .to.be.eq(30);
        });
    });

    describe('fullyClaimed()', () => {
        let ensemble;

        beforeEach(() => {
            stubbedTokenHolderRevenueFundContract.closedAccrualsByCurrency
                .withArgs(currency.ct.toString(), currency.id, 0)
                .returns(stubbedAccruals[0])
                .withArgs(currency.ct.toString(), currency.id, 9)
                .returns(stubbedAccruals[1])
                .withArgs(currency.ct.toString(), currency.id, 10)
                .returns(stubbedAccruals[2])
                .withArgs(currency.ct.toString(), currency.id, 29)
                .returns(stubbedAccruals[3]);

            ensemble = new TokenHolderRevenueFundContractsEnsemble(fakeProvider, ['abstraction1', 'abstraction2']);
        });

        describe('if the matching configuration contract not is fully claimed', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.fullyClaimed.returns(false);
            });

            it('should return false', async () => {
                expect(await ensemble.fullyClaimed(wallet, currency, 15)).to.be.false;
            });
        });

        describe('if the matching configuration contract is fully claimed', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.fullyClaimed.returns(true);
            });

            it('should return true', async () => {
                expect(await ensemble.fullyClaimed(wallet, currency, 15)).to.be.true;
            });
        });

        describe('if there is no matching configuration contract', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.fullyClaimed.reset();
                stubbedTokenHolderRevenueFundContract.fullyClaimed.throws();
            });

            it('should return false', async () => {
                expect(await ensemble.fullyClaimed(wallet, currency, 50)).to.be.false;
            });
        });
    });

    describe('claimableAmountByAccruals()', () => {
        let ensemble;

        beforeEach(() => {
            stubbedTokenHolderRevenueFundContract.closedAccrualsByCurrency
                .withArgs(currency.ct.toString(), currency.id, 10)
                .returns(stubbedAccruals[0])
                .withArgs(currency.ct.toString(), currency.id, 19)
                .returns(stubbedAccruals[1])
                .withArgs(currency.ct.toString(), currency.id, 20)
                .returns(stubbedAccruals[2])
                .withArgs(currency.ct.toString(), currency.id, 39)
                .returns(stubbedAccruals[3]);

            ensemble = new TokenHolderRevenueFundContractsEnsemble(
                fakeProvider, ['abstraction1', 'abstraction2'], 10
            );
        });

        describe('if first accrual is greater than last accrual', () => {
            it('should throw', async () => {
                expect(ensemble.claimableAmountByAccruals(wallet, currency, 15, 5))
                    .to.be.rejected;
            });
        });

        describe('if first accrual is greater than last accrual of last span', () => {
            it('should return 0', async () => {
                expect((await ensemble.claimableAmountByAccruals(wallet, currency, 50, 60)).toNumber())
                    .to.be.eq(0);
            });
        });

        describe('if last accrual is less than first accrual of first span', () => {
            it('should return 0', async () => {
                expect((await ensemble.claimableAmountByAccruals(wallet, currency, 5, 8)).toNumber())
                    .to.be.eq(0);
            });
        });

        describe('if accrual arguments entirely fall within the span of one span', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimableAmountByAccruals
                    .withArgs(wallet.address, currency.ct.toString(), currency.id, 12, 17)
                    .returns(utils.bigNumberify(10));
            });

            it('should return the value obtained from the span', async () => {
                expect((await ensemble.claimableAmountByAccruals(wallet, currency, 12, 17)).toNumber())
                    .to.be.eq(10);
            });
        });

        describe('if accrual arguments fall within the span of two spans', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimableAmountByAccruals
                    .withArgs(wallet.address, currency.ct.toString(), currency.id, 12, 19)
                    .returns(utils.bigNumberify(10));
                stubbedTokenHolderRevenueFundContract.claimableAmountByAccruals
                    .withArgs(wallet.address, currency.ct.toString(), currency.id, 20, 27)
                    .returns(utils.bigNumberify(20));
            });

            it('should return the value obtained from the spans combined', async () => {
                expect((await ensemble.claimableAmountByAccruals(wallet, currency, 12, 27)).toNumber())
                    .to.be.eq(30);
            });
        });

        describe('if accrual arguments wrap the span of two spans', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimableAmountByAccruals
                    .withArgs(wallet.address, currency.ct.toString(), currency.id, 10, 19)
                    .returns(utils.bigNumberify(10));
                stubbedTokenHolderRevenueFundContract.claimableAmountByAccruals
                    .withArgs(wallet.address, currency.ct.toString(), currency.id, 20, 39)
                    .returns(utils.bigNumberify(20));
            });

            it('should return the value obtained from the spans combined', async () => {
                expect((await ensemble.claimableAmountByAccruals(wallet, currency, 5, 45)).toNumber())
                    .to.be.eq(30);
            });
        });
    });

    describe('claimAndStageByAccruals()', () => {
        let ensemble;

        beforeEach(() => {
            stubbedTokenHolderRevenueFundContract.closedAccrualsByCurrency
                .withArgs(currency.ct.toString(), currency.id, 10)
                .returns(stubbedAccruals[0])
                .withArgs(currency.ct.toString(), currency.id, 19)
                .returns(stubbedAccruals[1])
                .withArgs(currency.ct.toString(), currency.id, 20)
                .returns(stubbedAccruals[2])
                .withArgs(currency.ct.toString(), currency.id, 39)
                .returns(stubbedAccruals[3]);

            ensemble = new TokenHolderRevenueFundContractsEnsemble(
                fakeProvider, ['abstraction1', 'abstraction2'], 10
            );
        });

        describe('if first accrual is greater than last accrual', () => {
            it('should throw', async () => {
                expect(ensemble.claimAndStageByAccruals(wallet, currency, 15, 5)).to.be.rejected;
            });
        });

        describe('if first accrual is greater than last accrual of last span', () => {
            it('should return an empty array', async () => {
                expect(await ensemble.claimAndStageByAccruals(wallet, currency, 50, 60))
                    .to.be.an('array').that.is.empty;
            });
        });

        describe('if last accrual is less than first accrual of first span', () => {
            it('should return an empty array', async () => {
                expect(await ensemble.claimAndStageByAccruals(wallet, currency, 5, 8))
                    .to.be.an('array').that.is.empty;
            });
        });

        describe('if accrual arguments entirely fall within the span of one span', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimAndStageByAccruals
                    .withArgs(currency.ct.toString(), currency.id, 12, 17)
                    .returns(hashZero);
            });

            it('should return an array of 1 tx hash', async () => {
                expect(await ensemble.claimAndStageByAccruals(wallet, currency, 12, 17))
                    .to.be.an('array').that.deep.equals([hashZero]);
            });
        });

        describe('if accrual arguments fall within the span of two spans', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimAndStageByAccruals
                    .withArgs(currency.ct.toString(), currency.id, 12, 19)
                    .returns(hashZero);
                stubbedTokenHolderRevenueFundContract.claimAndStageByAccruals
                    .withArgs(currency.ct.toString(), currency.id, 20, 27)
                    .returns(hashOne);
            });

            it('should return an array of 2 tx hashes', async () => {
                expect(await ensemble.claimAndStageByAccruals(wallet, currency, 12, 27))
                    .to.be.an('array').that.deep.equals([hashZero, hashOne]);
            });
        });

        describe('if accrual arguments wrap the span of two spans', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimAndStageByAccruals
                    .withArgs(currency.ct.toString(), currency.id, 10, 19)
                    .returns(hashZero);
                stubbedTokenHolderRevenueFundContract.claimAndStageByAccruals
                    .withArgs(currency.ct.toString(), currency.id, 20, 39)
                    .returns(hashOne);
            });

            it('should return an array of 2 tx hashes', async () => {
                expect(await ensemble.claimAndStageByAccruals(wallet, currency, 5, 45))
                    .to.be.an('array').that.deep.equals([hashZero, hashOne]);
            });
        });

        describe('if contract connect throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.connect
                    .throws(new Error('Unable to connect'));
                stubbedTokenHolderRevenueFundContract.claimAndStageByAccruals
                    .withArgs(currency.ct.toString(), currency.id, 10, 19)
                    .returns(hashZero);
                stubbedTokenHolderRevenueFundContract.claimAndStageByAccruals
                    .withArgs(currency.ct.toString(), currency.id, 20, 39)
                    .returns(hashOne);
            });

            it('should be rejected', async () => {
                expect(ensemble.claimAndStageByAccruals(wallet, currency, 5, 45))
                    .to.be.rejectedWith(NestedError, 'Unable to claim and stage by accruals.');
            });
        });

        describe('if contract claim and stage throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimAndStageByAccruals
                    .withArgs(currency.ct.toString(), currency.id, 10, 19)
                    .returns(hashZero);
                stubbedTokenHolderRevenueFundContract.claimAndStageByAccruals
                    .withArgs(currency.ct.toString(), currency.id, 20, 39)
                    .throws(new Error('Unable to claim and stage'));
            });

            it('should be rejected', async () => {
                expect(ensemble.claimAndStageByAccruals(wallet, currency, 5, 45))
                    .to.be.rejectedWith(NestedError, 'Unable to claim and stage by accruals.');
            });
        });
    });

    describe('claimableAmountByBlockNumbers()', () => {
        let ensemble;

        beforeEach(() => {
            stubbedTokenHolderRevenueFundContract.closedAccrualsByCurrency
                .withArgs(currency.ct.toString(), currency.id, 10)
                .returns(stubbedAccruals[0])
                .withArgs(currency.ct.toString(), currency.id, 19)
                .returns(stubbedAccruals[1])
                .withArgs(currency.ct.toString(), currency.id, 20)
                .returns(stubbedAccruals[2])
                .withArgs(currency.ct.toString(), currency.id, 39)
                .returns(stubbedAccruals[3]);

            ensemble = new TokenHolderRevenueFundContractsEnsemble(
                fakeProvider, ['abstraction1', 'abstraction2'], 10
            );
        });

        describe('if first block is greater than last block', () => {
            it('should throw', async () => {
                expect(ensemble.claimableAmountByBlockNumbers(wallet, currency, 1500000, 500000))
                    .to.be.rejected;
            });
        });

        describe('if first block is greater than last block of last span', () => {
            it('should return 0', async () => {
                expect((await ensemble.claimableAmountByBlockNumbers(wallet, currency, 10000000, 11000000)).toNumber())
                    .to.be.eq(0);
            });
        });

        describe('if last block is less than first block of first span', () => {
            it('should return 0', async () => {
                expect((await ensemble.claimableAmountByBlockNumbers(wallet, currency, 500000, 800000)).toNumber())
                    .to.be.eq(0);
            });
        });

        describe('if block arguments entirely fall within the span of one span', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimableAmountByBlockNumbers
                    .withArgs(wallet.address, currency.ct.toString(), currency.id, 1200000, 1700000)
                    .returns(utils.bigNumberify(10));
            });

            it('should return the value obtained from the span', async () => {
                expect((await ensemble.claimableAmountByBlockNumbers(wallet, currency, 1200000, 1700000)).toNumber())
                    .to.be.eq(10);
            });
        });

        describe('if block arguments fall within the span of two spans', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimableAmountByBlockNumbers
                    .withArgs(wallet.address, currency.ct.toString(), currency.id, 1200000, 2000000)
                    .returns(utils.bigNumberify(10));
                stubbedTokenHolderRevenueFundContract.claimableAmountByBlockNumbers
                    .withArgs(wallet.address, currency.ct.toString(), currency.id, 2000001, 2700000)
                    .returns(utils.bigNumberify(20));
            });

            it('should return the value obtained from the spans combined', async () => {
                expect((await ensemble.claimableAmountByBlockNumbers(wallet, currency, 1200000, 2700000)).toNumber())
                    .to.be.eq(30);
            });
        });

        describe('if block arguments wrap the span of two spans', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimableAmountByBlockNumbers
                    .withArgs(wallet.address, currency.ct.toString(), currency.id, 900001, 2000000)
                    .returns(utils.bigNumberify(10));
                stubbedTokenHolderRevenueFundContract.claimableAmountByBlockNumbers
                    .withArgs(wallet.address, currency.ct.toString(), currency.id, 2000001, 6000000)
                    .returns(utils.bigNumberify(20));
            });

            it('should return the value obtained from the spans combined', async () => {
                expect((await ensemble.claimableAmountByBlockNumbers(wallet, currency, 500000, 7000000)).toNumber())
                    .to.be.eq(30);
            });
        });
    });

    describe('claimAndStageByBlockNumbers()', () => {
        let ensemble;

        beforeEach(() => {
            stubbedTokenHolderRevenueFundContract.closedAccrualsByCurrency
                .withArgs(currency.ct.toString(), currency.id, 10)
                .returns(stubbedAccruals[0])
                .withArgs(currency.ct.toString(), currency.id, 19)
                .returns(stubbedAccruals[1])
                .withArgs(currency.ct.toString(), currency.id, 20)
                .returns(stubbedAccruals[2])
                .withArgs(currency.ct.toString(), currency.id, 39)
                .returns(stubbedAccruals[3]);

            ensemble = new TokenHolderRevenueFundContractsEnsemble(
                fakeProvider, ['abstraction1', 'abstraction2'], 10
            );
        });

        describe('if first block is greater than last block', () => {
            it('should throw', async () => {
                expect(ensemble.claimAndStageByBlockNumbers(wallet, currency, 1500000, 500000))
                    .to.be.rejected;
            });
        });

        describe('if first block is greater than last block of last span', () => {
            it('should return an empty array', async () => {
                expect(await ensemble.claimAndStageByBlockNumbers(wallet, currency, 10000000, 11000000))
                    .to.be.an('array').that.is.empty;
            });
        });

        describe('if last block is less than first block of first span', () => {
            it('should return an empty array', async () => {
                expect(await ensemble.claimAndStageByBlockNumbers(wallet, currency, 500000, 800000))
                    .to.be.an('array').that.is.empty;
            });
        });

        describe('if block arguments entirely fall within the span of one span', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimAndStageByBlockNumbers
                    .withArgs(currency.ct.toString(), currency.id, 1200000, 1700000)
                    .returns(hashZero);
            });

            it('should return an array of 1 tx hash', async () => {
                expect(await ensemble.claimAndStageByBlockNumbers(wallet, currency, 1200000, 1700000))
                    .to.be.an('array').that.deep.equals([hashZero]);
            });
        });

        describe('if block arguments fall within the span of two spans', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimAndStageByBlockNumbers
                    .withArgs(currency.ct.toString(), currency.id, 1200000, 2000000)
                    .returns(hashZero);
                stubbedTokenHolderRevenueFundContract.claimAndStageByBlockNumbers
                    .withArgs(currency.ct.toString(), currency.id, 2000001, 2700000)
                    .returns(hashOne);
            });

            it('should return an array of 2 tx hashes', async () => {
                expect(await ensemble.claimAndStageByBlockNumbers(wallet, currency, 1200000, 2700000))
                    .to.be.an('array').that.deep.equals([hashZero, hashOne]);
            });
        });

        describe('if block arguments wrap the span of two spans', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimAndStageByBlockNumbers
                    .withArgs(currency.ct.toString(), currency.id, 900001, 2000000)
                    .returns(hashZero);
                stubbedTokenHolderRevenueFundContract.claimAndStageByBlockNumbers
                    .withArgs(currency.ct.toString(), currency.id, 2000001, 6000000)
                    .returns(hashOne);
            });

            it('should return the value obtained from the spans combined', async () => {
                expect(await ensemble.claimAndStageByBlockNumbers(wallet, currency, 500000, 7000000))
                    .to.be.an('array').that.deep.equals([hashZero, hashOne]);
            });
        });

        describe('if contract connect throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.connect
                    .throws(new Error('Unable to connect'));
                stubbedTokenHolderRevenueFundContract.claimAndStageByBlockNumbers
                    .withArgs(currency.ct.toString(), currency.id, 900001, 2000000)
                    .returns(hashZero);
                stubbedTokenHolderRevenueFundContract.claimAndStageByBlockNumbers
                    .withArgs(currency.ct.toString(), currency.id, 2000001, 6000000)
                    .returns(hashOne);
            });

            it('should be rejected', async () => {
                expect(ensemble.claimAndStageByBlockNumbers(wallet, currency, 500000, 7000000))
                    .to.be.rejectedWith(NestedError, 'Unable to claim and stage by blocks numbers.');
            });
        });

        describe('if contract claim and stage throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.claimAndStageByBlockNumbers
                    .withArgs(currency.ct.toString(), currency.id, 900001, 2000000)
                    .returns(hashZero);
                stubbedTokenHolderRevenueFundContract.claimAndStageByBlockNumbers
                    .withArgs(currency.ct.toString(), currency.id, 2000001, 6000000)
                    .throws(new Error('Unable to claim and stage'));
            });

            it('should be rejected', async () => {
                expect(ensemble.claimAndStageByBlockNumbers(wallet, currency, 500000, 7000000))
                    .to.be.rejectedWith(NestedError, 'Unable to claim and stage by blocks numbers.');
            });
        });
    });

    describe('stagedBalance()', () => {
        let ensemble;

        beforeEach(() => {
            stubbedTokenHolderRevenueFundContract.closedAccrualsByCurrency
                .withArgs(currency.ct.toString(), currency.id, 10)
                .returns(stubbedAccruals[0])
                .withArgs(currency.ct.toString(), currency.id, 19)
                .returns(stubbedAccruals[1])
                .withArgs(currency.ct.toString(), currency.id, 20)
                .returns(stubbedAccruals[2])
                .withArgs(currency.ct.toString(), currency.id, 39)
                .returns(stubbedAccruals[3]);
            stubbedTokenHolderRevenueFundContract.stagedBalance
                .withArgs(wallet.address, currency.ct.toString(), currency.id)
                .onFirstCall()
                .returns(10)
                .onSecondCall()
                .returns(20);

            ensemble = new TokenHolderRevenueFundContractsEnsemble(
                fakeProvider, ['abstraction1', 'abstraction2'], 10
            );
        });

        it('should return the value obtained from the spans combined', async () => {
            expect((await ensemble.stagedBalance(wallet, currency)).toNumber())
                .to.be.eq(30);
        });
    });

    describe('withdraw()', () => {
        let ensemble, monetaryAmount;

        beforeEach(() => {
            stubbedTokenHolderRevenueFundContract.closedAccrualsByCurrency
                .withArgs(currency.ct.toString(), currency.id, 10)
                .returns(stubbedAccruals[0])
                .withArgs(currency.ct.toString(), currency.id, 19)
                .returns(stubbedAccruals[1])
                .withArgs(currency.ct.toString(), currency.id, 20)
                .returns(stubbedAccruals[2])
                .withArgs(currency.ct.toString(), currency.id, 39)
                .returns(stubbedAccruals[3]);
            stubbedTokenHolderRevenueFundContract.stagedBalance
                .withArgs(wallet.address, currency.ct.toString(), currency.id)
                .onCall(0)
                .returns(utils.bigNumberify(10))
                .onCall(1)
                .returns(utils.bigNumberify(20))
                .onCall(2)
                .returns(utils.bigNumberify(10))
                .onCall(3)
                .returns(utils.bigNumberify(20));

            ensemble = new TokenHolderRevenueFundContractsEnsemble(
                fakeProvider, ['abstraction1', 'abstraction2'], 10
            );
        });

        describe('if called amount greater than the stageable amount', () => {
            beforeEach(() => {
                monetaryAmount = MonetaryAmount.from(40, currency.ct, currency.id);
            });

            it('should throw', async () => {
                expect(ensemble.withdraw(wallet, monetaryAmount))
                    .to.be.rejected;
            });
        });

        describe('if called with amount less than the stageable amount of the first span', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.withdraw
                    .withArgs(utils.bigNumberify(5), currency.ct.toString(), currency.id, 'ERC20')
                    .returns(hashZero);
                stubbedTokenHolderRevenueFundContract.withdraw
                    .onSecondCall()
                    .throws();

                monetaryAmount = MonetaryAmount.from(5, currency.ct, currency.id);
            });

            it('should return the value obtained from the spans combined', async () => {
                expect(await ensemble.withdraw(wallet, monetaryAmount))
                    .to.be.an('array').that.deep.equals([hashZero]);
            });
        });

        describe('if called with amount less than the stageable amount of the spans combined', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.withdraw
                    .withArgs(utils.bigNumberify(10), currency.ct.toString(), currency.id, 'ERC20')
                    .returns(hashZero)
                    .withArgs(utils.bigNumberify(15), currency.ct.toString(), currency.id, 'ERC20')
                    .returns(hashOne);

                monetaryAmount = MonetaryAmount.from(25, currency.ct, currency.id);
            });

            it('should return the value obtained from the spans combined', async () => {
                expect(await ensemble.withdraw(wallet, monetaryAmount))
                    .to.be.an('array').that.deep.equals([hashZero, hashOne]);
            });
        });

        describe('if called with equal to the stageable amount', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.withdraw
                    .withArgs(utils.bigNumberify(10), currency.ct.toString(), currency.id, 'ERC20')
                    .returns(hashZero)
                    .withArgs(utils.bigNumberify(20), currency.ct.toString(), currency.id, 'ERC20')
                    .returns(hashOne);

                monetaryAmount = MonetaryAmount.from(30, currency.ct, currency.id);
            });

            it('should return the value obtained from the spans combined', async () => {
                expect(await ensemble.withdraw(wallet, monetaryAmount))
                    .to.be.an('array').that.deep.equals([hashZero, hashOne]);
            });
        });

        describe('if contract connect throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.connect
                    .throws(new Error('Unable to connect'));
                stubbedTokenHolderRevenueFundContract.withdraw
                    .withArgs(utils.bigNumberify(10), currency.ct.toString(), currency.id, 'ERC20')
                    .returns(hashZero)
                    .withArgs(utils.bigNumberify(20), currency.ct.toString(), currency.id, 'ERC20')
                    .returns(hashOne);

                monetaryAmount = MonetaryAmount.from(30, currency.ct, currency.id);
            });

            it('should be rejected', async () => {
                expect(ensemble.withdraw(wallet, monetaryAmount))
                    .to.be.rejectedWith(NestedError, 'Unable to withdraw.');
            });
        });

        describe('if contract withdraw throws', () => {
            beforeEach(() => {
                stubbedTokenHolderRevenueFundContract.withdraw
                    .withArgs(utils.bigNumberify(10), currency.ct.toString(), currency.id, 'ERC20')
                    .returns(hashZero)
                    .withArgs(utils.bigNumberify(20), currency.ct.toString(), currency.id, 'ERC20')
                    .throws(new Error('Unable to withdraw'));

                monetaryAmount = MonetaryAmount.from(30, currency.ct, currency.id);
            });

            it('should be rejected', async () => {
                expect(ensemble.withdraw(wallet, monetaryAmount))
                    .to.be.rejectedWith(NestedError, 'Unable to withdraw.');
            });
        });
    });
});
