'use strict';
const {EthereumAddress} = require('nahmii-ethereum-address');

const _stageAmount = new WeakMap();
const _address = new WeakMap();
const _currency = new WeakMap();
const _provider = new WeakMap();

class Settlement {
    constructor(address, ct, stageAmount, provider) {

        if (!(address instanceof EthereumAddress))
            throw new TypeError('address is not an instance of EthereumAddress');

        if (!(ct instanceof EthereumAddress))
            throw new TypeError('ct is not an instance of EthereumAddress');

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
            address: this.address.toString(),
            currency: this.currency.toString(),
            stageAmount: this.stageAmount.toString()
        };
    }
}

module.exports = Settlement;