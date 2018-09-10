'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const Payment = require('./payment');
const MonetaryAmount = require('./monetary-amount');

const {privateToAddress} = require('ethereumjs-util');
const {hash, prefix0x} = require('./utils');

const stubbedProvider = {
    registerPayment: sinon.stub()
};

describe('Payment', () => {
    const amount = 1000;
    const currency = {ct: '0x0000000000000000000000000000000000000001', id: '0'};
    const recipient = '0x0000000000000000000000000000000000000003';
    const privateKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
    const sender = prefix0x(privateToAddress(new Buffer(privateKey, 'hex')).toString('hex'));
    let unsignedPayload, signedPayload;

    beforeEach(() => {
        unsignedPayload = {
            amount,
            currency,
            sender: {
                wallet: sender
            },
            recipient: {
                wallet: recipient
            }
        };
        signedPayload = {
            ...unsignedPayload,
            seals: {
                wallet: {
                    hash: hash(amount, currency.ct, currency.id, sender, recipient),
                    signature: {
                        r: '4b38d74475cb38b389281347cca0370b25b2f3ca176425e1e623b0972a72b0d9',
                        s: '3bef9e3347b03f9675bbb88a35562032dfafdb5c5e745e40c887e9ae9d41ea85',
                        v: 27
                    }
                }
            }
        };
    });

    context('a new Payment', () => {
        let payment;

        beforeEach(() => {
            payment = new Payment(stubbedProvider, new MonetaryAmount(amount, currency.ct, currency.id), sender, recipient);
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
            expect(payment.amount).to.eql(new MonetaryAmount(amount, currency.ct, currency.id));
        });

        it('has the supplied sender', () => {
            expect(payment.sender).to.eql(sender);
        });

        it('has the supplied recipient', () => {
            expect(payment.recipient).to.eql(recipient);
        });

        it('does not have a valid signature', () => {
            expect(payment.isSigned()).to.be.false;
        });
    });

    context('a signed Payment', () => {
        let payment;

        beforeEach(() => {
            payment = new Payment(stubbedProvider, new MonetaryAmount(amount, currency.ct, currency.id), sender, recipient);
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
            expect(payment.amount).to.eql(new MonetaryAmount(amount, currency.ct, currency.id));
        });

        it('has the supplied sender', () => {
            expect(payment.sender).to.eql(sender);
        });

        it('has the supplied recipient', () => {
            expect(payment.recipient).to.eql(recipient);
        });

        it('has a valid signature', () => {
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
            expect(payment.amount).to.eql(new MonetaryAmount(amount, currency.ct, currency.id));
        });

        it('has the supplied sender', () => {
            expect(payment.sender).to.eql(sender);
        });

        it('has the supplied recipient', () => {
            expect(payment.recipient).to.eql(recipient);
        });

        it('does not have a valid signature', () => {
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
            expect(payment.amount).to.eql(new MonetaryAmount(amount, currency.ct, currency.id));
        });

        it('has the supplied sender', () => {
            expect(payment.sender).to.eql(sender);
        });

        it('has the supplied recipient', () => {
            expect(payment.recipient).to.eql(recipient);
        });

        it('has a valid signature', () => {
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
            expect(payment.amount).to.eql(new MonetaryAmount(modifiedPayload.amount, currency.ct, currency.id));
        });

        it('does not have a valid signature', () => {
            expect(payment.isSigned()).to.be.false;
        });
    });

    context('a de-serialized signed Payment that has been tampered with (sender)', () => {
        let payment, modifiedPayload;

        beforeEach(() => {
            modifiedPayload = {...signedPayload};
            modifiedPayload.sender.wallet = '0x0000000000000000000000000000000000000099';
            payment = Payment.from(stubbedProvider, modifiedPayload);
        });

        it('has the modified sender', () => {
            expect(payment.sender).to.eql(modifiedPayload.sender.wallet);
        });

        it('does not have a valid signature', () => {
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

        it('does not have a valid signature', () => {
            expect(payment.isSigned()).to.be.false;
        });
    });
});
