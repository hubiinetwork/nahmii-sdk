'use strict';

/**
 * @module nahmii-sdk
 */

const dbg = require('../dbg');
const EventEmitter = require('events');
const io = require('socket.io-client');
const Receipt = require('../receipt');
const NahmiiProvider = require('../nahmii-provider');

// Private properties
const _eventEmitter = new WeakMap();
const _socket = new WeakMap();
const _provider = new WeakMap();

const EventNames = Object.freeze({
    newReceipt: Symbol('new receipt event')
});

/**
 * @class NahmiiEventProvider
 * A class emitting events whenever the API issues a push notification. It must
 * be given a provider during construction to be able to emit receipts that
 * can be verified.
 * @alias module:nahmii-sdk
 * @example <caption>Stand alone usage, no receipt verification</caption>
 * const {NahmiiEventProvider} = require('nahmii-sdk');
 *
 * const nahmiiEvents = new NahmiiEventProvider('api.nahmii.io');
 * nahmiiEvents.onNewReceipt(receipt => {
 *     console.log('New receipt issued!');
 *     console.log(receipt.toJSON());
 * }
 *
 * @example <caption>Monitoring and verifying receipts</caption>
 * const {NahmiiProvider, NahmiiEventProvider}= require('nahmii-sdk');
 *
 * const provider = await NahmiiProvider.from('api.nahmii.io', my_app_id, my_app_secret);
 * const nahmiiEvents = NahmiiEventProvider.from(provider);
 *
 * nahmiiEvents.onNewReceipt(receipt => {
 *     if (!receipt.isSigned())
 *         throw Error('Invalid receipt received!');
 *     console.log('New receipt issued!');
 *     console.log(receipt.toJSON());
 * });
 */
class NahmiiEventProvider {
    /**
     * Construct a new NahmiiEventProvider.
     * Instead of using this constructor directly it is recommended that you use
     * the NahmiiEventProvider.from() factory function.
     * @param {string|NahmiiProvider} nahmiiDomainOrProvider - The domain name for the nahmii API or an already configured NahmiiProvider
     */
    constructor(nahmiiDomainOrProvider) {
        if (!nahmiiDomainOrProvider)
            throw new TypeError('Argument should be string or NahmiiProvider');

        let domain = nahmiiDomainOrProvider;
        if (nahmiiDomainOrProvider instanceof NahmiiProvider) {
            _provider.set(this, nahmiiDomainOrProvider);
            domain = nahmiiDomainOrProvider.nahmiiDomain;
        }

        if (typeof domain !== 'string')
            throw new TypeError('Argument should be string or NahmiiProvider');

        _eventEmitter.set(this, new EventEmitter());
        _socket.set(this, io.connect(`https://${domain}/receipts`, {path: '/events/socket.io'}));
        subscribeToEvents.call(this);
    }

    /**
     * Creates a new NahmiiEventProvider based on the input provided.
     * @param {string|NahmiiProvider} nahmiiDomainOrProvider - The nahmii domain to connect to or an already connected provider.
     * @returns {Promise<NahmiiEventProvider>}
     */
    static async from(nahmiiDomainOrProvider) {
        if (!nahmiiDomainOrProvider)
            return null;

        if (nahmiiDomainOrProvider instanceof NahmiiProvider)
            return new NahmiiEventProvider(nahmiiDomainOrProvider);

        if (typeof nahmiiDomainOrProvider !== 'string')
            return null;

        return new NahmiiEventProvider(nahmiiDomainOrProvider);
    }

    /**
     * Registers listener function so it will be called whenever a new Receipt
     * has been issued by the nahmii cluster.
     * Multiple calls passing the same listener function will result in the
     * listener being added, and called, multiple times.
     * Returns a reference to the NahmiiEventProvider, so that calls can be
     * chained.
     * @param listener
     * @returns {NahmiiEventProvider}
     */
    onNewReceipt(listener) {
        _eventEmitter.get(this).on(EventNames.newReceipt, receipt => {
            listener.call(this, receipt);
        });
        return this;
    }
}

/**
 * Subscribes to critical socket.io events and relays nahmii events to any
 * registered listeners.
 * Private method, invoke with 'this' bound to provider instance.
 * @private
 */
function subscribeToEvents() {
    const socket = _socket.get(this);

    function onEventApiError(error) {
        dbg('Event API connection error: ' + JSON.stringify(error));
    }

    socket.on('pong', (latency) => {
        dbg(`Event API latency: ${latency} ms`);
    });
    socket.on('connect_error', onEventApiError);
    socket.on('error', onEventApiError);
    socket.on('disconnect', onEventApiError);
    socket.on('reconnect_error', onEventApiError);
    socket.on('reconnect_failed', () => {
        onEventApiError('Reconnecting to the Event API failed');
    });

    socket.on('new_receipt', receiptJSON => {
        const receipt = Receipt.from(receiptJSON);
        _eventEmitter.get(this).emit(EventNames.newReceipt, receipt);
    });
}

module.exports = NahmiiEventProvider;
