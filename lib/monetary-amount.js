'use strict';

const ethers = require('ethers');
const { EthereumAddress } = require('nahmii-ethereum-address');

/**
 * @module nahmii-sdk
 */

const _amount = new WeakMap();
const _currencyType = new WeakMap();
const _currencyId = new WeakMap();

function rectifyAmount(amount) {
    if ((typeof amount === 'object') && (amount instanceof ethers.utils.BigNumber))
        return amount;

    if (Number.isInteger(amount))
        return ethers.utils.bigNumberify(amount);

    if ((typeof amount === 'string') && /^[-]?[0-9]+$/.test(amount))
        return ethers.utils.bigNumberify(amount);

    return null;
}

function rectifyCt(ct) {
    return EthereumAddress.from(ct);
}

function rectifyId(id=0) {
    if ((typeof id === 'string') && (/^[0-9]+$/.test(id) || /^0x[0-9a-fA-F]+$/.test(id)))
        id = Number.parseInt(id);

    if (Number.isInteger(id) && (id >= 0))
        return id;

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
     * @param {EthereumAddress} ct - currency contract address of the amount.
     * @param {Integer} [id] - positive number that identifies the currency item (0 for ERC20 tokens). Default is 0.
     * @throws {TypeError} - thrown if input arguments are unexpected.
     */
    constructor(amount, ct, id = 0) {
        if (! (amount instanceof ethers.utils.BigNumber))
            throw new TypeError('amount is not a BigNumber');

        if (! (ct instanceof EthereumAddress))
            throw new TypeError('ct is not an EthereumAddress');

        if (!Number.isInteger(id) || (id < 0))
            throw new TypeError('id is not an integer');

        _amount.set(this, amount);
        _currencyType.set(this, ct);
        _currencyId.set(this, id);
    }

    /**
     * Returns the currency amount in base units (e.g. WEI).
     * @returns {BigNumber} - currency amount.
     */
    get amount () {
        return _amount.get(this);
    }

    /**
     * Returns an object with the currency address (ct) and currency identifier (id).
     * @returns {{ct: EthereumAddress, id: number}} - currency information.
     */
    get currency () {
        return { ct: _currencyType.get(this), id: _currencyId.get(this) };
    }

    /**
     * Converts the monetary amount into a JSON object.
     * @returns {Object} - A JSON object that is in the format that nahmii APIs expects.
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

        const ct = rectifyCt(ctOrUndefined);
        if (ct === null)
            return null;

        const id = rectifyId(idOrUndefined);
        if (id === null)
            return null;

        return new MonetaryAmount(amount, ct, id);
    }
}

module.exports = MonetaryAmount;
