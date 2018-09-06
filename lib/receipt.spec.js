'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const Receipt = require('./receipt');

const {privateToAddress} = require('ethereumjs-util');
const {hash, prefix0x} = require('./utils');

const amount = '1000';
const currency = '0x0000000000000000000000000000000000000001';
const recipient = '0x0000000000000000000000000000000000000003';
const senderKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
const sender = prefix0x(privateToAddress(new Buffer(senderKey, 'hex')).toString('hex'));
const operatorKey = '252c772d9e9d570c726473927c52f23227cc674b6567935287d3f4a76a57d352';
const operatorAddress = prefix0x(privateToAddress(new Buffer(operatorKey, 'hex')).toString('hex'));

const stubbedProvider = {operatorAddress};


describe('Receipt', () => {
    let signedPayload, unsignedPayload, receipt;

    beforeEach(() => {
        unsignedPayload = {
            amount,
            currency,
            seals: {
                wallet: {
                    hash: hash(amount, currency, sender, recipient),
                    signature: {
                        v: 28,
                        r: 'd8f555e1daa2b42bf07695dc166f553cec0ae690a895be5f8e1a811f0c697a3e',
                        s: '151486e2f96456d8ca18dc5272db4e08fd87f81468afe8cfb11367bfbff9e459'
                    }
                }
            },
            nonce: 1,
            sender: {
                nonce: 1,
                addr: sender,
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
                addr: recipient,
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
                    hash: '0xbfd4fd7e592fb3e1a270b62b40e849937cc8dce02eb4769842460fcdbbea77b8',
                    signature: {
                        r: 'af178add80229744ef7146246123e431688a3ddebeb76b35ba7dd72244979e48',
                        s: '2e7c1cf9dbec722ba4f653d55e2b01dd5d383dedbe1d7ea04aff83b9346c2930',
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
                it('can not be signed', () => {
                    let modifiedPayload = {...unsignedPayload};
                    modifier(modifiedPayload);
                    let incompleteReceipt = Receipt.from(stubbedProvider, modifiedPayload);
                    expect(() => incompleteReceipt.sign(operatorKey)).to.throw();
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
            modifiedPayload.sender.addr = '0';
            receipt = Receipt.from(stubbedProvider, modifiedPayload);
        });

        it('has the modified sender', () => {
            expect(receipt.toJSON().sender.addr).to.eql(modifiedPayload.sender.addr);
        });

        it('does not have a valid signature', () => {
            expect(receipt.isSigned()).to.be.false;
        });
    });
});
