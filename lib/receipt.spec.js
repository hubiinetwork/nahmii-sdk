'use strict';

const chai = require('chai');
const expect = chai.expect;

const Receipt = require('./receipt');

describe('Receipt', () => {
    
    describe('#getHashProperties()', () => {

        it('returns an array of properties', () => {
            expect(Receipt.getHashProperties()).to.eql([
              'seals.wallet.signature',
              'nonce',
              'sender.nonce',
              'sender.balances.current',
              'sender.balances.previous',
              'sender.netfee',
              'recipient.nonce',
              'recipient.balances.current',
              'recipient.balances.previous',
              'recipient.netfee',
              'transfers.single',
              'transfers.net',
              'singleFee'
            ]);
        });

    });
});
