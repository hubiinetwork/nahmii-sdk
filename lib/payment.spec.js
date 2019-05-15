'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const expect = chai.expect;
chai.use(sinonChai);

const MonetaryAmount = require('./monetary-amount');

const {privateToAddress} = require('ethereumjs-util');
const {hash, prefix0x} = require('./utils');

const Wallet = proxyquire('./wallet/wallet', {
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

const Payment = proxyquire('./payment', {
    './wallet': Wallet
});

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
    const sender = prefix0x(privateToAddress(Buffer.from(privateKey, 'hex')).toString('hex'));
    let unsignedPayload, signedPayload;

    const hashPaymentAsWallet = payload => {
        const amountCurrencyHash = hash(
            payload.amount,
            payload.currency.ct,
            payload.currency.id
        );
        const senderHash = hash(
            payload.sender.wallet,
            payload.sender.data,
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
                wallet: sender,
                data: 'data'
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
                        r: '0x72e01a17545dfdd2cd5c7f34d7459f71579aad968cec0026fe34d1ae59168346',
                        s: '0x767ac6c2d6e02bd092689c202e2f4935ca5779ac6e5c183f0e0d7095e01b1702',
                        v: 27
                    }
                }
            }
        };
    });

    afterEach(() => {
        stubbedProvider.registerPayment.reset();
    });

    context('given a wallet', () => {
        let wallet;

        beforeEach(() => {
            wallet = new Wallet(privateKey, stubbedProvider);
        });

        context('a new Payment', () => {
            let payment;

            beforeEach(() => {
                payment = Payment.from(unsignedPayload, wallet);
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
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(amount, currency.ct, currency.id));
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

            beforeEach(async () => {
                payment = Payment.from(unsignedPayload, wallet);
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
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(amount, currency.ct, currency.id));
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
                payment = Payment.from(unsignedPayload, wallet);
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
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(amount, currency.ct, currency.id));
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
                payment = Payment.from(signedPayload, wallet);
            });

            it('can be serialized to a new object literal', () => {
                expect(payment.toJSON()).to.eql(signedPayload);
            });

            it('can be registered with the API', () => {
                payment.register();
                expect(stubbedProvider.registerPayment).to.have.been.calledWith(signedPayload);
            });

            it('has the supplied amount', () => {
                expect(payment.amount).to.eql(MonetaryAmount.from(amount, currency.ct, currency.id));
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
    });

    context('given a provider', () => {
        context('a new Payment', () => {
            let payment;

            beforeEach(() => {
                payment = Payment.from(unsignedPayload, stubbedProvider);
            });

            it('can be serialized to an object literal', () => {
                expect(payment.toJSON()).to.eql(unsignedPayload);
            });

            it('can not be signed', (done) => {
                payment.sign().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no wallet/i);
                    done();
                });
            });

            it('can be registered with the API', () => {
                payment.register();
                expect(stubbedProvider.registerPayment).to.have.been.calledWith(payment.toJSON());
            });

            it('has the supplied amount', () => {
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(amount, currency.ct, currency.id));
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

        context('a de-serialized unsigned Payment', () => {
            let payment;

            beforeEach(() => {
                payment = Payment.from(unsignedPayload, stubbedProvider);
            });

            it('can be serialized to a new object literal', () => {
                expect(payment.toJSON()).to.eql(unsignedPayload);
            });

            it('can not be signed', (done) => {
                payment.sign().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no wallet/i);
                    done();
                });
            });

            it('can be registered with the API', () => {
                payment.register();
                expect(stubbedProvider.registerPayment).to.have.been.calledWith(unsignedPayload);
            });

            it('has the supplied amount', () => {
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(amount, currency.ct, currency.id));
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
                payment = Payment.from(signedPayload, stubbedProvider);
            });

            it('can be serialized to a new object literal', () => {
                expect(payment.toJSON()).to.eql(signedPayload);
            });

            it('can be registered with the API', () => {
                payment.register();
                expect(stubbedProvider.registerPayment).to.have.been.calledWith(signedPayload);
            });

            it('has the supplied amount', () => {
                expect(payment.amount).to.eql(MonetaryAmount.from(amount, currency.ct, currency.id));
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
    });

    context('given neither a wallet nor a provider', () => {
        context('a new Payment', () => {
            let payment;

            beforeEach(() => {
                payment = Payment.from(unsignedPayload);
            });

            it('can be serialized to an object literal', () => {
                expect(payment.toJSON()).to.eql(unsignedPayload);
            });

            it('can not be signed', (done) => {
                payment.sign().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no wallet/i);
                    done();
                });
            });

            it('can not be registered with the API', (done) => {
                payment.register().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no provider/i);
                    done();
                });
            });

            it('has the supplied amount', () => {
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(amount, currency.ct, currency.id));
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

        context('a de-serialized unsigned Payment', () => {
            let payment;

            beforeEach(() => {
                payment = Payment.from(unsignedPayload);
            });

            it('can be serialized to a new object literal', () => {
                expect(payment.toJSON()).to.eql(unsignedPayload);
            });

            it('can not be signed', (done) => {
                payment.sign().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no wallet/i);
                    done();
                });
            });

            it('can not be registered with the API', (done) => {
                payment.register().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no provider/i);
                    done();
                });
            });

            it('has the supplied amount', () => {
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(amount, currency.ct, currency.id));
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
                payment = Payment.from(signedPayload);
            });

            it('can be serialized to a new object literal', () => {
                expect(payment.toJSON()).to.eql(signedPayload);
            });

            it('can not be registered with the API', (done) => {
                payment.register().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no provider/i);
                    done();
                });
            });

            it('has the supplied amount', () => {
                expect(payment.amount).to.eql(MonetaryAmount.from(amount, currency.ct, currency.id));
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
    });

    context('given an invalid amount', () => {
        it('throws TypeError', () => {
            expect(() => new Payment(null, null)).to.throw(TypeError, /amount.*MonetaryAmount/i);
        });
    });

    context('a de-serialized unsigned Payment that has a null sender data', () => {
        let payment;

        beforeEach(() => {
            const modifiedPayload = {...unsignedPayload, sender: {wallet: sender}};
            payment = Payment.from(modifiedPayload, stubbedWallet);
        });
        
        it('has empty string for the sender data', () => {
            expect(payment.toJSON().sender.data).to.equal('');
        });
    });

    context('a de-serialized signed Payment that has been tampered with (amount)', () => {
        let payment, modifiedPayload;

        beforeEach(() => {
            modifiedPayload = {...signedPayload};
            modifiedPayload.amount = '999999';
            payment = Payment.from(modifiedPayload, stubbedWallet);
        });

        it('has the modified amount', () => {
            expect(payment.amount).to.eql(MonetaryAmount.from(modifiedPayload.amount, currency.ct, currency.id));
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
            payment = Payment.from(modifiedPayload, stubbedWallet);
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
            payment = Payment.from(modifiedPayload, stubbedWallet);
        });

        it('does not have a valid signature', () => {
            expect(payment.isSigned()).to.be.false;
        });
    });
});
