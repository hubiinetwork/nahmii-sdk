'use strict';

const _stageAmount = new WeakMap();
const _address = new WeakMap();
const _currency = new WeakMap();
const _provider = new WeakMap();

class Settlement {
    constructor(address, ct, stageAmount, provider) {
        _provider.set(this, provider);
        _address.set(this, address);
        _currency.set(this, ct);
        _stageAmount.set(this, stageAmount);
    }
    get provider() {
        return _provider.get(this);
    }
    get address() {
        return _address.get(this);
    }
    get currency() {
        return _currency.get(this);
    }
    get stageAmount() {
        return _stageAmount.get(this);
    }
    toJSON() {
        return {
            address: this.address,
            currency: this.currency,
            stageAmount: this.stageAmount.toString()
        };
    }
}

module.exports = Settlement;