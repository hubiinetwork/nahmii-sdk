'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const EventEmitter = require('events');
const Receipt = require('../receipt');

const {ApiPayloadFactory} = require('../../test-utils');

const nahmiiDomain = 'api.nahmii.somewhere';

class FakeNahmiiProvider {
    constructor() {
        this.nahmiiDomain = nahmiiDomain;
    }
}

const stubbedSocketIOClient = {
    connect: sinon.stub()
};

const debugLogger = sinon.stub();

function proxyquireProvider() {
    return proxyquire('../event-provider', {
        'socket.io-client': stubbedSocketIOClient,
        '../receipt': Receipt,
        '../nahmii-provider': FakeNahmiiProvider,
        '../dbg': debugLogger
    });
}

describe('Nahmii Event Provider', () => {
    let provider, fakeSocket, receiptJSON;
    const senderRef = '3f527f36-76e3-11e9-bcfb-705ab6aee958';

    beforeEach(async () => {
        const fixture = new ApiPayloadFactory({
            senderPrivateKey: '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266',
            recipient: '0x0000000000000000000000000000000000000003',
            operatorPrivateKey: '252c772d9e9d570c726473927c52f23227cc674b6567935287d3f4a76a57d352',
            currency: {ct: '0x0000000000000000000000000000000000000001', id: '0'},
            amount: '1000'
        });

        receiptJSON = fixture.createUnsignedReceipt(
            await fixture.createSignedPayment(
                fixture.createUnsignedPayment(senderRef)));
    });

    afterEach(() => {
        stubbedSocketIOClient.connect.reset();
        debugLogger.reset();
    });

    context('a new NahmiiEventProvider with valid domain name', () => {
        beforeEach(() => {
            fakeSocket = new EventEmitter();
            stubbedSocketIOClient.connect.returns(fakeSocket);
            const NahmiiEventProvider = proxyquireProvider();
            provider = new NahmiiEventProvider(nahmiiDomain);
        });

        validateExpectedBehavior();
    });

    context('a new NahmiiEventProvider with a NahmiiProvider', () => {
        beforeEach(() => {
            fakeSocket = new EventEmitter();
            stubbedSocketIOClient.connect.returns(fakeSocket);
            const NahmiiEventProvider = proxyquireProvider();
            provider = new NahmiiEventProvider(new FakeNahmiiProvider());
        });

        validateExpectedBehavior();
    });

    context('a new NahmiiEventProvider with invalid data', () => {
        [null, undefined, 123, '', {}].forEach(input => {
            it('given ' + JSON.stringify(input) + ' throws', async () => {
                const NahmiiEventProvider = proxyquireProvider();
                expect(() => new NahmiiEventProvider(input)).to.throw(TypeError, /string or NahmiiProvider/i);
            });
        });
    });

    context('a NahmiiEventProvider from a valid domain name', () => {
        beforeEach(async () => {
            fakeSocket = new EventEmitter();
            stubbedSocketIOClient.connect.returns(fakeSocket);
            const NahmiiEventProvider = proxyquireProvider();
            provider = await NahmiiEventProvider.from(nahmiiDomain);
        });

        validateExpectedBehavior();
    });

    context('a NahmiiEventProvider from a NahmiiProvider', () => {
        beforeEach(async () => {
            fakeSocket = new EventEmitter();
            stubbedSocketIOClient.connect.returns(fakeSocket);
            const NahmiiEventProvider = proxyquireProvider();
            provider = await NahmiiEventProvider.from(new FakeNahmiiProvider());
        });

        validateExpectedBehavior();

        it('emits a "new receipt" event for a receipt that can be validated', (done) => {
            provider.onNewReceipt(r => {
                expect(r).to.be.instanceOf(Receipt);
                expect(() => r.isSigned()).to.not.throw();
                done();
            });
            fakeSocket.emit('new_receipt', receiptJSON);
        });
    });

    context('a NahmiiEventProvider from invalid data', () => {
        [null, undefined, 123, '', {}].forEach(input => {
            it('given ' + JSON.stringify(input) + ' returns null', async () => {
                const NahmiiEventProvider = proxyquireProvider();
                expect(await NahmiiEventProvider.from(input)).to.eql(null);
            });
        });
    });

    context('a disposed NahmiiEventProvider', () => {
        const onNewReceipt = sinon.stub();

        beforeEach(async () => {
            fakeSocket = new EventEmitter();
            fakeSocket.disconnect = sinon.stub();
            sinon.stub(fakeSocket, 'removeAllListeners').callThrough();
            stubbedSocketIOClient.connect.returns(fakeSocket);
            const NahmiiEventProvider = proxyquireProvider();
            provider = await NahmiiEventProvider.from(new FakeNahmiiProvider());
            provider.onNewReceipt(onNewReceipt);
            provider.dispose();
        });

        afterEach(() => {
            onNewReceipt.reset();
        });

        it('disconnects from server', () => {
            expect(fakeSocket.disconnect).to.have.been.calledOnce;
        });

        it('does not emit a "new receipt" event when server issues a new receipt', () => {
            fakeSocket.emit('new_receipt', receiptJSON);
            expect(onNewReceipt).to.not.have.been.called;
        });

        it('clears all socket listeners', () => {
            expect(fakeSocket.removeAllListeners).to.have.been.calledOnce;
        });
    });

    function validateExpectedBehavior() {
        it('connects to the event API', () => {
            expect(stubbedSocketIOClient.connect).to.have.been.calledWith(
                `https://${nahmiiDomain}/receipts`, {path: '/events/socket.io'}
            );
        });

        it('emits a "new receipt" event when server issues a new receipt', (done) => {
            provider.onNewReceipt(r => {
                expect(r).to.be.instanceOf(Receipt);
                done();
            });
            fakeSocket.emit('new_receipt', receiptJSON);
        });

        it('emits an event bound to the event provider', (done) => {
            provider.onNewReceipt(function() {
                expect(this).to.eql(provider);
                done();
            });
            fakeSocket.emit('new_receipt', receiptJSON);
        });

        ['connect_error', 'error', 'disconnect', 'reconnect_error', 'reconnect_failed'].forEach(event => {
            it('logs to debug output whenever an error event is emitted from socket', () => {
                expect(debugLogger).not.to.have.been.called;
                fakeSocket.emit(event, 'some error');
                expect(debugLogger).to.have.been.calledOnce;
            });
        });

        it('logs latency to debug output whenever a pong event is emitted from socket', () => {
            expect(debugLogger).not.to.have.been.called;
            fakeSocket.emit('pong', 132);
            expect(debugLogger).to.have.been.calledWith('Event API latency: 132 ms');
        });
    }
});
