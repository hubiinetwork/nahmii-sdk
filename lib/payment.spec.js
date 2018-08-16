'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const Payment = require('./payment');

const stubbedProvider = {
    registerPayment: sinon.stub()
};

describe('Payment', () => {
    const amount = 1000;
    const currency = '0x0000000000000000000000000000000000000001';
    const sender = '0x0000000000000000000000000000000000000002';
    const recipient = '0x0000000000000000000000000000000000000003';
    const privateKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
    const unsignedPayload = {
        amount,
        currency,
        sender: {
            addr: sender
        },
        recipient: {
            addr: recipient
        }
    };
    const signedPayload = {
        ...unsignedPayload,
        seals: {
            wallet: {
                hash: '0xa0f3bc91f6c9dacc6977a33672b5b7e0fc856bd169983061432c23c6169c35f5',
                signature: '0x1c019e389115e663107162f9049da8ed06670a53dd6b3bb77165940b6a55eba3156f788625446d6e553dd448608445f122803556c015559b32cf66d781e7d85b18'
            }
        }
    };

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
    });
});
