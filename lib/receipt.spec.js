'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const Receipt = require('./receipt');

const {privateToAddress} = require('ethereumjs-util');
const {hash, prefix0x, sign} = require('./utils');
const Payment = require('./payment');

const amount = '1000';
const currency = {ct:'0x0000000000000000000000000000000000000001', id: '0'};
const recipient = '0x0000000000000000000000000000000000000003';
const senderKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
const sender = prefix0x(privateToAddress(new Buffer(senderKey, 'hex')).toString('hex'));
const operatorKey = '252c772d9e9d570c726473927c52f23227cc674b6567935287d3f4a76a57d352';
const operatorAddress = prefix0x(privateToAddress(new Buffer(operatorKey, 'hex')).toString('hex'));


const stubbedProvider = {
    operatorAddress,
    effectuatePayment: sinon.stub()
};


describe('Receipt', () => {
    let signedPayload, unsignedPayload, receipt;

    const hashPaymentAsExchange = payment => {
        const walletSignatureHash = hash(
            payment.seals.wallet.signature.v,
            payment.seals.wallet.signature.r,
            payment.seals.wallet.signature.s
        );
        const nonceHash = hash(
            payment.nonce
        );
        const senderHash = hash(
            payment.sender.nonce,
            payment.sender.balances.current,
            payment.sender.balances.previous,
            payment.sender.fees.single.amount,
            payment.sender.fees.single.currency.ct,
            payment.sender.fees.single.currency.id
        );
        const recipientHash = hash(
            payment.recipient.nonce,
            payment.recipient.balances.current,
            payment.recipient.balances.previous
        );
        const transfersHash = hash(
            payment.transfers.single,
            payment.transfers.net
        );
        return hash(walletSignatureHash, nonceHash, senderHash, recipientHash, transfersHash);
    };

    const signPaymentAsWallet = json => {
        const payment = Payment.from(null, json);
        payment.sign(senderKey);
        const paymentJSON = payment.toJSON();
        const walletSeal = paymentJSON.seals.wallet;

        json.seals.wallet = walletSeal;
    }

    beforeEach(() => {
        unsignedPayload = {
            amount,
            currency,
            seals: {},
            nonce: 1,
            sender: {
                nonce: 1,
                wallet: sender,
                balances: {
                    current: '0',
                    previous: '100'
                },
                fees: {
                    single: {
                        currency,
                        amount: '1000000000000000000'
                    },
                    net: [
                        {
                            currency,
                            amount: '1000000000000000000'
                        }
                    ]
                }
            },
            recipient: {
                nonce: 1,
                wallet: recipient,
                balances: {
                    current: '100',
                    previous: '0'
                },
                fees: {
                    net: [
                        {
                            currency: {
                                ct: '0x0000000000000000000000000000000000000001',
                                id: '1'
                            },
                            amount: '1000000000000000000'
                        }
                    ]
                }
            },
            transfers: {
                single: '100',
                net: '100'
            }
        };

        signPaymentAsWallet(unsignedPayload);

        signedPayload = {
            ...unsignedPayload,
            seals: {
                ...unsignedPayload.seals,
                exchange: {
                    hash: hashPaymentAsExchange(unsignedPayload),
                    signature: {
                        r: '0x32ce9786af487e7b315b6f6ee22152faba36acd9f2785bb70f170c90ae8b2403',
                        s: '0x2afdcc42899ef64acf018311e90393bcf9b0e4f2fb6a064078176f0475014144',
                        v: 27
                    }
                }
            }
        };
    });

    afterEach(() => {
        stubbedProvider.effectuatePayment.reset();
    });

    context('a new Receipt', () => {
        beforeEach(() => {
            receipt = new Receipt(stubbedProvider);
        });

        it('can be serialized to a new object literal', () => {
            expect(receipt.toJSON()).to.eql({});
        });

        it('can be registered with the API', () => {
            receipt.effectuate();
            expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
        });

        it('does not have a valid signature', () => {
            expect(receipt.isSigned()).to.be.false;
        });
    });

    context('a serialized incomplete Receipt', () => {
        it('can not be de-serialized', () => {
            expect(() => Receipt.from(stubbedProvider, {})).to.throw();
        });

        context('a de-serialized incomplete Receipt', () => {
            [
                payload => delete payload.sender.fees.single,
                payload => delete payload.sender.balances.current,
                payload => delete payload.nonce
            ].forEach(modifier => {
                context('when ' + modifier.toString(), () => {
                    it('can not be signed', () => {
                        let modifiedPayload = {...unsignedPayload};
                        modifier(modifiedPayload);
                        let incompleteReceipt = Receipt.from(stubbedProvider, modifiedPayload);
                        expect(() => incompleteReceipt.sign(operatorKey)).to.throw();
                    });
                });
            });
        });
    });

    context('a de-serialized unsigned Receipt', () => {
        beforeEach(() => {
            receipt = Receipt.from(stubbedProvider, unsignedPayload);
        });

        it('can be serialized to a new object literal', () => {
            expect(receipt.toJSON()).to.eql(unsignedPayload);
        });

        it('can be registered with the API', () => {
            receipt.effectuate();
            expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
        });

        it('does not have a valid signature', () => {
            expect(receipt.isSigned()).to.be.false;
        });

        it('can be signed', () => {
            receipt.sign(operatorKey);
            expect(receipt.toJSON()).to.eql(signedPayload);
        });
    });

    context('a de-serialized signed Receipt', () => {
        beforeEach(() => {
            receipt = Receipt.from(stubbedProvider, signedPayload);
        });

        it('can be serialized to a new object literal', () => {
            expect(receipt.toJSON()).to.eql(signedPayload);
        });

        it('can be registered with the API', () => {
            receipt.effectuate();
            expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
        });

        it('has a valid signature', () => {
            expect(receipt.isSigned()).to.be.true;
        });

        it('can be signed', () => {
            receipt.sign(operatorKey);
            expect(receipt.toJSON()).to.eql(signedPayload);
        });
    });

    context('a de-serialized signed Receipt that has been tampered with (nonce)', () => {
        let modifiedPayload;

        beforeEach(() => {
            modifiedPayload = {...signedPayload};
            modifiedPayload.nonce = 9999;
            receipt = Receipt.from(stubbedProvider, modifiedPayload);
        });

        it('can be registered with the API', () => {
            receipt.effectuate();
            expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
        });

        it('has the modified nonce', () => {
            expect(receipt.toJSON().nonce).to.eql(modifiedPayload.nonce);
        });

        it('does not have a valid signature', () => {
            expect(receipt.isSigned()).to.be.false;
        });
    });

    context('a de-serialized signed Receipt that has been tampered with (sender)', () => {
        let modifiedPayload;

        beforeEach(() => {
            modifiedPayload = {...signedPayload};
            modifiedPayload.sender.wallet = '0';
            receipt = Receipt.from(stubbedProvider, modifiedPayload);
        });

        it('can be registered with the API', () => {
            receipt.effectuate();
            expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
        });

        it('has the modified sender', () => {
            expect(receipt.toJSON().sender.wallet).to.eql(modifiedPayload.sender.wallet);
        });

        it('does not have a valid signature', () => {
            expect(receipt.isSigned()).to.be.false;
        });
    });
});
