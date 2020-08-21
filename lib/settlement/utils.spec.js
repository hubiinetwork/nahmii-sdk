'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const ethers = require('ethers');
const {EthereumAddress} = require('nahmii-ethereum-address');

const {
    isRevertContractException,
    determineNonceFromReceipt,
    determineBalanceFromReceipt
} = require('./utils');

describe('settlement utils', () => {
    const receipt = {
        sender: {
            wallet: '0x000000000000000000000000000000000000000a',
            nonce: 1,
            balances: {
                current: '1'
            }
        },
        recipient: {
            wallet: '0x000000000000000000000000000000000000000b',
            nonce: 2,
            balances: {
                current: '2'
            }
        }
    };
    describe('#isRevertContractException()', () => {
        describe('when exception is revert', () => {
            [
                {message: 'execution reverted: For some reason'},
                {code: 'CALL_EXCEPTION'},
                {code: -32000}
            ].forEach(error => {
                describe(JSON.stringify(error), () => {
                    it('returns true', () => {
                        const revert = isRevertContractException(error);
                        revert.should.be.true;
                    });
                });
            });
        });
        describe('when exception is not revert', () => {
            it('throws', () => {
                [
                    {}
                ].forEach(error => {
                    describe(JSON.stringify(error), () => {
                        it('returns false', () => {
                            const revert = isRevertContractException(error);
                            revert.should.be.false;
                        });
                    });
                });
            });
        });
    });
    describe('#determineNonceFromReceipt()', () => {
        describe('when address matches', () => {
            ['sender', 'recipient'].forEach(party => {
                describe(party, () => {
                    it('returns nonce', () => {
                        const nonce = determineNonceFromReceipt(receipt, EthereumAddress.from(receipt[party].wallet));
                        nonce.should.eq(receipt[party].nonce);
                    });
                });
            });
        });
        describe('when address does not match', () => {
            it('throws', () => {
                try {
                    determineNonceFromReceipt(receipt, EthereumAddress.from('0x0000000000000000000000000000000000000003'));
                    true.should.equal(false, 'Previous statement should have thrown');
                }
                catch (error) {
                    error.message.should.match(/address.*neither.*match/ig);
                }
            });
        });
    });
    describe('#determineBalanceFromReceipt()', () => {
        describe('when address matches', () => {
            ['sender', 'recipient'].forEach(party => {
                describe(party, () => {
                    it('returns balance', () => {
                        const balance = determineBalanceFromReceipt(receipt, receipt[party].wallet);
                        balance.should.deep.eq(ethers.utils.bigNumberify(receipt[party].balances.current));
                    });
                });
            });
        });
        describe('when address does not match', () => {
            it('throws', () => {
                try {
                    determineBalanceFromReceipt(receipt, EthereumAddress.from('0x0000000000000000000000000000000000000003'));
                    true.should.equal(false, 'Previous statement should have thrown');
                }
                catch (error) {
                    error.message.should.match(/address.*neither.*match/ig);
                }
            });
        });
    });
});
