'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
const {hashObject, fromRpcSig, hash, isSignedBy} = require('./utils');
const Payment = require('./payment');
const MonetaryAmount = require('./monetary-amount');
const Wallet = require('./wallet');

const _provider = new WeakMap();
const _wallet = new WeakMap();
const _payment = new WeakMap();
const _hash = new WeakMap();
const _signature = new WeakMap();
const _blockNumber = new WeakMap();
const _operatorId = new WeakMap();
const _operatorData = new WeakMap();
const _senderNonce = new WeakMap();
const _recipientNonce = new WeakMap();
const _senderCurrentBalance = new WeakMap();
const _senderPreviousBalance = new WeakMap();
const _senderSingleFee = new WeakMap();
const _senderTotalFees = new WeakMap();
const _recipientCurrentBalance = new WeakMap();
const _recipientPreviousBalance = new WeakMap();
const _recipientTotalFees = new WeakMap();
const _totalTransfer = new WeakMap();
const _singleTransfer = new WeakMap();

const noData = Buffer.from(JSON.stringify({})).toString('base64');

const PAYMENT_RECEIPT_HASH_PARTS = [
    [
        'seals.wallet.signature.v',
        'seals.wallet.signature.r',
        'seals.wallet.signature.s'
    ],
    [
        ['sender.nonce'],
        ['sender.balances.current',
            'sender.balances.previous'],
        ['sender.fees.single.amount',
            'sender.fees.single.currency.ct',
            'sender.fees.single.currency.id'],
        ['sender.fees.total.[]',
            'originId',
            'figure.amount',
            'figure.currency.ct',
            'figure.currency.id']
    ],
    [
        ['recipient.nonce'],
        ['recipient.balances.current',
            'recipient.balances.previous'],
        ['recipient.fees.total.[]',
            'originId',
            'figure.amount',
            'figure.currency.ct',
            'figure.currency.id']
    ],
    [
        'transfers.single',
        'transfers.total'
    ],
    [
        'operator.data'
    ]
];

/**
 * @class Receipt
 * A class for modelling a _hubii nahmii_ payment receipt.
 * To be able to sign a receipt, you must supply a valid Wallet instance.
 * To be able to do operations that interacts with the server you need to
 * supply a valid Wallet or NahmiiProvider instance.
 * @alias module:nahmii-sdk
 */
class Receipt {
    /**
     * Receipt constructor
     * @param {Payment} payment - A payment instance
     * @param {Wallet|NahmiiProvider} [walletOrProvider] - Optional wallet or provider instance
     */
    constructor(payment, walletOrProvider = null) {
        const wallet = walletOrProvider instanceof Wallet ? walletOrProvider : null;
        const provider = wallet ? wallet.provider : walletOrProvider;

        _wallet.set(this, wallet);
        _provider.set(this, provider);
        _payment.set(this, payment);
    }

    /**
     * Retrieve the payment this Receipt is based on.
     * @returns {Payment}
     */
    get payment() {
        return _payment.get(this);
    }

    /**
     * Reference to the on-chain state the payments was effectuated after.
     * @returns {any}
     */
    get blockNumber() {
        return _blockNumber.get(this);
    }

    /**
     * The address of the sender
     * @returns {Address}
     */
    get sender() {
        return this.payment.sender;
    }

    get senderNonce() {
        return _senderNonce.get(this);
    }

    /**
     * The address of the recipient
     * @returns {Address}
     */
    get recipient() {
        return this.payment.recipient;
    }

    get recipientNonce() {
        return _recipientNonce.get(this);
    }

    /**
     * The ID of the operator that effectuated this payment.
     * @returns {Number}
     */
    get operatorId() {
        return _operatorId.get(this);
    }

    /**
     * Will hash and sign the receipt with the wallet passed into the constructor
     */
    async sign() {
        const wallet = _wallet.get(this);
        if (!wallet)
            throw new Error('No wallet is available for signing!');

        const h = hashReceipt(this.toJSON());
        const hArr = ethers.utils.arrayify(h);
        const sigFlat = await wallet.signMessage(hArr);
        const sigExpanded = fromRpcSig(sigFlat);

        _hash.set(this, h);
        _signature.set(this, sigExpanded);
    }

    /**
     * Verifies that the receipt is signed by both sender and operator, and has
     * not been tampered with since.
     * @returns {Boolean}
     */
    isSigned() {
        let provider = _provider.get(this);
        if (!provider)
            throw new Error('Unable to validate signature without provider or wallet');

        const payment = _payment.get(this);
        if (!payment)
            return false;

        if (!payment.isSigned())
            return false;

        const serializedReceipt = this.toJSON();
        const h = hashReceipt(serializedReceipt);

        if (!serializedReceipt.seals || !serializedReceipt.seals.operator)
            return false;

        if (h !== serializedReceipt.seals.operator.hash)
            return false;

        const operatorAddress = provider.operatorAddress;

        return isSignedBy(
            serializedReceipt.seals.operator.hash,
            serializedReceipt.seals.operator.signature,
            operatorAddress
        );
    }

    /**
     * Registers the receipt with the server to be effectuated
     * @returns {Promise} A promise that resolves to the registered receipt as JSON
     */
    async effectuate() {
        const provider = _provider.get(this);
        if (!provider)
            throw new Error('No provider is available for API access!');

        return provider.effectuatePayment(this.toJSON());
    }

    /**
     * Converts the receipt into a JSON object
     * @returns {Object}
     */
    toJSON() {
        const payment = _payment.get(this);
        if (!payment)
            return {};

        const result = payment.toJSON();

        result.blockNumber = _blockNumber.get(this);
        result.operator = {
            id: _operatorId.get(this),
            data: _operatorData.get(this) || noData
        };
        result.sender.nonce = _senderNonce.get(this);
        result.sender.balances = {
            current: _senderCurrentBalance.get(this),
            previous: _senderPreviousBalance.get(this)
        };

        result.sender.fees = {};
        const senderSingleFee = _senderSingleFee.get(this);
        if (senderSingleFee)
            result.sender.fees.single = senderSingleFee.toJSON();
        const senderTotalFees = _senderTotalFees.get(this);
        if (senderTotalFees && senderTotalFees.length) {
            result.sender.fees.total = senderTotalFees.map(f => {
                return {originId: f.originId, figure: f.figure.toJSON()};
            });
        }

        result.recipient.nonce = _recipientNonce.get(this);
        result.recipient.balances = {
            current: _recipientCurrentBalance.get(this),
            previous: _recipientPreviousBalance.get(this)
        };

        const recipientTotalFees = _recipientTotalFees.get(this);
        if (recipientTotalFees) {
            result.recipient.fees = {
                total: recipientTotalFees.map(f => {
                    return {originId: f.originId, figure: f.figure.toJSON()};
                })
            };
        }

        result.transfers = {
            total: _totalTransfer.get(this),
            single: _singleTransfer.get(this)
        };

        const hash = _hash.get(this);
        const signature = _signature.get(this);

        if (hash && signature)
            result.seals.operator = {hash, signature};

        return result;
    }

    /**
     * Factory/de-serializing method
     * @param json - A JSON object that can be de-serialized to a Receipt instance
     * @param {Wallet|NahmiiProvider} [walletOrProvider] - Optional wallet or provider instance
     * @returns {Receipt}
     */
    static from(json, walletOrProvider = null) {
        const p = Payment.from(json, walletOrProvider);
        const r = new Receipt(p, walletOrProvider);

        _blockNumber.set(r, json.blockNumber);
        _operatorId.set(r, json.operator.id);
        _operatorData.set(r, json.operator.data);

        if (json.sender) {
            _senderNonce.set(r, json.sender.nonce);
            if (json.sender.balances) {
                _senderCurrentBalance.set(r, json.sender.balances.current);
                _senderPreviousBalance.set(r, json.sender.balances.previous);
            }
            if (json.sender.fees) {
                _senderSingleFee.set(r, MonetaryAmount.from(json.sender.fees.single));
                if (json.sender.fees.total) {
                    const totalFees = json.sender.fees.total.map(f => {
                        return {
                            originId: f.originId,
                            figure: MonetaryAmount.from(f.figure)
                        };
                    });
                    _senderTotalFees.set(r, totalFees);
                }
            }
        }

        if (json.recipient) {
            _recipientNonce.set(r, json.recipient.nonce);
            if (json.recipient.balances) {
                _recipientCurrentBalance.set(r, json.recipient.balances.current);
                _recipientPreviousBalance.set(r, json.recipient.balances.previous);
            }
            if (json.recipient.fees) {
                const totalFees = json.recipient.fees.total.map(f => {
                    return {
                        originId: f.originId,
                        figure: MonetaryAmount.from(f.figure)
                    };
                });
                _recipientTotalFees.set(r, totalFees);
            }
        }

        if (json.transfers) {
            _totalTransfer.set(r, json.transfers.total);
            _singleTransfer.set(r, json.transfers.single);
        }

        if (json.seals && json.seals.operator) {
            _hash.set(r, json.seals.operator.hash);
            _signature.set(r, json.seals.operator.signature);
        }
        return r;
    }
}

function hashReceipt(serializedReceipt) {
    // Due to how Solidity encodes and hashes uint8 values, we must explicitly
    // hash them as uint8 values to avoid Solidity encoding and hashing them
    // as uint256 values
    const receiptCopy = JSON.parse(JSON.stringify(serializedReceipt));
    receiptCopy.seals.wallet.signature.v = {
        type: 'uint8', value: receiptCopy.seals.wallet.signature.v
    };
    const hashes = PAYMENT_RECEIPT_HASH_PARTS.map(properties => {
        return hashObject(receiptCopy, properties);
    });
    return hash(...hashes);
}

module.exports = Receipt;
