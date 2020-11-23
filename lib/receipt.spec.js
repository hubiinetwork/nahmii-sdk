'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const expect = chai.expect;
chai.use(sinonChai);
chai.use(chaiAsPromised);

const {ApiPayloadFactory} = require('../test-utils');

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

const Receipt = proxyquire('./receipt', {
    './wallet': Wallet,
    './payment': Payment
});


describe('Receipt', () => {
    let receipt, fixture, stubbedProvider;
    const senderRef = '3f527f36-76e3-11e9-bcfb-705ab6aee958';
    const senderPayload = 'some sender payload';

    async function createUnsignedReceiptPayload() {
        return fixture.createUnsignedReceipt(
            await fixture.createSignedPayment(
                fixture.createUnsignedPayment(senderPayload, senderRef)
            )
        );
    }

    async function createSignedReceiptPayload() {
        return fixture.createSignedReceipt(
            await createUnsignedReceiptPayload()
        );
    }

    beforeEach(function() {
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
        stubbedProvider = {
            operatorAddress: fixture.operator,
            effectuatePayment: sinon.stub()
        };
    });

    afterEach(() => {
        stubbedProvider.effectuatePayment.reset();
    });

    context('given a wallet', () => {
        let wallet;

        beforeEach(() => {
            wallet = new Wallet(fixture.operatorPrivateKey, stubbedProvider);
        });

        context('a new Receipt', () => {
            beforeEach(() => {
                receipt = new Receipt(undefined, wallet);
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

            it('does not have a payment', () => {
                expect(receipt.payment).to.be.undefined;
            });
        });

        context('a serialized incomplete Receipt', () => {
            it('can not be de-serialized', () => {
                expect(() => Receipt.from({}, wallet)).to.throw();
            });
        });

        context('a de-serialized incomplete Receipt', () => {
            [
                payload => delete payload.sender.fees.single,
                payload => delete payload.sender.balances.current
            ].forEach(modifier => {
                context('when ' + modifier.toString(), () => {
                    it('can not be signed', async () => {
                        const payload = await createUnsignedReceiptPayload();
                        modifier(payload);
                        const incompleteReceipt = Receipt.from(payload, wallet);
                        expect(incompleteReceipt.sign()).to.be.rejected;
                    });
                });
            });
        });

        context('a de-serialized unsigned Receipt', () => {
            beforeEach(async () => {
                receipt = Receipt.from(await createUnsignedReceiptPayload(), wallet);
            });

            it('can be serialized to a new object literal', async () => {
                expect(receipt.toJSON()).to.eql(await createUnsignedReceiptPayload());
            });

            it('can be registered with the API', () => {
                receipt.effectuate();
                expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
            });

            it('does not have a valid signature', () => {
                expect(receipt.isSigned()).to.be.false;
            });

            it('can be signed', async () => {
                await receipt.sign();
                expect(receipt.toJSON()).to.eql(await createSignedReceiptPayload());
                expect(receipt.isSigned()).to.eql(true);
            });

            validateAllReceiptProperties();
        });

        context('a de-serialized signed Receipt that has no recipient fees', () => {
            let modifiedPayload;

            beforeEach(async () => {
                modifiedPayload = await createSignedReceiptPayload();
                modifiedPayload.recipient.fees = {total: []};
                receipt = Receipt.from(modifiedPayload, wallet);
            });

            it('can be serialized to a new object literal with empty fees property', () => {
                expect(receipt.toJSON().recipient.fees).to.eql({total: []});
            });

            it('can be registered with the API', () => {
                receipt.effectuate();
                expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
            });

            it('does not have a valid signature', () => {
                expect(receipt.isSigned()).to.be.false;
            });

            it('can be signed', async () => {
                await receipt.sign();
                expect(receipt.isSigned()).to.eql(true);
            });

            validateAllReceiptProperties();
        });

        context('a de-serialized signed Receipt', () => {
            beforeEach(async () => {
                wallet = new Wallet(fixture.operatorPrivateKey, stubbedProvider);
                receipt = Receipt.from(await createSignedReceiptPayload(), wallet);
            });

            it('can be serialized to a new object literal', async () => {
                expect(receipt.toJSON()).to.eql(await createSignedReceiptPayload());
            });

            it('can be registered with the API', () => {
                receipt.effectuate();
                expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
            });

            it('has a valid signature', () => {
                expect(receipt.isSigned()).to.be.true;
            });

            it('can be signed', async () => {
                receipt.sign(fixture.operatorPrivateKey);
                expect(receipt.toJSON()).to.eql(await createSignedReceiptPayload());
            });

            validateAllReceiptProperties();
        });

        context('a de-serialized signed Receipt that has been tampered with (sender)', () => {
            let modifiedPayload;

            beforeEach(async () => {
                modifiedPayload = await createSignedReceiptPayload();
                modifiedPayload.sender.wallet = '0';
                receipt = Receipt.from(modifiedPayload, wallet);
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

            it('has an invalid payment', () => {
                expect(receipt.payment.isSigned()).to.be.false;
            });
        });
    });

    context('given a provider', () => {
        context('a new Receipt', () => {
            beforeEach(() => {
                receipt = new Receipt(undefined, stubbedProvider);
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

            it('does not have a payment', () => {
                expect(receipt.payment).to.be.undefined;
            });
        });

        context('a serialized incomplete Receipt', () => {
            it('can not be de-serialized', () => {
                expect(() => Receipt.from({}, stubbedProvider)).to.throw();
            });
        });

        context('a de-serialized incomplete Receipt', () => {
            [
                payload => delete payload.sender.fees.single,
                payload => delete payload.sender.balances.current,
                payload => delete payload.nonce
            ].forEach(modifier => {
                context('when ' + modifier.toString(), () => {
                    it('can not be signed', async () => {
                        const modifiedPayload = await createUnsignedReceiptPayload();
                        modifier(modifiedPayload);
                        const incompleteReceipt = Receipt.from(modifiedPayload, stubbedProvider);
                        expect(incompleteReceipt.sign()).to.be.rejected;
                    });
                });
            });
        });

        context('a de-serialized unsigned Receipt', () => {
            beforeEach(async () => {
                const payload = await createUnsignedReceiptPayload();
                receipt = Receipt.from(payload, stubbedProvider);
            });

            it('can be serialized to a new object literal', async () => {
                expect(receipt.toJSON()).to.eql(await createUnsignedReceiptPayload());
            });

            it('can be registered with the API', () => {
                receipt.effectuate();
                expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
            });

            it('does not have a valid signature', () => {
                expect(receipt.isSigned()).to.be.false;
            });

            it('can not be signed', (done) => {
                receipt.sign().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no wallet/i);
                    done();
                });
            });

            validateAllReceiptProperties();
        });

        context('a de-serialized unsigned Receipt that has no fees', () => {
            let modifiedPayload;

            beforeEach(async () => {
                modifiedPayload = await createUnsignedReceiptPayload();
                modifiedPayload.recipient.fees = {total: []};
                receipt = Receipt.from(modifiedPayload, stubbedProvider);
            });

            it('can be serialized to a new object literal with empty fees property', () => {
                expect(receipt.toJSON().recipient.fees).to.eql({total: []});
            });

            it('can be registered with the API', () => {
                receipt.effectuate();
                expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
            });

            it('does not have a valid signature', () => {
                expect(receipt.isSigned()).to.be.false;
            });

            it('can not be signed', (done) => {
                receipt.sign().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no wallet/i);
                    done();
                });
            });

            validateAllReceiptProperties();
        });

        context('a de-serialized unsigned Receipt that has a null operator data', () => {
            let receipt;

            beforeEach(async () => {
                const modifiedPayload = await createUnsignedReceiptPayload();
                modifiedPayload.operator.data = null;
                receipt = Receipt.from(modifiedPayload, stubbedProvider);
            });

            it('has empty literal encoded as the operator data', () => {
                expect(receipt.toJSON().operator.data).to.equal(ApiPayloadFactory.encodeLiteral({}));
            });
        });

        context('a de-serialized signed Receipt', () => {
            beforeEach(async () => {
                receipt = Receipt.from(await createSignedReceiptPayload(), stubbedProvider);
            });

            it('can be serialized to a new object literal', async () => {
                expect(receipt.toJSON()).to.eql(await createSignedReceiptPayload());
            });

            it('can be registered with the API', () => {
                receipt.effectuate();
                expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
            });

            it('has a valid signature', () => {
                expect(receipt.isSigned()).to.be.true;
            });

            it('can not be signed', (done) => {
                receipt.sign().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no wallet/i);
                    done();
                });
            });

            validateAllReceiptProperties();
        });

        context('a de-serialized signed Receipt that has been tampered with (sender)', () => {
            let modifiedPayload;

            beforeEach(async () => {
                modifiedPayload = await createSignedReceiptPayload();
                modifiedPayload.sender.wallet = '0';
                receipt = Receipt.from(modifiedPayload, stubbedProvider);
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

            it('has an invalid payment', () => {
                expect(receipt.payment.isSigned()).to.be.false;
            });
        });
    });

    context('given neither a wallet nor a provider', () => {
        context('a new Receipt', () => {
            beforeEach(() => {
                receipt = new Receipt();
            });

            it('can be serialized to a new object literal', () => {
                expect(receipt.toJSON()).to.eql({});
            });

            it('can not be registered with the API', (done) => {
                receipt.effectuate().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no provider/i);
                    done();
                });
            });

            it('can not validate signature', () => {
                expect(() => receipt.isSigned()).to.throw(Error, /validate signature.*provider.*wallet/);
            });

            it('does not have a payment', () => {
                expect(receipt.payment).to.be.undefined;
            });
        });

        context('a serialized incomplete Receipt', () => {
            it('can not be de-serialized', () => {
                expect(() => Receipt.from({})).to.throw();
            });
        });

        context('a de-serialized incomplete Receipt', () => {
            [
                payload => delete payload.sender.fees.single,
                payload => delete payload.sender.balances.current,
                payload => delete payload.nonce
            ].forEach(modifier => {
                context('when ' + modifier.toString(), () => {
                    it('can not be signed', async () => {
                        const modifiedPayload = await createUnsignedReceiptPayload();
                        modifier(modifiedPayload);
                        const incompleteReceipt = Receipt.from(modifiedPayload);
                        expect(incompleteReceipt.sign()).to.be.rejected;
                    });
                });
            });
        });

        context('a de-serialized unsigned Receipt', () => {
            beforeEach(async () => {
                receipt = Receipt.from(await createUnsignedReceiptPayload());
            });

            it('can be serialized to a new object literal', async () => {
                expect(receipt.toJSON()).to.eql(await createUnsignedReceiptPayload());
            });

            it('can not be registered with the API', (done) => {
                receipt.effectuate().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no provider/i);
                    done();
                });
            });

            it('can not validate signature', () => {
                expect(() => receipt.isSigned()).to.throw(Error, /validate signature.*provider.*wallet/);
            });

            it('can not be signed', (done) => {
                receipt.sign().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no wallet/i);
                    done();
                });
            });

            validateAllReceiptProperties();
        });

        context('a de-serialized unsigned Receipt that has no fees', () => {
            let modifiedPayload;

            beforeEach(async () => {
                modifiedPayload = await createUnsignedReceiptPayload();
                modifiedPayload.recipient.fees = {total: []};
                receipt = Receipt.from(modifiedPayload);
            });

            it('can be serialized to a new object literal with empty fees property', () => {
                expect(receipt.toJSON().recipient.fees).to.eql({total: []});
            });

            it('can not be registered with the API', (done) => {
                receipt.effectuate().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no provider/i);
                    done();
                });
            });

            it('can not validate signature', () => {
                expect(() => receipt.isSigned()).to.throw(Error, /validate signature.*provider.*wallet/);
            });

            it('can not be signed', (done) => {
                receipt.sign().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no wallet/i);
                    done();
                });
            });

            validateAllReceiptProperties();
        });

        context('a de-serialized signed Receipt', () => {
            beforeEach(async () => {
                receipt = Receipt.from(await createSignedReceiptPayload());
            });

            it('can be serialized to a new object literal', async () => {
                expect(receipt.toJSON()).to.eql(await createSignedReceiptPayload());
            });

            it('can not be registered with the API', (done) => {
                receipt.effectuate().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no provider/i);
                    done();
                });
            });

            it('can not validate signature', () => {
                expect(() => receipt.isSigned()).to.throw(Error, /validate signature.*provider.*wallet/);
            });

            it('can not be signed', (done) => {
                receipt.sign().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no wallet/i);
                    done();
                });
            });

            validateAllReceiptProperties();
        });

        context('a de-serialized signed Receipt that has been tampered with (sender)', () => {
            let modifiedPayload;

            beforeEach(async () => {
                modifiedPayload = await createSignedReceiptPayload();
                modifiedPayload.sender.wallet = '0';
                receipt = Receipt.from(modifiedPayload);
            });

            it('can not be registered with the API', (done) => {
                receipt.effectuate().catch(e => {
                    expect(e).to.be.an.instanceOf(Error);
                    expect(e.message).to.match(/no provider/i);
                    done();
                });
            });

            it('has the modified sender', () => {
                expect(receipt.toJSON().sender.wallet).to.eql(modifiedPayload.sender.wallet);
            });

            it('can not validate signature', () => {
                expect(() => receipt.isSigned()).to.throw(Error, /validate signature.*provider.*wallet/);
            });

            it('has an invalid payment', () => {
                expect(receipt.payment.isSigned()).to.be.false;
            });
        });
    });

    function validateAllReceiptProperties() {

        it('has a valid payment', () => {
            expect(receipt.payment.isSigned()).to.be.true;
        });

        it('has a block number', async () => {
            const payload = await createUnsignedReceiptPayload();
            expect(receipt.blockNumber).to.eql(payload.blockNumber);
        });

        it('has an operator ID', async () => {
            const payload = await createUnsignedReceiptPayload();
            expect(receipt.operatorId).to.eql(payload.operator.id);
        });

        it('has a sender nonce', async () => {
            const payload = await createUnsignedReceiptPayload();
            expect(receipt.senderNonce).to.eql(payload.sender.nonce);
        });

        it('has a recipient nonce', async () => {
            const payload = await createUnsignedReceiptPayload();
            expect(receipt.recipientNonce).to.eql(payload.recipient.nonce);
        });

        it('has a sender', async () => {
            const payload = await createUnsignedReceiptPayload();
            expect(receipt.sender).to.eql(payload.sender.wallet);
        });

        it('has a recipient', async () => {
            const payload = await createUnsignedReceiptPayload();
            expect(receipt.recipient).to.eql(payload.recipient.wallet);
        });
    }
});
