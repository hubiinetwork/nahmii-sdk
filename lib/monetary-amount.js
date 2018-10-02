'use strict';

/**
 * @module nahmii-sdk
 */

const _amount = new WeakMap();
const _currencyType = new WeakMap();
const _currencyId = new WeakMap();

/**
 * @class MonetaryAmount
 * This class represent a monetary amount for a specific currency.
 * @alias module:nahmii-sdk
 * @example
 * const {MonetaryAmount, Payment} = require('nahmii-sdk');
 *
 * const one_hbt = new MonetaryAmount('1000000000000000', '0xDd6C68bb32462e01705011a4e2Ad1a60740f217F', 0);
 * const payment = new Payment(provider, one_hbt, sender_address, recipient_address);
 */
class MonetaryAmount {
    /**
     * Constructs a new MonetaryAmount object.
     * @param {String|BigNumber} amount - a string or BigNumber denoting the amount in base units (e.g. WEI)
     * @param {String} type - hexadecimal string with the type of currency
     * @param {Integer} id - number with the item identified (0 for ERC20 tokens)
     */
    constructor(amount, type, id = 0) {
        _amount.set(this, amount);
        _currencyType.set(this, type);
        _currencyId.set(this, id);
    }

    /**
     * Converts the monetary amount into a JSON object
     * @returns A JSON object that is in the format that the API expects
     */
    toJSON() {
        return {
            amount: _amount.get(this).toString(),
            currency: {
                ct: _currencyType.get(this).toString(),
                id: _currencyId.get(this).toString()
            }
        };
    }

    /**
     * Factory/de-serializing method
     * @param json - A JSON object that can be de-serialized to a MonetaryAmount instance
     * @returns {MonetaryAmount|null} A new instance or null if parsing failure
     */
    static from(json) {
        if (json) {
            if (typeof json.amount !== 'undefined'
                && typeof json.currency !== 'undefined'
                && typeof json.currency.ct !== 'undefined'
                && typeof json.currency.id !== 'undefined'
            ) return new MonetaryAmount(json.amount, json.currency.ct, json.currency.id);
        }
        return null;
    }
}

module.exports = MonetaryAmount;
