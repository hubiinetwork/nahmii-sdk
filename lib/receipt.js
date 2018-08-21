'use strict';

/**
 * @module striim-sdk
 */

/**
 * @class Receipt
 * A class for modelling a _hubii striim_ payment receipt.
 */
class Receipt {
 
    /**
     * Returns the property names which receipt hashes are calculated
     * @return {String[]} Array of property names
     */
    static getHashProperties() {
        return [
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
        ];
    }
}

module.exports = Receipt;
