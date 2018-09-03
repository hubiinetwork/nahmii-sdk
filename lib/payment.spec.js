'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const Payment = require('./payment');

const {privateToAddress} = require('ethereumjs-util');
const {hash} = require('./utils');

const stubbedProvider = {
    registerPayment: sinon.stub()
};

describe('Payment', () => {
    const amount = 1000;
    const currency = '0x0000000000000000000000000000000000000001';
    const recipient = '0x0000000000000000000000000000000000000003';
    const privateKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
    const sender = privateToAddress(new Buffer(privateKey, 'hex')).toString('hex');
    let unsignedPayload, signedPayload;

    beforeEach(() => {
        unsignedPayload = {
            amount,
            currency,
            sender: {
                addr: sender
            },
            recipient: {
                addr: recipient
            }
        };
        signedPayload = {
            ...unsignedPayload,
            seals: {
                wallet: {
                    hash: hash(amount, currency, sender, recipient),
                    signature: {
                        r: 'd8f555e1daa2b42bf07695dc166f553cec0ae690a895be5f8e1a811f0c697a3e',
                        s: '151486e2f96456d8ca18dc5272db4e08fd87f81468afe8cfb11367bfbff9e459',
                        v: '1c'
                    }
                }
            }
        };
    });

    context('a new Payment', () => {
        let payment;

        beforeEach(() => {
            payment = new Payment(stubbedProvider, amount, currency, sender, recipient);
        });

        it('can be serialized to an object literal', () => {
            expect(payment.toJSON()).to.eql(unsignedPayload);
        });

        it('can be signed', () => {
            payment.sign(privateKey);
            expect(payment.toJSON()).to.eql(signedPayload);
        });

        it('can be registered with the API', () => {
            payment.register();
            expect(stubbedProvider.registerPayment).to.have.been.calledWith(payment.toJSON());
        });

        it('has the supplied amount', () => {
            expect(payment.amount).to.eql(amount);
        });

        it('has the supplied currency', () => {
            expect(payment.currency).to.eql(currency);
        });

        it('has the supplied sender', () => {
            expect(payment.sender).to.eql(sender);
        });

        it('has the supplied recipient', () => {
            expect(payment.recipient).to.eql(recipient);
        });

        it('does not have a valid signature', function() {
            expect(payment.isSigned()).to.be.false;
        });
    });

    context('a signed Payment', () => {
        let payment;

        beforeEach(() => {
            payment = new Payment(stubbedProvider, amount, currency, sender, recipient);
            payment.sign(privateKey);
        });

        it('can be serialized to an object literal', () => {
            expect(payment.toJSON()).to.eql(signedPayload);
        });

        it('can be registered with the API', () => {
            payment.register();
            expect(stubbedProvider.registerPayment).to.have.been.calledWith(signedPayload);
        });

        it('has the supplied amount', () => {
            expect(payment.amount).to.eql(amount);
        });

        it('has the supplied currency', () => {
            expect(payment.currency).to.eql(currency);
        });

        it('has the supplied sender', () => {
            expect(payment.sender).to.eql(sender);
        });

        it('has the supplied recipient', () => {
            expect(payment.recipient).to.eql(recipient);
        });

        it('has a valid signature', function() {
            expect(payment.isSigned()).to.be.true;
        });
    });

    context('a de-serialized unsigned Payment', () => {
        let payment;

        beforeEach(() => {
            payment = Payment.from(stubbedProvider, unsignedPayload);
        });

        it('can be serialized to a new object literal', () => {
            expect(payment.toJSON()).to.eql(unsignedPayload);
        });

        it('can be signed', () => {
            payment.sign(privateKey);
            expect(payment.toJSON()).to.eql(signedPayload);
        });

        it('can be registered with the API', () => {
            payment.register();
            expect(stubbedProvider.registerPayment).to.have.been.calledWith(unsignedPayload);
        });

        it('has the supplied amount', () => {
            expect(payment.amount).to.eql(amount);
        });

        it('has the supplied currency', () => {
            expect(payment.currency).to.eql(currency);
        });

        it('has the supplied sender', () => {
            expect(payment.sender).to.eql(sender);
        });

        it('has the supplied recipient', () => {
            expect(payment.recipient).to.eql(recipient);
        });

        it('does not have a valid signature', function() {
            expect(payment.isSigned()).to.be.false;
        });
    });

    context('a de-serialized signed Payment', () => {
        let payment;

        beforeEach(() => {
            payment = Payment.from(stubbedProvider, signedPayload);
        });

        it('can be serialized to a new object literal', () => {
            expect(payment.toJSON()).to.eql(signedPayload);
        });

        it('can be registered with the API', () => {
            payment.register();
            expect(stubbedProvider.registerPayment).to.have.been.calledWith(signedPayload);
        });

        it('has the supplied amount', () => {
            expect(payment.amount).to.eql(amount);
        });

        it('has the supplied currency', () => {
            expect(payment.currency).to.eql(currency);
        });

        it('has the supplied sender', () => {
            expect(payment.sender).to.eql(sender);
        });

        it('has the supplied recipient', () => {
            expect(payment.recipient).to.eql(recipient);
        });

        it('has a valid signature', function() {
            expect(payment.isSigned()).to.be.true;
        });
    });

    context('a de-serialized signed Payment that has been tampered with (amount)', () => {
        let payment, modifiedPayload;

        beforeEach(() => {
            modifiedPayload = {...signedPayload};
            modifiedPayload.amount = '999999';
            payment = Payment.from(stubbedProvider, modifiedPayload);
        });

        it('has the modified amount', () => {
            expect(payment.amount).to.eql(modifiedPayload.amount);
        });

        it('does not have a valid signature', function() {
            expect(payment.isSigned()).to.be.false;
        });
    });

    context('a de-serialized signed Payment that has been tampered with (sender)', () => {
        let payment, modifiedPayload;

        beforeEach(() => {
            modifiedPayload = {...signedPayload};
            modifiedPayload.sender.addr = '0x0000000000000000000000000000000000000099';
            payment = Payment.from(stubbedProvider, modifiedPayload);
        });

        it('has the modified sender', () => {
            expect(payment.sender).to.eql(modifiedPayload.sender.addr);
        });

        it('does not have a valid signature', function() {
            expect(payment.isSigned()).to.be.false;
        });
    });

    context('a de-serialized incorrectly signed Payment', () => {
        let payment, modifiedPayload;

        beforeEach(() => {
            modifiedPayload = {...signedPayload};
            modifiedPayload.seals.wallet.signature = '0xffff9e389115e663107162f9049da8ed06670a53dd6b3bb77165940b6a55eba3156f788625446d6e553dd448608445f122803556c015559b32cf66d781e7d85b18';
            payment = Payment.from(stubbedProvider, modifiedPayload);
        });

        it('does not have a valid signature', function() {
            expect(payment.isSigned()).to.be.false;
        });
    });
});
