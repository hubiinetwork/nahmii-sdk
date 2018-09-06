'use strict';

const _amount = new WeakMap();
const _currencyType = new WeakMap();
const _currencyId = new WeakMap();

class MonetaryAmount {
    constructor(amount, type, id) {
        _amount.set(this, amount);
        _currencyType.set(this, type);
        _currencyId.set(this, id);
    }

    toJSON() {
        return {
            amount: _amount.get(this),
            currency: {
                ct: _currencyType.get(this),
                id: _currencyId.get(this)
            }
        };
    }

    static from(payload) {
        if (payload && payload.amount && payload.currency.ct && payload.currency.id)
            return new MonetaryAmount(payload.amount, payload.currency.ct, payload.currency.id);
        return null;
    }
}

module.exports = MonetaryAmount;
