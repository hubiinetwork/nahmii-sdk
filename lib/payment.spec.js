'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
chai.use(sinonChai);

const {ApiPayloadFactory} = require('../test-utils');

const MonetaryAmount = require('./monetary-amount');
const uuidv4 = require('uuid/v4');

const expect = chai.expect;
const given = describe;
const when = describe;

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

        const expectedJSON = other.toJSON();
        const actualJSON = obj.toJSON();

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
    const senderRef = 'c3cc73cc-756a-11e9-957c-705ab6aee958';
    const uuidRegexp = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    let fixture;

    beforeEach(() => {
        fixture = new ApiPayloadFactory({
            senderPrivateKey: '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266',
            recipient: '0x0000000000000000000000000000000000000003',
            operatorPrivateKey: '252c772d9e9d570c726473927c52f23227cc674b6567935287d3f4a76a57d352',
            currency: {
                ct: '0x0000000000000000000000000000000000000001',
                id: '0'
            },
            amount: '1000'
        });
    });

    afterEach(() => {
        stubbedProvider.registerPayment.reset();
    });

    context('given a wallet', () => {
        let wallet;

        beforeEach(() => {
            wallet = new Wallet(fixture.senderPrivateKey, stubbedProvider);
        });

        context('a new Payment', () => {
            let payment;

            beforeEach(() => {
                payment = new Payment(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id), fixture.sender, fixture.recipient, wallet);
            });

            it('can be serialized to an object literal', () => {
                expect(payment.toJSON()).to.eql(fixture.createUnsignedPayment(payment.senderRef));
            });

            it('can be signed', async () => {
                await payment.sign();
                expect(payment.toJSON()).to.eql(await fixture.createSignedPayment(fixture.createUnsignedPayment(payment.senderRef)));
            });

            it('can be registered with the API', () => {
                payment.register();
                expect(stubbedProvider.registerPayment).to.have.been.calledWith(payment.toJSON());
            });

            it('has the supplied amount', () => {
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id));
            });

            it('has the supplied sender', () => {
                expect(payment.sender).to.eql(fixture.sender);
            });

            it('has the supplied recipient', () => {
                expect(payment.recipient).to.eql(fixture.recipient);
            });

            it('does not have a valid signature', () => {
                expect(payment.isSigned()).to.be.false;
            });

            it('has a UUID as sender ref', () => {
                expect(payment.senderRef).to.match(uuidRegexp);
            });

            it('has sender data in JSON that is base64 encoding of sender ref', () => {
                const expectedData = Buffer
                    .from(JSON.stringify({ref: payment.senderRef}))
                    .toString('base64');
                expect(payment.toJSON().sender.data).to.eql(expectedData);
            });
        });

        context('a signed Payment', () => {
            let payment, expectedSignedPayload;

            beforeEach(async () => {
                payment = new Payment(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id), fixture.sender, fixture.recipient, wallet);
                await payment.sign();
                expectedSignedPayload = await fixture.createSignedPayment(fixture.createUnsignedPayment(payment.senderRef));
            });

            it('can be serialized to an object literal', () => {
                expect(payment.toJSON()).to.eql(expectedSignedPayload);
            });

            it('can be registered with the API', () => {
                payment.register();
                expect(stubbedProvider.registerPayment).to.have.been.calledWith(expectedSignedPayload);
            });

            it('has the supplied amount', () => {
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id));
            });

            it('has the supplied sender', () => {
                expect(payment.sender).to.eql(fixture.sender);
            });

            it('has the supplied recipient', () => {
                expect(payment.recipient).to.eql(fixture.recipient);
            });

            it('has a valid signature', () => {
                expect(payment.isSigned()).to.be.true;
            });

            it('has a UUID as sender ref', () => {
                expect(payment.senderRef).to.match(uuidRegexp);
            });

            it('has sender data in JSON that is base64 encoding of sender ref', () => {
                const expectedData = Buffer
                    .from(JSON.stringify({ref: payment.senderRef}))
                    .toString('base64');
                expect(payment.toJSON().sender.data).to.eql(expectedData);
            });
        });

        context('a de-serialized unsigned Payment', () => {
            let payment, expectedSignedPayload;

            beforeEach(async () => {
                payment = Payment.from(fixture.createUnsignedPayment(senderRef), wallet);
                expectedSignedPayload = await fixture.createSignedPayment(fixture.createUnsignedPayment(payment.senderRef));
            });

            it('can be serialized to a new object literal', async () => {
                expect(payment.toJSON()).to.eql(fixture.createUnsignedPayment(payment.senderRef));
            });

            it('can be signed', async () => {
                await payment.sign();
                expect(payment.toJSON()).to.eql(expectedSignedPayload);
            });

            it('can be registered with the API', () => {
                payment.register();
                expect(stubbedProvider.registerPayment)
                    .to.have.been.calledWith(fixture.createUnsignedPayment(payment.senderRef));
            });

            it('has the supplied amount', () => {
                expect(payment.amount)
                    .to.be.equalMoney(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id));
            });

            it('has the supplied sender', () => {
                expect(payment.sender).to.eql(fixture.sender);
            });

            it('has the supplied recipient', () => {
                expect(payment.recipient).to.eql(fixture.recipient);
            });

            it('does not have a valid signature', () => {
                expect(payment.isSigned()).to.be.false;
            });

            it('has a UUID as sender ref', () => {
                expect(payment.senderRef).to.match(uuidRegexp);
            });

            it('has sender data in JSON that is base64 encoding of sender ref', () => {
                const expectedData = Buffer
                    .from(JSON.stringify({ref: payment.senderRef}))
                    .toString('base64');
                expect(payment.toJSON().sender.data).to.eql(expectedData);
            });
        });

        context('a de-serialized signed Payment', () => {
            let payment, signedPayload;

            beforeEach(async () => {
                signedPayload = await fixture.createSignedPayment(fixture.createUnsignedPayment('c3cc73cc-756a-11e9-957c-705ab6aee958'));
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
                expect(payment.amount).to.eql(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id));
            });

            it('has the supplied sender', () => {
                expect(payment.sender).to.eql(fixture.sender);
            });

            it('has the supplied recipient', () => {
                expect(payment.recipient).to.eql(fixture.recipient);
            });

            it('has a valid signature', () => {
                expect(payment.isSigned()).to.be.true;
            });

            it('has a UUID as sender ref', () => {
                expect(payment.senderRef).to.match(uuidRegexp);
            });

            it('has sender data in JSON that is base64 encoding of sender ref', () => {
                const expectedData = Buffer
                    .from(JSON.stringify({ref: payment.senderRef}))
                    .toString('base64');
                expect(payment.toJSON().sender.data).to.eql(expectedData);
            });
        });
    });

    context('given a provider', () => {
        context('a new Payment', () => {
            let payment;

            beforeEach(() => {
                payment = new Payment(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id), fixture.sender, fixture.recipient, stubbedProvider);
            });

            it('can be serialized to an object literal', () => {
                expect(payment.toJSON()).to.eql(fixture.createUnsignedPayment(payment.senderRef));
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
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id));
            });

            it('has the supplied sender', () => {
                expect(payment.sender).to.eql(fixture.sender);
            });

            it('has the supplied recipient', () => {
                expect(payment.recipient).to.eql(fixture.recipient);
            });

            it('does not have a valid signature', () => {
                expect(payment.isSigned()).to.be.false;
            });

            it('has a UUID as sender ref', () => {
                expect(payment.senderRef).to.match(uuidRegexp);
            });

            it('has sender data in JSON that is base64 encoding of sender ref', () => {
                const expectedData = Buffer
                    .from(JSON.stringify({ref: payment.senderRef}))
                    .toString('base64');
                expect(payment.toJSON().sender.data).to.eql(expectedData);
            });
        });

        context('a de-serialized unsigned Payment', () => {
            let payment;

            beforeEach(() => {
                payment = Payment.from(fixture.createUnsignedPayment(senderRef), stubbedProvider);
            });

            it('can be serialized to a new object literal', () => {
                expect(payment.toJSON()).to.eql(fixture.createUnsignedPayment(senderRef));
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
                expect(stubbedProvider.registerPayment).to.have.been.calledWith(fixture.createUnsignedPayment(senderRef));
            });

            it('has the supplied amount', () => {
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id));
            });

            it('has the supplied sender', () => {
                expect(payment.sender).to.eql(fixture.sender);
            });

            it('has the supplied recipient', () => {
                expect(payment.recipient).to.eql(fixture.recipient);
            });

            it('does not have a valid signature', () => {
                expect(payment.isSigned()).to.be.false;
            });

            it('has a UUID as sender ref', () => {
                expect(payment.senderRef).to.match(uuidRegexp);
            });

            it('has sender data in JSON that is base64 encoding of sender ref', () => {
                const expectedData = Buffer
                    .from(JSON.stringify({ref: payment.senderRef}))
                    .toString('base64');
                expect(payment.toJSON().sender.data).to.eql(expectedData);
            });
        });

        context('a de-serialized signed Payment', () => {
            let payment, signedPayload;

            beforeEach(async () => {
                signedPayload = await fixture.createSignedPayment(fixture.createUnsignedPayment(senderRef));
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
                expect(payment.amount).to.eql(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id));
            });

            it('has the supplied sender', () => {
                expect(payment.sender).to.eql(fixture.sender);
            });

            it('has the supplied recipient', () => {
                expect(payment.recipient).to.eql(fixture.recipient);
            });

            it('has a valid signature', () => {
                expect(payment.isSigned()).to.be.true;
            });

            it('has a UUID as sender ref', () => {
                expect(payment.senderRef).to.match(uuidRegexp);
            });

            it('has sender data in JSON that is base64 encoding of sender ref', () => {
                const expectedData = Buffer
                    .from(JSON.stringify({ref: payment.senderRef}))
                    .toString('base64');
                expect(payment.toJSON().sender.data).to.eql(expectedData);
            });
        });
    });

    context('given neither a wallet nor a provider', () => {
        context('a new Payment', () => {
            let payment;

            beforeEach(() => {
                payment = new Payment(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id), fixture.sender, fixture.recipient);
            });

            it('can be serialized to an object literal', () => {
                expect(payment.toJSON()).to.eql(fixture.createUnsignedPayment(payment.senderRef));
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
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id));
            });

            it('has the supplied sender', () => {
                expect(payment.sender).to.eql(fixture.sender);
            });

            it('has the supplied recipient', () => {
                expect(payment.recipient).to.eql(fixture.recipient);
            });

            it('does not have a valid signature', () => {
                expect(payment.isSigned()).to.be.false;
            });

            it('has a UUID as sender ref', () => {
                expect(payment.senderRef).to.match(uuidRegexp);
            });

            it('has sender data in JSON that is base64 encoding of sender ref', () => {
                const expectedData = Buffer
                    .from(JSON.stringify({ref: payment.senderRef}))
                    .toString('base64');
                expect(payment.toJSON().sender.data).to.eql(expectedData);
            });
        });

        context('a de-serialized unsigned Payment', () => {
            let payment;

            beforeEach(() => {
                payment = Payment.from(fixture.createUnsignedPayment(senderRef));
            });

            it('can be serialized to a new object literal', () => {
                expect(payment.toJSON()).to.eql(fixture.createUnsignedPayment(senderRef));
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
                expect(payment.amount).to.be.equalMoney(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id));
            });

            it('has the supplied sender', () => {
                expect(payment.sender).to.eql(fixture.sender);
            });

            it('has the supplied recipient', () => {
                expect(payment.recipient).to.eql(fixture.recipient);
            });

            it('does not have a valid signature', () => {
                expect(payment.isSigned()).to.be.false;
            });

            it('has a UUID as sender ref', () => {
                expect(payment.senderRef).to.match(uuidRegexp);
            });

            it('has sender data in JSON that is base64 encoding of sender ref', () => {
                const expectedData = Buffer
                    .from(JSON.stringify({ref: payment.senderRef}))
                    .toString('base64');
                expect(payment.toJSON().sender.data).to.eql(expectedData);
            });
        });

        context('a de-serialized signed Payment', () => {
            let payment;

            beforeEach(async () => {
                payment = Payment.from(await fixture.createSignedPayment(fixture.createUnsignedPayment(senderRef)));
            });

            it('can be serialized to a new object literal', async () => {
                expect(payment.toJSON()).to.eql(await fixture.createSignedPayment(fixture.createUnsignedPayment(senderRef)));
            });

            it('can not be registered with the API', (done) => {
                payment.register().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no provider/i);
                    done();
                });
            });

            it('has the supplied amount', () => {
                expect(payment.amount).to.eql(MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id));
            });

            it('has the supplied sender', () => {
                expect(payment.sender).to.eql(fixture.sender);
            });

            it('has the supplied recipient', () => {
                expect(payment.recipient).to.eql(fixture.recipient);
            });

            it('has a valid signature', () => {
                expect(payment.isSigned()).to.be.true;
            });

            it('has a UUID as sender ref', () => {
                expect(payment.senderRef).to.match(uuidRegexp);
            });

            it('has sender data in JSON that is base64 encoding of sender ref', () => {
                const expectedData = Buffer
                    .from(JSON.stringify({ref: payment.senderRef}))
                    .toString('base64');
                expect(payment.toJSON().sender.data).to.eql(expectedData);
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
            const modifiedPayload = fixture.createUnsignedPayment(senderRef);
            modifiedPayload.sender.data = null;
            payment = Payment.from(modifiedPayload, stubbedWallet);
        });

        it('has a new sender reference', () => {
            expect(payment.senderRef).to.not.eql('');
            expect(payment.senderRef).to.not.eql(senderRef);
        });

        it('has a UUID as sender ref', () => {
            expect(payment.senderRef).to.match(uuidRegexp);
        });

        it('has sender data in JSON that is base64 encoding of sender ref', () => {
            const expectedData = Buffer
                .from(JSON.stringify({ref: payment.senderRef}))
                .toString('base64');
            expect(payment.toJSON().sender.data).to.eql(expectedData);
        });
    });

    context('a de-serialized unsigned Payment that has malformed sender data', () => {
        let payment;

        beforeEach(() => {
            const modifiedPayload = fixture.createUnsignedPayment(senderRef);
            modifiedPayload.sender.data = 'asdasdasdasasd';
            payment = Payment.from(modifiedPayload, stubbedWallet);
        });

        it('has a new sender reference', () => {
            expect(payment.senderRef).to.not.eql('');
            expect(payment.senderRef).to.not.eql(senderRef);
        });

        it('has a UUID as sender ref', () => {
            expect(payment.senderRef).to.match(uuidRegexp);
        });

        it('has sender data in JSON that is base64 encoding of sender ref', () => {
            const expectedData = Buffer
                .from(JSON.stringify({ref: payment.senderRef}))
                .toString('base64');
            expect(payment.toJSON().sender.data).to.eql(expectedData);
        });
    });

    context('a de-serialized signed Payment that has been tampered with (amount)', () => {
        let payment, modifiedPayload;

        beforeEach(async () => {
            modifiedPayload = await fixture.createSignedPayment(fixture.createUnsignedPayment(senderRef));
            modifiedPayload.amount = '999999';
            payment = Payment.from(modifiedPayload, stubbedWallet);
        });

        it('has the modified amount', () => {
            expect(payment.amount).to.eql(MonetaryAmount.from(modifiedPayload.amount, fixture.currency.ct, fixture.currency.id));
        });

        it('does not have a valid signature', () => {
            expect(payment.isSigned()).to.be.false;
        });
    });

    context('a de-serialized signed Payment that has been tampered with (sender)', () => {
        let payment, modifiedPayload;

        beforeEach(async () => {
            modifiedPayload = await fixture.createSignedPayment(fixture.createUnsignedPayment(senderRef));
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

        beforeEach(async () => {
            modifiedPayload = await fixture.createSignedPayment(fixture.createUnsignedPayment(senderRef));
            modifiedPayload.seals.wallet.signature = '0xffff9e389115e663107162f9049da8ed06670a53dd6b3bb77165940b6a55eba3156f788625446d6e553dd448608445f122803556c015559b32cf66d781e7d85b18';
            payment = Payment.from(modifiedPayload, stubbedWallet);
        });

        it('does not have a valid signature', () => {
            expect(payment.isSigned()).to.be.false;
        });
    });

    given('a Payment constructor that optionally accepts a senderRef', () => {
        let amount, sender, recipient, wallet;

        beforeEach(() => {
            amount = MonetaryAmount.from(fixture.amount, fixture.currency.ct, fixture.currency.id);
            sender = fixture.sender;
            recipient = fixture.recipient;
            wallet = new Wallet(fixture.senderPrivateKey, stubbedProvider);
        });

        when('constructing Payments', () => {
            it ('creates Payments with random senderRef property if input senderRef is undefined', () => {
                const refSet = new Set();

                for (let i = 0; i < 10; ++i) {
                    const payment = new Payment(amount, sender, recipient, wallet);
                    expect(refSet.has(payment.senderRef)).to.equal(false);
                    refSet.add(payment.senderRef);
                }
            });

            it ('creates Payments with senderRef property equal to input senderRef if defined', () => {
                for (let i = 0; i < 10; ++i) {
                    const inputSenderRef = uuidv4();
                    const payment = new Payment(amount, sender, recipient, wallet, inputSenderRef);
                    expect(payment.senderRef).to.equal(inputSenderRef);
                }
            });

            it ('creates Payments regardless of senderRef character case', () => {
                expect(new Payment(amount, sender, recipient, wallet, uuidv4().toLowerCase())).to.be.instanceof(Payment);
                expect(new Payment(amount, sender, recipient, wallet, uuidv4().toUpperCase())).to.be.instanceof(Payment);
            });

            it ('throws if input input senderRef is not valid', () => {
                expect(() => new Payment(amount, sender, recipient, wallet, 'something weird')).to.throw(/senderRef is not a uuid string/);
            });
        });
    });
});
