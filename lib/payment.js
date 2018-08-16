'use strict';

const {hash, sign} = require('./utils');

const _amount = new WeakMap();
const _currency = new WeakMap();
const _sender = new WeakMap();
const _recipient = new WeakMap();
const _hash = new WeakMap();
const _signature = new WeakMap();

class Payment {
    /**
     * Constructor
     * @param {StriimProvider} provider
     * @param amount
     * @param currency
     * @param sender
     * @param recipient
     */
    constructor(provider, amount, currency, sender, recipient) {
        this.provider = provider;
        _amount.set(this, amount);
        _currency.set(this, currency);
        _sender.set(this, sender);
        _recipient.set(this, recipient);
    }

    get amount() {
        return _amount.get(this);
    }

    get currency() {
        return _currency.get(this);
    }

    get sender() {
        return _sender.get(this);
    }

    get recipient() {
        return _recipient.get(this);
    }

    sign(privateKey) {
        const h = hash(_amount.get(this), _currency.get(this), _sender.get(this), _recipient.get(this));
        const s = sign(h, privateKey);

        _hash.set(this, h);
        _signature.set(this, s);
    }

    register() {
        return this.provider.registerPayment(this.toJSON());
    }

    toJSON() {
        const result = {
            amount: _amount.get(this),
            currency: _currency.get(this),
            sender: {
                addr: _sender.get(this)
            },
            recipient: {
                addr: _recipient.get(this)
            }
        };

        const hash = _hash.get(this);
        const signature = _signature.get(this);

        if (hash && signature)
            result.seals = {wallet: {hash, signature}};

        return result;
    }

    /**
     * Factory/deserializing method
     * @param {StriimProvider} provider
     * @param payload
     * @returns {Payment}
     */
    static from(provider, payload) {
        const p = new Payment(provider, payload.amount, payload.currency, payload.sender.addr, payload.recipient.addr);
        if (payload.seals && payload.seals.wallet) {
            _hash.set(p, payload.seals.wallet.hash);
            _signature.set(p, payload.seals.wallet.signature);
        }
        return p;
    }
}

module.exports = Payment;
