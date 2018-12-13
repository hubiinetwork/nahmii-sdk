'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
const {hashObject, fromRpcSig, hash, isSignedBy} = require('./utils');
const Payment = require('./payment');
const MonetaryAmount = require('./monetary-amount');

const _provider = new WeakMap();
const _wallet = new WeakMap();
const _payment = new WeakMap();
const _hash = new WeakMap();
const _signature = new WeakMap();
const _nonce = new WeakMap();
const _blockNumber = new WeakMap();
const _operatorId = new WeakMap();
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

const PAYMENT_RECEIPT_HASH_PARTS = [
    [
        'seals.wallet.signature.v',
        'seals.wallet.signature.r',
        'seals.wallet.signature.s'
    ],
    [
        'nonce'
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
    ]
];

/**
 * @class Receipt
 * A class for modelling a _hubii nahmii_ payment receipt.
 * @alias module:nahmii-sdk
 */
class Receipt {
    constructor(wallet, payment) {
        if (wallet) {
            _wallet.set(this, wallet);
            _provider.set(this, wallet.provider);
        }
        _payment.set(this, payment);
    }

    get payment() {
        return _payment.get(this);
    }

    /**
     * Will hash and sign the receipt with the wallet passed into the constructor
     */
    async sign() {
        const h = hashReceipt(this.toJSON());
        const hArr = ethers.utils.arrayify(h);
        const sigFlat = await _wallet.get(this).signMessage(hArr);
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

        const operatorAddress = _provider.get(this).operatorAddress;

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
    effectuate() {
        const provider = _provider.get(this);
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

        result.nonce = _nonce.get(this);
        result.blockNumber = _blockNumber.get(this);
        result.operatorId = _operatorId.get(this);
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
        if (senderTotalFees && senderTotalFees.length)
        {result.sender.fees.total = senderTotalFees.map(f => {
            return {originId: f.originId, figure: f.figure.toJSON()};
        });}

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
     * @param {Wallet} wallet - An instance of a Wallet
     * @param json - A JSON object that can be de-serialized to a Receipt instance
     * @returns {Receipt}
     */
    static from(wallet, json) {
        const p = Payment.from(wallet, json);
        const r = new Receipt(wallet, p);

        _nonce.set(r, json.nonce);
        _blockNumber.set(r, json.blockNumber);
        _operatorId.set(r, json.operatorId);

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
                        return {originId: f.originId, figure: MonetaryAmount.from(f.figure)};
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
                    return {originId: f.originId, figure: MonetaryAmount.from(f.figure)};
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
