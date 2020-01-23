'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('./ethers');
const MonetaryAmount = require('./monetary-amount');
const {fromRpcSig, hashObject, hash, isSignedBy} = require('./utils');
const Wallet = require('./wallet');
const uuidv4 = require('uuid/v4');

const _amount = new WeakMap();
const _sender = new WeakMap();
const _senderData = new WeakMap();
const _recipient = new WeakMap();
const _hash = new WeakMap();
const _signature = new WeakMap();
const _wallet = new WeakMap();
const _provider = new WeakMap();
const _senderRef = new WeakMap();

const PAYMENT_REQUEST_HASH_PARTS = [
    ['amount', 'currency.ct', 'currency.id'],
    ['sender.wallet', 'sender.data'],
    ['recipient.wallet']
];

/**
 * @class Payment
 * A class for creating a _hubii nahmii_ payment.
 * To be able to sign a new payment, you must supply a valid Wallet instance.
 * To be able to do operations that interacts with the server you need to
 * supply a valid Wallet or NahmiiProvider instance.
 * @alias module:nahmii-sdk
 * @example
 * const nahmii = require('nahmii-sdk');
 * const wallet = new nahmii.Wallet(...);
 *
 * // Creates a new Payment, providing essential inputs such as the amount,
 * // the currency, the sender, and the recipient.
 * const monetaryAmount = new nahmii.MonetaryAmount(amount, erc20_token_address);
 * const payment = new nahmii.Payment(monetaryAmount, wallet_address, recipient_address, wallet);
 *
 * // Signs the payment with the private key belonging to your wallet.
 * payment.sign();
 *
 * // Sends the signed payment to the API for registration and execution and
 * // logs the API response to the console.
 * payment.register().then(console.log);
 */
class Payment {
    /**
     * Constructor
     * Creates a new payment with a unique sender reference.
     * @param {MonetaryAmount} amount - Amount in a currency
     * @param {Address} sender - Senders address
     * @param {Address} recipient - Recipient address
     * @param {Wallet|NahmiiProvider} [walletOrProvider] - An optional Wallet or NahmiiProvider instance
     * @param {String} [senderRef] - Optional uuid identifying the payment. Must be unique per sender wallet. Random if undefined.
     *
     * @example
     * // Normal, random sender reference
     * const senderWallet = new nahmii.Wallet(...);
     * const recipientWallet = new nahmii.Wallet(...);
     * const paymentAmount = nahmii.MonetaryAmount.from(...);
     * const payment = new nahmii.Payment(paymentAmount, senderWallet.address, recipientWallet.address, senderWallet);
     *
     * // Advanced, semantic sender reference. See: https://github.com/uuidjs/uuid
     * const uuidNamespace = '706ac453-2691-41af-9fde-ac5f787da1ec';
     * const paymentSubject = '...';
     * const senderRef = uuidv5(paymentSubject, uuidNamespace);
     * const payment = new nahmii.Payment(paymentAmount, senderWallet.address, recipientWallet.address, senderWallet, senderRef);
     */
    constructor(amount, sender, recipient, walletOrProvider, senderRef) {
        if (!(amount instanceof MonetaryAmount))
            throw new TypeError('amount is not an instance of MonetaryAmount');

        senderRef = senderRef || uuidv4();

        if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(senderRef))
            throw new TypeError('senderRef is not a uuid string');

        const wallet = walletOrProvider instanceof Wallet ? walletOrProvider : null;
        const provider = wallet ? wallet.provider : walletOrProvider;

        _wallet.set(this, wallet);
        _provider.set(this, provider);
        _amount.set(this, amount);
        // TODO: ensure sender/recipient addresses are of EthereumAddress type.
        _sender.set(this, sender);
        _recipient.set(this, recipient);
        _senderRef.set(this, senderRef);
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
     * The sender's unique reference for the payment. A new unique reference is
     * generated automatically at construction time.
     * @returns {string}
     */
    get senderRef() {
        return _senderRef.get(this);
    }

    /**
     * Will hash and sign the payment with the wallet passed into the constructor
     */
    async sign() {
        const wallet = _wallet.get(this);
        if (!wallet)
            throw new Error('No wallet is available for signing!');

        const h = hashPayment(this.toJSON());
        const hArr = ethers.utils.arrayify(h);
        const sigFlat = await wallet.signMessage(hArr);
        const sigExpanded = fromRpcSig(sigFlat);

        _hash.set(this, h);
        _signature.set(this, sigExpanded);
    }

    /**
     * Verifies that the payment is signed by the sender and has not been
     * tampered with since.
     * @returns {Boolean}
     */
    isSigned() {
        const serializedPayment = this.toJSON();
        const h = hashPayment(serializedPayment);

        if (!serializedPayment.seals || !serializedPayment.seals.wallet)
            return false;

        if (h !== serializedPayment.seals.wallet.hash)
            return false;

        return isSignedBy(
            serializedPayment.seals.wallet.hash,
            serializedPayment.seals.wallet.signature,
            serializedPayment.sender.wallet
        );
    }

    /**
     * Registers the payment with the server to be effectuated
     * @returns {Promise} A promise that resolves to the registered payment as JSON
     */
    async register() {
        const provider = _provider.get(this);
        if (!provider)
            throw new Error('No provider is available for API access!');

        return provider.registerPayment(this.toJSON());
    }

    /**
     * Converts the payment into a JSON object
     * @returns A JSON object that is in the format the API expects
     */
    toJSON() {
        const amount = _amount.get(this).toJSON();
        const senderData = {
            ref: _senderRef.get(this)
        };
        const senderDataB64 = Buffer.from(JSON.stringify(senderData)).toString('base64');

        const result = Object.assign({}, amount, {
            sender: {
                wallet: _sender.get(this),
                data: senderDataB64
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
     * @param json - A JSON object that can be de-serialized to a Payment instance
     * @param {Wallet|NahmiiProvider} [walletOrProvider] - The wallet used for signing the payment
     * @returns {Payment}
     */
    static from(json, walletOrProvider = null) {
        // TODO: implement proper data validation before instantiation of new Payment
        const amount = MonetaryAmount.from(json);
        const p = new Payment(amount, json.sender.wallet, json.recipient.wallet, walletOrProvider);
        _senderData.set(p, json.sender.data);
        if (json.seals && json.seals.wallet) {
            _hash.set(p, json.seals.wallet.hash);
            _signature.set(p, json.seals.wallet.signature);
        }
        if (json.sender && json.sender.data && typeof json.sender.data === 'string') {
            const jsonSenderData = Buffer.from(json.sender.data, 'base64').toString('ascii');
            try {
                const senderData = JSON.parse(jsonSenderData);
                _senderRef.set(p, senderData.ref);
            }
            catch (e) {
                // Ignore parse errors and leave the _senderRef undefined.
                // TODO: Is there an exception safe alternative to JSON.parse?
            }
        }

        return p;
    }
}

function hashPayment(serializedPayment) {
    const hashes = PAYMENT_REQUEST_HASH_PARTS.map(properties => {
        return hashObject(serializedPayment, properties);
    });
    return hash(...hashes);
}

module.exports = Payment;
