'use strict';
const {EthereumAddress} = require('nahmii-ethereum-address');
const MonetaryAmount = require('../monetary-amount');
const ConfigurationContract = require('./configuration-contract');

const _stageAmount = new WeakMap();
const _address = new WeakMap();
const _currency = new WeakMap();
const _configurationContract = new WeakMap();
const _provider = new WeakMap();

class Settlement {
    constructor(address, monetaryAmount, provider) {

        if (!(address instanceof EthereumAddress))
            throw new TypeError('address is not an instance of EthereumAddress');

        if (!(monetaryAmount instanceof MonetaryAmount))
            throw new TypeError('monetaryAmount is not an instance of MonetaryAmount');

        _provider.set(this, provider);
        _address.set(this, address);
        _currency.set(this, monetaryAmount.currency);
        _stageAmount.set(this, monetaryAmount.amount);
        _configurationContract.set(this, new ConfigurationContract(provider));
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
    async start() {
        if(this.isStarted) 
            throw new Error('Can not restart a settlement.');
        
        const configurationContract = _configurationContract.get(this);
        const earliestSettlementBlockNumber = await configurationContract.earliestSettlementBlockNumber();
        const latestBlockNumber = await this.provider.getBlockNumber();
        if (earliestSettlementBlockNumber.gt(latestBlockNumber)) 
            throw new Error('Settlements are currently disabled.');
    }
    async stage() {
        if (!this.isStageable) 
            throw new Error('Not ready to stage the settlement.');
    }
    toJSON() {
        return {
            address: this.address.toString(),
            currency: this.currency.toJSON(),
            stageAmount: this.stageAmount.toString()
        };
    }
}

module.exports = Settlement;