'use strict';

const MonetaryAmount = require('./monetary-amount');

/**
 * @module striim-sdk
 */

const {hashObject, sign, ethHash, isSignedBy} = require('./utils');

const _amount = new WeakMap();
const _sender = new WeakMap();
const _recipient = new WeakMap();
const _hash = new WeakMap();
const _signature = new WeakMap();

const PAYMENT_REQUEST_HASHED_PROPERTIES = [
    'amount',
    'currency.ct',
    'currency.id',
    'sender.wallet',
    'recipient.wallet'
];

/**
 * @class Payment
 * A class for creating a _hubii striim_ payment.
 * @alias module:striim-sdk
 * @example
 * const striim = require('striim-sdk');
 * const provider = new striim.StriimProvider(striim_base_url, striim_app_id, striim_app_secret);
 *
 * // Creates a new Payment, providing essential inputs such as the amount,
 * // the currency, the sender, and the recipient.
 * const monetaryAmount = new striim.MonetaryAmount(amount, erc20_token_address);
 * const payment = new striim.Payment(provider, monetaryAmount, wallet_address, recipient_address);
 *
 * // Signs the payment with the private key belonging to your wallet_address.
 * payment.sign(private_key);
 *
 * // Sends the signed payment to the API for registration and execution and
 * // logs the API response to the console.
 * payment.register().then(console.log);
 */
class Payment {
    /**
     * Constructor
     * @param {StriimProvider} provider - A StriimProvider instance
     * @param {MonetaryAmount} amount - Amount in base units (wei for ETH)
     * @param {Address} sender - Senders address
     * @param {Address} recipient - Recipient address
     */
    constructor(provider, amount, sender, recipient) {
        if (!(amount instanceof MonetaryAmount))
            throw new TypeError('amount is not an instance of MonetaryAmount');

        this.provider = provider;
        _amount.set(this, amount);
        _sender.set(this, sender);
        _recipient.set(this, recipient);
    }

    /**
     * This payment's amount and currency
     * @returns {MonetaryAmount}
     */
    get amount() {
        return _amount.get(this);
    }

    /**
     * The sender of the payment
     * @returns {Address}
     */
    get sender() {
        return _sender.get(this);
    }

    /**
     * The recipient of the payment
     * @returns {Address}
     */
    get recipient() {
        return _recipient.get(this);
    }

    /**
     * Will hash and sign the payment given a private key
     * @param {String|PrivateKey} privateKey - This key should match the sender address
     */
    sign(privateKey) {
        const h = hashPayment(this.toJSON());
        const s = sign(h, privateKey);

        _hash.set(this, h);
        _signature.set(this, s);
    }

    /**
     * Verifies that the payment is signed by the sender and has not been
     * tampered with since.
     * @returns {Boolean}
     */
    isSigned() {
        let serializedPayment = this.toJSON();
        const h = hashPayment(serializedPayment);

        if (!serializedPayment.seals || !serializedPayment.seals.wallet)
            return false;

        if (h !== serializedPayment.seals.wallet.hash)
            return false;

        return isSignedBy(
            ethHash(serializedPayment.seals.wallet.hash),
            serializedPayment.seals.wallet.signature,
            serializedPayment.sender.wallet
        );
    }

    /**
     * Registers the payment with the server to be effectuated
     * @returns {Promise} A promise that resolves to the registered payment as JSON
     */
    register() {
        return this.provider.registerPayment(this.toJSON());
    }

    /**
     * Converts the payment into a JSON object
     * @returns A JSON object that is in the format the API expects
     */
    toJSON() {
        let amount = _amount.get(this);
        amount = amount ? amount.toJSON() : {};

        const result = Object.assign({}, amount, {
            sender: {
                wallet: _sender.get(this)
            },
            recipient: {
                wallet: _recipient.get(this)
            }
        });

        const hash = _hash.get(this);
        const signature = _signature.get(this);

        if (hash && signature)
            result.seals = {wallet: {hash, signature}};

        return result;
    }

    /**
     * Factory/de-serializing method
     * @param {StriimProvider} provider - An instance of a StriimProvider
     * @param json - A JSON object that can be de-serialized to a Payment instance
     * @returns {Payment}
     */
    static from(provider, json) {
        const amount = MonetaryAmount.from(json);
        const p = new Payment(provider, amount, json.sender.wallet, json.recipient.wallet);
        if (json.seals && json.seals.wallet) {
            _hash.set(p, json.seals.wallet.hash);
            _signature.set(p, json.seals.wallet.signature);
        }
        return p;
    }
}

function hashPayment(serializedPayment) {
    return hashObject(serializedPayment, PAYMENT_REQUEST_HASHED_PROPERTIES);
}

module.exports = Payment;
