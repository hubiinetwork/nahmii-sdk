'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const expect = chai.expect;
chai.use(sinonChai);

const Payment = require('./payment');
const MonetaryAmount = require('./monetary-amount');

const {privateToAddress} = require('ethereumjs-util');
const {hash, prefix0x} = require('./utils');

const stubbedClientFundContract = {
    depositTokens: sinon.stub(),
    address: 'client fund address'
};

function proxyquireWallet() {
    return proxyquire('./wallet', {
        './client-fund-contract': function() {
            return stubbedClientFundContract;
        },
        './balance-tracker-contract': function() {
            return {};
        }
    });
}

const Wallet = proxyquireWallet();

const stubbedProvider = {
    registerPayment: sinon.stub()
};

const stubbedWallet = {
    provider: stubbedProvider
};

chai.use(_chai => {
    _chai.Assertion.addMethod('equalMoney', function(other) {
        const obj = this._obj;

        new _chai.Assertion(obj).to.be.instanceOf(MonetaryAmount);
        new _chai.Assertion(other).to.be.instanceOf(MonetaryAmount);

        let expectedJSON = other.toJSON();
        let actualJSON = obj.toJSON();

        this.assert(
            JSON.stringify(actualJSON) === JSON.stringify(expectedJSON),
            'expected #{this} to to equal #{exp} but got #{act}',
            'expected #{this} to not equal #{exp}',
            expectedJSON,
            actualJSON,
            true
        );
    });
});

describe('Payment', () => {
    const amount = '1000';
    const currency = {
        ct: '0x0000000000000000000000000000000000000001',
        id: '0'
    };
    const recipient = '0x0000000000000000000000000000000000000003';
    const privateKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
    const sender = prefix0x(privateToAddress(new Buffer(privateKey, 'hex')).toString('hex'));
    let unsignedPayload, signedPayload, wallet;

    const hashPaymentAsWallet = payload => {
        const amountCurrencyHash = hash(
            payload.amount,
            payload.currency.ct,
            payload.currency.id
        );
        const senderHash = hash(
            payload.sender.wallet
        );
        const recipientHash = hash(
            payload.recipient.wallet
        );

        return hash(amountCurrencyHash, senderHash, recipientHash);
    };

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
                    hash: hashPaymentAsWallet(unsignedPayload),
                    signature: {
                        r: '0xb7421b9b8eabd78a4e669130cd4df49d03c2aeb2cb453cb2cc92c95d7db97091',
                        s: '0x3241c2f39fc4c64452c866c611671bc87b2c0b90ebadfcb67fd20ea774812b72',
                        v: 28
                    }
                }
            }
        };
    });

    context('a new Payment', () => {
        let payment;

        beforeEach(() => {
            wallet = new Wallet(privateKey, stubbedProvider);
            payment = new Payment(wallet, new MonetaryAmount(amount, currency.ct, currency.id), sender, recipient);
        });

        it('can be serialized to an object literal', () => {
            expect(payment.toJSON()).to.eql(unsignedPayload);
        });

        it('can be signed', async () => {
            await payment.sign();
            expect(payment.toJSON()).to.eql(signedPayload);
        });

        it('can be registered with the API', () => {
            payment.register();
            expect(stubbedProvider.registerPayment).to.have.been.calledWith(payment.toJSON());
        });

        it('has the supplied amount', () => {
            expect(payment.amount).to.be.equalMoney(new MonetaryAmount(amount, currency.ct, currency.id));
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

    context('given an invalid amount', () => {
        it('throws TypeError', () => {
            expect(() => new Payment(null, null)).to.throw(TypeError, /amount.*MonetaryAmount/i);
        });
    });

    context('a signed Payment', () => {
        let payment;

        beforeEach(async () => {
            wallet = new Wallet(privateKey, stubbedProvider);
            payment = new Payment(wallet, new MonetaryAmount(amount, currency.ct, currency.id), sender, recipient);
            await payment.sign();
        });

        it('can be serialized to an object literal', () => {
            expect(payment.toJSON()).to.eql(signedPayload);
        });

        it('can be registered with the API', () => {
            payment.register();
            expect(stubbedProvider.registerPayment).to.have.been.calledWith(signedPayload);
        });

        it('has the supplied amount', () => {
            expect(payment.amount).to.be.equalMoney(new MonetaryAmount(amount, currency.ct, currency.id));
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

    context('a serialized Payment', () => {
        let serializedPayment;
        beforeEach(() => {
            serializedPayment = {...unsignedPayload};
            wallet = new Wallet(privateKey, stubbedProvider);
        });

        it('can be de-serialized when passing a wallet', () => {
            const payment = Payment.from(wallet, serializedPayment);
            expect(payment.toJSON()).to.eql(serializedPayment);
        });

        it('can be de-serialized without passing a wallet', () => {
            const payment = Payment.from(null, serializedPayment);
            expect(payment.toJSON()).to.eql(serializedPayment);
        });
    });

    context('a de-serialized unsigned Payment', () => {
        let payment;

        beforeEach(() => {
            wallet = new Wallet(privateKey, stubbedProvider);
            payment = Payment.from(wallet, unsignedPayload);
        });

        it('can be serialized to a new object literal', () => {
            expect(payment.toJSON()).to.eql(unsignedPayload);
        });

        it('can be signed', async () => {
            await payment.sign();
            expect(payment.toJSON()).to.eql(signedPayload);
        });

        it('can be registered with the API', () => {
            payment.register();
            expect(stubbedProvider.registerPayment).to.have.been.calledWith(unsignedPayload);
        });

        it('has the supplied amount', () => {
            expect(payment.amount).to.be.equalMoney(new MonetaryAmount(amount, currency.ct, currency.id));
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
            payment = Payment.from(stubbedWallet, signedPayload);
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
            payment = Payment.from(stubbedWallet, modifiedPayload);
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
            payment = Payment.from(stubbedWallet, modifiedPayload);
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
            payment = Payment.from(stubbedWallet, modifiedPayload);
        });

        it('does not have a valid signature', () => {
            expect(payment.isSigned()).to.be.false;
        });
    });
});
