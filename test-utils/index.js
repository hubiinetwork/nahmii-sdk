'use strict';

const ethers = require('ethers');
const {privateToAddress} = require('ethereumjs-util');
const {hash, prefix0x, fromRpcSig} = require('../lib/utils');
const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const sinon = require('sinon');

const Wallet = proxyquire('../lib/wallet/wallet', {
    './client-fund-contract': function() {
        return {};
    },
    './balance-tracker-contract': function() {
        return {};
    },
    './erc20-contract': function() {
        return {};
    }
});

class ApiPayloadFactory {
    constructor(options) {
        this.amount = options.amount;
        this.currency = options.currency;

        this.senderPrivateKey = options.senderPrivateKey;
        this.sender = options.sender || this.senderPrivateKey ?
            prefix0x(privateToAddress(Buffer.from(this.senderPrivateKey, 'hex')).toString('hex')) :
            undefined;
        this.recipient = options.recipient;
        this.operatorPrivateKey = options.operatorPrivateKey;
        this.operator = options.operator || this.operatorPrivateKey ?
            prefix0x(privateToAddress(Buffer.from(this.operatorPrivateKey, 'hex')).toString('hex')) :
            undefined;
    }

    static createSenderData(senderRef) {
        return this.encodeLiteral({ref: senderRef});
    }

    static encodeLiteral(data) {
        if (typeof data !== 'object')
            throw new TypeError('Input data must be an object literal');

        return Buffer
            .from(JSON.stringify(data))
            .toString('base64');
    }

    createUnsignedPayment(senderRef) {
        const senderData = ApiPayloadFactory.createSenderData(senderRef);

        return {
            amount: this.amount,
            currency: this.currency,
            sender: {
                wallet: this.sender,
                data: senderData
            },
            recipient: {
                wallet: this.recipient
            }
        };
    }

    async createSignedPayment(unsignedPayment) {
        const signedPayment = {
            ...unsignedPayment,
            seals: {
                wallet: {
                    hash: ApiPayloadFactory.hashPayment(unsignedPayment)
                }
            }
        };
        signedPayment.seals.wallet.signature = await this.signAsSender(signedPayment.seals.wallet.hash);
        return signedPayment;
    }

    createUnsignedReceipt(signedPayment) {
        return {
            ...signedPayment,
            blockNumber: 1,
            operator: {
                id: 1,
                data: ApiPayloadFactory.encodeLiteral({})
            },
            sender: {
                ...signedPayment.sender,
                nonce: 1,
                balances: {
                    current: '0',
                    previous: '100'
                },
                fees: {
                    single: {
                        currency: this.currency,
                        amount: '1000000000000000000'
                    },
                    total: [
                        {
                            originId: '1',
                            figure: {
                                currency: this.currency,
                                amount: '1000000000000000000'
                            }
                        }
                    ]
                }
            },
            recipient: {
                ...signedPayment.recipient,
                nonce: 1,
                balances: {
                    current: '100',
                    previous: '0'
                },
                fees: {
                    total: [
                        {
                            originId: '1',
                            figure: {
                                currency: {
                                    ct: '0x0000000000000000000000000000000000000001',
                                    id: '1'
                                },
                                amount: '1000000000000000000'
                            }
                        }
                    ]
                }
            },
            transfers: {
                single: '100',
                total: '100'
            }
        };
    }

    async createSignedReceipt(unsignedReceipt) {
        const signedReceipt = {
            ...unsignedReceipt,
            seals: {
                ...unsignedReceipt.seals,
                operator: {
                    hash: ApiPayloadFactory.hashReceipt(unsignedReceipt)
                }
            }
        };
        signedReceipt.seals.operator.signature = await this.signAsOperator(signedReceipt.seals.operator.hash);
        return signedReceipt;
    }

    static hashPayment(unsignedPayment) {
        const amountCurrencyHash = hash(
            unsignedPayment.amount,
            unsignedPayment.currency.ct,
            unsignedPayment.currency.id
        );
        const senderHash = hash(
            unsignedPayment.sender.wallet,
            unsignedPayment.sender.data
        );
        const recipientHash = hash(
            unsignedPayment.recipient.wallet
        );

        return hash(amountCurrencyHash, senderHash, recipientHash);
    }

    static hashReceipt(unsignedReceipt) {
        const walletSignatureHash = hash(
            {type: 'uint8', value: unsignedReceipt.seals.wallet.signature.v},
            unsignedReceipt.seals.wallet.signature.r,
            unsignedReceipt.seals.wallet.signature.s
        );
        const senderHash = hash(
            hash(unsignedReceipt.sender.nonce),
            hash(
                unsignedReceipt.sender.balances.current,
                unsignedReceipt.sender.balances.previous
            ),
            hash(
                unsignedReceipt.sender.fees.single.amount,
                unsignedReceipt.sender.fees.single.currency.ct,
                unsignedReceipt.sender.fees.single.currency.id
            ),
            ApiPayloadFactory.hashFeesTotal(unsignedReceipt.sender.fees.total)
        );
        const recipientHash = hash(
            hash(unsignedReceipt.recipient.nonce),
            hash(
                unsignedReceipt.recipient.balances.current,
                unsignedReceipt.recipient.balances.previous
            ),
            ApiPayloadFactory.hashFeesTotal(unsignedReceipt.recipient.fees.total)
        );
        const transfersHash = hash(
            unsignedReceipt.transfers.single,
            unsignedReceipt.transfers.total
        );
        const operatorHash = hash(unsignedReceipt.operator.data);
        return hash(walletSignatureHash, senderHash, recipientHash, transfersHash, operatorHash);
    }

    static hashFeesTotal(totalFigures) {
        let feesTotalHash = 0;
        for (let i = 0; i < totalFigures.length; i++) {
            feesTotalHash = hash(
                feesTotalHash,
                totalFigures[i].originId,
                totalFigures[i].figure.amount,
                totalFigures[i].figure.currency.ct,
                totalFigures[i].figure.currency.id
            );
        }
        return feesTotalHash;
    }

    async signAsSender(hash) {
        const senderWallet = new Wallet(this.senderPrivateKey);
        const rpcSignature = await senderWallet.signMessage(ethers.utils.arrayify(hash));
        return fromRpcSig(rpcSignature);
    }

    async signAsOperator(hash) {
        const operatorWallet = new Wallet(this.operatorPrivateKey);
        const rpcSignature = await operatorWallet.signMessage(ethers.utils.arrayify(hash));
        return fromRpcSig(rpcSignature);
    }
}

function EthereumAddressMatcher(address) {
    return sinon.match(function (ethereumAddress) {
        return ethereumAddress.isEqual(address);
    });
}

function CurrencyMatcher(currency) {
    return sinon.match(function (_currency) {
        const json = currency.toJSON();
        const _json = _currency.toJSON();
        return json.ct === _json.ct && json.id === _json.id;
    });
}

function MonetaryAmountMatcher(monetaryAmount) {
    return sinon.match(function (_monetaryAmount) {
        return JSON.stringify(monetaryAmount.toJSON()) === JSON.stringify(_monetaryAmount.toJSON());
    });
}

module.exports = {
    ApiPayloadFactory,
    EthereumAddressMatcher,
    CurrencyMatcher,
    MonetaryAmountMatcher
};
