'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const ethers = require('ethers');
const {EthereumAddress} = require('nahmii-ethereum-address');
const Settlement = require('./settlement');

describe('Settlement base class', () => {
    let settlement;
    const walletAddress = EthereumAddress.from('0x0000000000000000000000000000000000000001');
    const currencyAddress = EthereumAddress.from('0x0000000000000000000000000000000000000001');
    const stageAmount = ethers.utils.bigNumberify('1');
    const provider = {};
    describe('when create successfully', () => {
        beforeEach(() => {
            settlement = new Settlement(walletAddress, currencyAddress, stageAmount, provider);
        });
        it('can return properties', () => {
            settlement.provider.should.eq(provider);
            settlement.address.should.eq(walletAddress);
            settlement.currency.should.eq(currencyAddress);
            settlement.stageAmount.should.eq(stageAmount);
        });
        it('returns JSON', () => {
            settlement.toJSON().should.deep.eq({
                address: walletAddress.toString(),
                currency: currencyAddress.toString(),
                stageAmount: stageAmount.toString()
            });
        });
    });
    describe('when wallet address is not an instance of EthereumAddress', () => {
        it('throws', () => {
            try {
                settlement = new Settlement('0x123', currencyAddress, stageAmount, provider);
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
                settlement = new Settlement(walletAddress, '0x123', stageAmount, provider);
                true.should.equal(false, 'Previous statement should have thrown');
            }
            catch (error) {
                error.message.should.match(/ct.*not.*EthereumAddress/ig);
            }
        });
    });
});