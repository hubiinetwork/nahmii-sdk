'use strict';

const ethers = require('ethers');
const utils = require('./utils');

/**
 * @module nahmii-sdk
 */

const _amount = new WeakMap();
const _currencyType = new WeakMap();
const _currencyId = new WeakMap();

function convertAmountOrThrow(amount) {
    if ((typeof amount === 'object') && (amount instanceof ethers.utils.BigNumber))
        return amount;

    if (Number.isInteger(amount))
        return ethers.utils.bigNumberify(amount);

    if ((typeof amount === 'string') && /^[-]?[0-9]+$/.test(amount))
        return ethers.utils.bigNumberify(amount);

    throw new Error('amount has invalid format');
}

function convertAddressOrThrow(ct) {
    if (utils.isValidAddressString(ct))
        return utils.prefix0x(ct);

    throw new Error('ct has invalid format');
}

function convertIdentifierOrThrow(id) {
    if ((typeof id === 'string') && (/^[0-9]+$/.test(id) || /^0x[0-9a-fA-F]+$/.test(id)))
        id = Number.parseInt(id);

    if (Number.isInteger(id) && (id >= 0))
        return id;

    throw new Error('id has invalid format');
}

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
     * Constructs a new MonetaryAmount object
     * @param {String|Integer|BigNumber} amount - a value denoting the amount in base units (e.g. WEI)
     * @param {String} ct - hexadecimal string with the currency contract address. Prefix '0x' will be added if missing.
     * @param {String|Integer} id - positive number with the item identified (0 for ERC20 tokens)
     * @throws {Error} - thrown if input values do not conform to documented input types
     */
    constructor(amount, ct, id = 0) {
        _amount.set(this, convertAmountOrThrow(amount));
        _currencyType.set(this, convertAddressOrThrow(ct));
        _currencyId.set(this, convertIdentifierOrThrow(id));
    }

    /**
     * Returns an ethers BigNumber representing the currency amount in base units (e.g. WEI)
     * @returns {BigNumber} - with value in base units
     */
    get amount () {
        return _amount.get(this);
    }

    /**
     * Returns the hexadecimal string that represents the contract address of the currency
     * @returns {String} - hexadecimal string including prefix '0x'
     */
    get ct () {
        return _currencyType.get(this);
    }

    /**
     * Returns a positive integer identifying the token item
     * @returns {Integer} - always positive
     */
    get id () {
        return _currencyId.get(this);
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
        try {
            if ((typeof json !== 'object') || (typeof json.currency !== 'object'))
                throw 0;

            return new MonetaryAmount(json.amount, json.currency.ct, json.currency.id);
        }
        catch (err) {
            return null;
        }
    }
}

module.exports = MonetaryAmount;
