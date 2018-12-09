'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const expect = chai.expect;
chai.use(sinonChai);
chai.use(chaiAsPromised);

const Receipt = require('./receipt');

const {privateToAddress} = require('ethereumjs-util');
const {hash, prefix0x} = require('./utils');
const Payment = require('./payment');

const amount = '1000';
const currency = {ct:'0x0000000000000000000000000000000000000001', id: '0'};
const recipient = '0x0000000000000000000000000000000000000003';
const senderKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
const sender = prefix0x(privateToAddress(new Buffer(senderKey, 'hex')).toString('hex'));
const operatorKey = '252c772d9e9d570c726473927c52f23227cc674b6567935287d3f4a76a57d352';
const operatorAddress = prefix0x(privateToAddress(new Buffer(operatorKey, 'hex')).toString('hex'));

const stubbedClientFundContract = {
    depositTokens: sinon.stub(),
    address: 'client fund address'
};

function proxyquireWallet() {
    return proxyquire('./wallet', {
        './client-fund-contract': function() {
            return stubbedClientFundContract;
        }
    });
}

const Wallet = proxyquireWallet();

const stubbedProvider = {
    operatorAddress,
    effectuatePayment: sinon.stub()
};

const stubbedWallet = {
    provider: stubbedProvider
};


describe('Receipt', () => {
    let signedPayload, unsignedPayload, receipt, wallet;

    const hashFeesTotal = (totalFigures) => {
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
    };

    const hashPaymentAsOperator = payment => {
        const walletSignatureHash = hash(
            {type: 'uint8', value: payment.seals.wallet.signature.v},
            payment.seals.wallet.signature.r,
            payment.seals.wallet.signature.s
        );
        const nonceHash = hash(
            payment.nonce
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
        return hash(walletSignatureHash, nonceHash, senderHash, recipientHash, transfersHash);
    };

    const signPaymentAsWallet = async json => {
        const senderWallet = new Wallet(senderKey);
        const payment = Payment.from(senderWallet, json);
        await payment.sign();
        const paymentJSON = payment.toJSON();
        const walletSeal = paymentJSON.seals.wallet;

        json.seals.wallet = walletSeal;
    };

    beforeEach(async () => {
        unsignedPayload = {
            amount,
            currency,
            seals: {},
            nonce: 1,
            blockNumber: 1,
            operatorId: 1,
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
                        r: '0x19dbbbf5fd9f8cc4e39ea8b1c214d3cef3605129eb0499129a14d7c49551a686',
                        s: '0x123c22665cda95f8acb82a425ac2e18243be4ff6c51b1403b18dd80cc9f26010',
                        v: 28
                    }
                }
            }
        };
    });

    afterEach(() => {
        stubbedProvider.effectuatePayment.reset();
    });

    context('a new Receipt', () => {
        beforeEach(() => {
            receipt = new Receipt(stubbedWallet);
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
    });

    context('a serialized incomplete Receipt', () => {
        it('can not be de-serialized', () => {
            expect(() => Receipt.from(stubbedWallet, {})).to.throw();
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
                        let incompleteReceipt = Receipt.from(stubbedWallet, modifiedPayload);
                        expect(incompleteReceipt.sign()).to.be.rejected;
                    });
                });
            });
        });
    });

    context('a de-serialized unsigned Receipt', () => {
        beforeEach(() => {
            wallet = new Wallet(operatorKey, stubbedProvider);
            receipt = Receipt.from(wallet, unsignedPayload);
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
    });

    context('a de-serialized signed Receipt', () => {
        beforeEach(() => {
            wallet = new Wallet(operatorKey, stubbedProvider);
            receipt = Receipt.from(wallet, signedPayload);
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
    });

    context('a de-serialized signed Receipt that has been tampered with (nonce)', () => {
        let modifiedPayload;

        beforeEach(() => {
            modifiedPayload = {...signedPayload};
            modifiedPayload.nonce = 9999;
            receipt = Receipt.from(stubbedWallet, modifiedPayload);
        });

        it('can be registered with the API', () => {
            receipt.effectuate();
            expect(stubbedProvider.effectuatePayment).to.have.been.calledWith(receipt.toJSON());
        });

        it('has the modified nonce', () => {
            expect(receipt.toJSON().nonce).to.eql(modifiedPayload.nonce);
        });

        it('does not have a valid signature', () => {
            expect(receipt.isSigned()).to.be.false;
        });
    });

    context('a de-serialized Receipt that has no fees', () => {
        let modifiedPayload;

        beforeEach(() => {
            modifiedPayload = {...signedPayload};
            modifiedPayload.recipient.fees = {total: []};
            receipt = Receipt.from(stubbedProvider, modifiedPayload);
        });

        it('has empty fees property', () => {
            expect(receipt.toJSON().recipient.fees).to.eql({total: []});
        });
    });

    context('a de-serialized signed Receipt that has been tampered with (sender)', () => {
        let modifiedPayload;

        beforeEach(() => {
            modifiedPayload = {...signedPayload};
            modifiedPayload.sender.wallet = '0';
            receipt = Receipt.from(stubbedWallet, modifiedPayload);
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
    });
});
