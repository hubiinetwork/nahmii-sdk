'use strict';

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const ethers = require('ethers');
const {EthereumAddress} = require('nahmii-ethereum-address');
const MonetaryAmount = require('../monetary-amount');

const stubbedConfigurationContract = function() {};
stubbedConfigurationContract.prototype.earliestSettlementBlockNumber = sinon.stub();
const stubbedProvider = {
    getBlockNumber: sinon.stub()
};

const Settlement = proxyquire('./settlement', {
    './configuration-contract': stubbedConfigurationContract
});

describe('Settlement base class', () => {
    let settlement;
    const walletAddress = EthereumAddress.from('0x0000000000000000000000000000000000000001');
    const currencyAddress = EthereumAddress.from('0x0000000000000000000000000000000000000002');
    const stageAmount = ethers.utils.bigNumberify('1');
    const monetaryAmount = MonetaryAmount.from({
        currency: {
            ct: currencyAddress.toString(),
            id: '0'
        },
        amount: stageAmount.toString()
    });
    describe('when create successfully', () => {
        beforeEach(() => {
            settlement = new Settlement(walletAddress, monetaryAmount, stubbedProvider);
        });
        it('can return properties', () => {
            settlement.provider.should.eq(stubbedProvider);
            settlement.address.should.eq(walletAddress);
            settlement.currency.should.eq(monetaryAmount.currency);
            settlement.stageAmount.should.eq(monetaryAmount.amount);
        });
        it('returns JSON', () => {
            settlement.toJSON().should.deep.eq({
                address: walletAddress.toString(),
                currency: monetaryAmount.toJSON().currency,
                stageAmount: monetaryAmount.toJSON().amount
            });
        });
    });
    describe('when wallet address is not an instance of EthereumAddress', () => {
        it('throws', () => {
            try {
                settlement = new Settlement('0x123', monetaryAmount, stubbedProvider);
                true.should.equal(false, 'Previous statement should have thrown');
            }
            catch (error) {
                error.message.should.match(/address.*not.*EthereumAddress/ig);
            }
        });
    });
    describe('when currency address is not an instance of EthereumAddress', () => {
        it('throws', () => {
            try {
                settlement = new Settlement(walletAddress, '123', stubbedProvider);
                true.should.equal(false, 'Previous statement should have thrown');
            }
            catch (error) {
                error.message.should.match(/monetaryAmount.*not.*MonetaryAmount/ig);
            }
        });
    });
    describe('settlements are disabled', () => {
        beforeEach(() => {
            stubbedConfigurationContract.prototype.earliestSettlementBlockNumber.resolves(ethers.utils.bigNumberify(2));
            stubbedProvider.getBlockNumber.resolves(ethers.utils.bigNumberify(1));
        });
        it('throws', async () => {
            try {
                settlement = new Settlement(walletAddress, monetaryAmount, stubbedProvider);
                await settlement.start();
                true.should.equal(false, 'Previous statement should have thrown');
            }
            catch (error) {
                error.message.should.match(/settlements.*disabled/ig);
            }
        });
    });
});