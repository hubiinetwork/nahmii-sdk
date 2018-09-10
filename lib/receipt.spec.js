'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const Receipt = require('./receipt');

const {privateToAddress} = require('ethereumjs-util');
const {hash, prefix0x, sign} = require('./utils');

const amount = '1000';
const currency = {ct:'0x0000000000000000000000000000000000000001', id: '0'};
const recipient = '0x0000000000000000000000000000000000000003';
const senderKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
const sender = prefix0x(privateToAddress(new Buffer(senderKey, 'hex')).toString('hex'));
const operatorKey = '252c772d9e9d570c726473927c52f23227cc674b6567935287d3f4a76a57d352';
const operatorAddress = prefix0x(privateToAddress(new Buffer(operatorKey, 'hex')).toString('hex'));
const walletHash = hash(amount, currency.ct, currency.id, sender, recipient);
const walletSignature = sign(walletHash, senderKey);

const stubbedProvider = {operatorAddress};


describe('Receipt', () => {
    let signedPayload, unsignedPayload, receipt;

    beforeEach(() => {
        unsignedPayload = {
            amount,
            currency,
            seals: {
                wallet: {
                    hash: walletHash,
                    signature: walletSignature
                }
            },
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
                        currency: {
                            ct: currency,
                            id: '0'
                        },
                        amount: '1000000000000000000'
                    },
                    net: [
                        {
                            currency: {
                                ct: currency,
                                id: '0'
                            },
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
        signedPayload = {
            ...unsignedPayload,
            seals: {
                ...unsignedPayload.seals,
                exchange: {
                    hash: '0xf054f90d8e904262dfa2b7075771aae355181c481ded7be6cc25fc1b2de632c3',
                    signature: {
                        r: '8fb633dde11783804b5e99f5f0857c24d9837ae85428ad83cd60c2f82dbd43af',
                        s: '7750ca84ddd88bcd2558e8d1289a37df41022bf37520acd5ad8b743c1888de2c',
                        v: 28
                    }
                }
            }
        };
    });

    context('a new Receipt', () => {
        beforeEach(() => {
            receipt = new Receipt();
        });

        it('can be serialized to a new object literal', () => {
            expect(receipt.toJSON()).to.eql({});
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
                payload => delete payload.sender.fees.net,
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

        it('has the modified sender', () => {
            expect(receipt.toJSON().sender.wallet).to.eql(modifiedPayload.sender.wallet);
        });

        it('does not have a valid signature', () => {
            expect(receipt.isSigned()).to.be.false;
        });
    });
});
