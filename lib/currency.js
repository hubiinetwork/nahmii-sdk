'use strict';

/**
* @module nahmii-sdk
*/

const {EthereumAddress} = require('nahmii-ethereum-address');
const BSON = require('bson');

const _ct = new WeakMap();
const _id = new WeakMap();

/**
* Class representing a currency in nahmii.
*/
class Currency {
    /**
  *
  * @param {EthereumAddress} ct - Contract address of the currency
  * @param {Number} [id=0] - Currency ID
  */
    constructor(ct, id=0) {
        if (!(ct instanceof EthereumAddress))
            throw new TypeError('ct is not an instance of EthereumAddress');

        if (typeof(id) !== 'number' || id < 0 || id !== Math.floor(id))
            throw new TypeError('id must be a positive integer');

        _ct.set(this, ct);
        _id.set(this, Number(id));
    }

    get ct() {
        return _ct.get(this);
    }

    get id() {
        return _id.get(this);
    }

    isEqual(that) {
        return this.ct.isEqual(that.ct) && this.id === that.id;
    }

    toJSON() {
        return {
            ct: _ct.get(this).toString(),
            id: _id.get(this).toString()
        };
    }

    toBSON() {
        return {
            ct: _ct.get(this).toBinary(),
            id: new BSON.Int32(_id.get(this))
        };
    }

    static from(input) {
        if (!input)
            return null;

        const ct = EthereumAddress.from(input.ct);
        if (!ct)
            return null;

        let id = input.id;

        if (id === undefined)
            id = 0;
        if (id instanceof BSON.Int32)
            id = id.valueOf();
        if (typeof(id) === 'string')
            id = Number.parseInt(id);

        if (Number.isNaN(id) || id < 0 || id !== Math.floor(id))
            return null;

        return new Currency(ct, id);
    }
}

module.exports = Currency;
