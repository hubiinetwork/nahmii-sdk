'use strict';

const ethers = require('ethers');
const Currency = require('./currency');
const BSON = require('bson');

/**
 * @module nahmii-sdk
 */

const _amount = new WeakMap();
const _currency = new WeakMap();

function rectifyAmount(amount) {
    if ((typeof amount === 'object') && (ethers.utils.BigNumber.isBigNumber(amount)))
        return amount;

    if (Number.isInteger(amount))
        return ethers.utils.bigNumberify(amount);

    if ((typeof amount === 'string') && /^[-]?[0-9]+$/.test(amount))
        return ethers.utils.bigNumberify(amount);

    return null;
}

/**
 * @class MonetaryAmount
 * This class represent a monetary amount for a specific currency.
 * The class references the BigNumber implementation of ethers.
 * @alias module:nahmii-sdk
 * @example
 * const {MonetaryAmount, Payment} = require('nahmii-sdk');
 *
 * const one_hbt = MonetaryAmount.from('1000000000000000', '0xDd6C68bb32462e01705011a4e2Ad1a60740f217F', 0);
 * const payment = new Payment(provider, one_hbt, sender_address, recipient_address);
 */
class MonetaryAmount {
    /**
     * Constructs a new MonetaryAmount object.
     * @param {BigNumber} amount - the amount in base units (e.g. WEI).
     * @param {Currency} currency - currency of the amount.
     * @throws {TypeError} - thrown if input arguments are unexpected.
     */
    constructor(amount, currency) {
        if (!(ethers.utils.BigNumber.isBigNumber(amount)))
            throw new TypeError('amount is not a BigNumber');

        if (!(currency instanceof Currency))
            throw new TypeError('currency is not a Currency');

        _amount.set(this, amount);
        _currency.set(this, currency);
    }

    /**
     * Returns the currency amount in base units (e.g. WEI).
     * @returns {BigNumber} - currency amount.
     */
    get amount () {
        return _amount.get(this);
    }

    /**
     * Returns a Currency instance with the currency address (ct) and currency identifier (id).
     * @returns {Currency} - currency information.
     */
    get currency () {
        return _currency.get(this);
    }

    /**
     * Converts the monetary amount into a JSON object.
     * @returns {Object} - A JSON object that is in the format that nahmii APIs expects.
     */
    toJSON() {
        return {
            amount: _amount.get(this).toString(),
            currency: _currency.get(this).toJSON()
        };
    }

    /**
     * Converts the monetary amount into a BSON object.
     * @returns {Object} - A BSON object that is in the format that nahmii MongoDBs expects.
     */
    toBSON() {
        return {
            amount: BSON.Decimal128.fromString(_amount.get(this).toString()),
            currency: _currency.get(this).toBSON()
        };
    }

    /**
     * Factory/de-serializing method
     * @param {(Object|BigNumber|String|Integer)} jsonOrAmount - either a JSON object that can be de-serialized to a MonetaryAmount instance, or a currency amount.
     * @param {EthereumAddress|String} [ctOrUndefined] - currency contract address. Exclusive with JSON as first argument.
     * @param {String|Integer} [idOrUndefined] - positive number that identifies the currency item (0 for ERC20 tokens). Exclusive with JSON as first argument.
     * @returns {MonetaryAmount|null} - a new instance, or null if parsing fails.
     */
    static from(jsonOrAmount, ctOrUndefined, idOrUndefined) {
        const gotJson = (arguments.length === 1) &&
            (typeof jsonOrAmount === 'object') &&
            (typeof jsonOrAmount.currency === 'object');

        if (gotJson) {
            ctOrUndefined = jsonOrAmount.currency.ct;
            idOrUndefined = jsonOrAmount.currency.id;
            jsonOrAmount = jsonOrAmount.amount;
        }

        const amount = rectifyAmount(jsonOrAmount);
        if (amount === null)
            return null;

        const currency = Currency.from({ct: ctOrUndefined, id: idOrUndefined});
        if (currency === null)
            return null;

        return new MonetaryAmount(amount, currency);
    }
}

module.exports = MonetaryAmount;
