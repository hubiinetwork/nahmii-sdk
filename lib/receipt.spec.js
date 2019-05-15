'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const expect = chai.expect;
chai.use(sinonChai);
chai.use(chaiAsPromised);

const {privateToAddress} = require('ethereumjs-util');
const {hash, prefix0x} = require('./utils');

const amount = '1000';
const currency = {ct: '0x0000000000000000000000000000000000000001', id: '0'};
const recipient = '0x0000000000000000000000000000000000000003';
const senderKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
const sender = prefix0x(privateToAddress(Buffer.from(senderKey, 'hex')).toString('hex'));
const operatorKey = '252c772d9e9d570c726473927c52f23227cc674b6567935287d3f4a76a57d352';
const operatorAddress = prefix0x(privateToAddress(Buffer.from(operatorKey, 'hex')).toString('hex'));

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

const stubbedProvider = {
    operatorAddress,
    effectuatePayment: sinon.stub()
};


describe('Receipt', () => {
    let signedPayload, unsignedPayload, receipt;

    function hashFeesTotal(totalFigures) {
        let feesTotalHash = 0;
        for (let i = 0; i < totalFigures.length; i++) {
            feesTotalHash = hash(
                feesTotalHash,
                totalFigures[i].originId,
                totalFigures[i].figure.amount,
                totalFigures[i].figure.currency.ct,
                totalFigures[i].figure.currency.id
            );
        }
        return feesTotalHash;
    }

    function hashPaymentAsOperator(payment) {
        const walletSignatureHash = hash(
            {type: 'uint8', value: payment.seals.wallet.signature.v},
            payment.seals.wallet.signature.r,
            payment.seals.wallet.signature.s
        );

        const senderHash = hash(
            hash(payment.sender.nonce),
            hash(
                payment.sender.balances.current,
                payment.sender.balances.previous
            ),
            hash(
                payment.sender.fees.single.amount,
                payment.sender.fees.single.currency.ct,
                payment.sender.fees.single.currency.id,
            ),
            hashFeesTotal(payment.sender.fees.total)
        );

        const recipientHash = hash(
            hash(payment.recipient.nonce),
            hash(
                payment.recipient.balances.current,
                payment.recipient.balances.previous
            ),
            hashFeesTotal(payment.recipient.fees.total)
        );
        const transfersHash = hash(
            payment.transfers.single,
            payment.transfers.total
        );
        const operatorHash = hash(
            payment.operator.data
        );
        return hash(walletSignatureHash, senderHash, recipientHash, transfersHash, operatorHash);
    }

    async function signPaymentAsWallet(json) {
        const senderWallet = new Wallet(senderKey);
        const payment = Payment.from(json, senderWallet);
        await payment.sign();
        const paymentJSON = payment.toJSON();
        json.seals.wallet = paymentJSON.seals.wallet;
    }

    beforeEach(async () => {
        unsignedPayload = {
            amount,
            currency,
            seals: {},
            blockNumber: 1,
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
                    total: [
                        {
                            originId: '1',
                            figure: {
                                currency,
                                amount: '1000000000000000000'
                            }
                        }
                    ]
                },
                data: 'data'
            },
            recipient: {
                nonce: 1,
                wallet: recipient,
                balances: {
                    current: '100',
                    previous: '0'
                },
                fees: {
                    total: [
                        {
                            originId: '1',
                            figure: {
                                currency: {
                                    ct: '0x0000000000000000000000000000000000000001',
                                    id: '1'
                                },
                                amount: '1000000000000000000'
                            }
                        }
                    ]
                }
            },
            transfers: {
                single: '100',
                total: '100'
            },
            operator: {
                id: 0,
                data: 'data'
            }
        };

        await signPaymentAsWallet(unsignedPayload);

        signedPayload = {
            ...unsignedPayload,
            seals: {
                ...unsignedPayload.seals,
                operator: {
                    hash: hashPaymentAsOperator(unsignedPayload),
                    signature: {
                        r: '0x259d290b4366a9346c88297f2e73dc7c2eb5a0e4636faea2bd5b8d9165cd7af8',
                        s: '0x1643ae02ad76af082ac6cc5f2936b62378d505197869f86f2331c3b78e84fa3a',
                        v: 27
                    }
                }
            }
        };
    });

    afterEach(() => {
        stubbedProvider.effectuatePayment.reset();
    });

    context('given a wallet', () => {
        let wallet;

        beforeEach(() => {
            wallet = new Wallet(operatorKey, stubbedProvider);
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
                    it('can not be signed', () => {
                        let modifiedPayload = {...unsignedPayload};
                        modifier(modifiedPayload);
                        let incompleteReceipt = Receipt.from(modifiedPayload, wallet);
                        expect(incompleteReceipt.sign()).to.be.rejected;
                    });
                });
            });
        });

        context('a de-serialized unsigned Receipt', () => {
            beforeEach(() => {
                receipt = Receipt.from(unsignedPayload, wallet);
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

            it('can be signed', async () => {
                await receipt.sign();
                expect(receipt.toJSON()).to.eql(signedPayload);
                expect(receipt.isSigned()).to.eql(true);
            });

            validateAllReceiptProperties();
        });

        context('a de-serialized signed Receipt that has no recipient fees', () => {
            let modifiedPayload;

            beforeEach(() => {
                modifiedPayload = {...signedPayload};
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
            beforeEach(() => {
                wallet = new Wallet(operatorKey, stubbedProvider);
                receipt = Receipt.from(signedPayload, wallet);
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

            validateAllReceiptProperties();
        });

        context('a de-serialized signed Receipt that has been tampered with (sender)', () => {
            let modifiedPayload;

            beforeEach(() => {
                modifiedPayload = {...signedPayload};
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
                    it('can not be signed', () => {
                        let modifiedPayload = {...unsignedPayload};
                        modifier(modifiedPayload);
                        let incompleteReceipt = Receipt.from(modifiedPayload, stubbedProvider);
                        expect(incompleteReceipt.sign()).to.be.rejected;
                    });
                });
            });
        });

        context('a de-serialized unsigned Receipt', () => {
            beforeEach(() => {
                receipt = Receipt.from(unsignedPayload, stubbedProvider);
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

            beforeEach(() => {
                modifiedPayload = {...unsignedPayload};
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
    
            beforeEach(() => {
                const modifiedPayload = {...unsignedPayload, operator: {id: 0}};
                receipt = Receipt.from(modifiedPayload, stubbedProvider);
            });
            
            it('has empty string for the operator data', () => {
                expect(receipt.toJSON().operator.data).to.equal('');
            });
        });

        context('a de-serialized signed Receipt', () => {
            beforeEach(() => {
                receipt = Receipt.from(signedPayload, stubbedProvider);
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

            beforeEach(() => {
                modifiedPayload = {...signedPayload};
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
                    it('can not be signed', () => {
                        let modifiedPayload = {...unsignedPayload};
                        modifier(modifiedPayload);
                        let incompleteReceipt = Receipt.from(modifiedPayload);
                        expect(incompleteReceipt.sign()).to.be.rejected;
                    });
                });
            });
        });

        context('a de-serialized unsigned Receipt', () => {
            beforeEach(() => {
                receipt = Receipt.from(unsignedPayload);
            });

            it('can be serialized to a new object literal', () => {
                expect(receipt.toJSON()).to.eql(unsignedPayload);
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

            beforeEach(() => {
                modifiedPayload = {...unsignedPayload};
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
            beforeEach(() => {
                receipt = Receipt.from(signedPayload);
            });

            it('can be serialized to a new object literal', () => {
                expect(receipt.toJSON()).to.eql(signedPayload);
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

            beforeEach(() => {
                modifiedPayload = {...signedPayload};
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

        it('has a block number', () => {
            expect(receipt.blockNumber).to.eql(unsignedPayload.blockNumber);
        });

        it('has an operator ID', () => {
            expect(receipt.operatorId).to.eql(unsignedPayload.operator.id);
        });

        it('has a sender nonce', () => {
            expect(receipt.senderNonce).to.eql(unsignedPayload.sender.nonce);
        });

        it('has a recipient nonce', () => {
            expect(receipt.recipientNonce).to.eql(unsignedPayload.recipient.nonce);
        });

        it('has a sender', function() {
            expect(receipt.sender).to.eql(unsignedPayload.sender.wallet);
        });

        it('has a recipient', () => {
            expect(receipt.recipient).to.eql(unsignedPayload.recipient.wallet);
        });
    }
});
