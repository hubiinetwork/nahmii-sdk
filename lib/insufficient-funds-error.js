'use strict';

/**
 * @module nahmii-sdk
 */

const _minimumBalance = new WeakMap();

/**
 * @class InsufficientFundsError
 * Class for relaying the 402 - insufficient funds error from the API.
 * If the API returns information about the minimum balance required, then the
 * property *minimumBalance* will be present.
 * @alias module:nahmii-sdk
 */
class InsufficientFundsError extends Error {
    /**
     * Construct an error instance based on the options provided.
     * @param options.message - The error message
     */
    constructor(options) {
        super(options.message);

        if (Error.captureStackTrace)
            Error.captureStackTrace(this, InsufficientFundsError);

        let mb = options.message.match(/\d+(\.\d+)?/);
        if (mb && mb.length)
            mb = Number.parseFloat(mb[0]);
        _minimumBalance.set(this, mb);
    }

    /**
     * Returns the minimum balance if the original error indicated this.
     * @returns {Number|undefined}
     */
    get minimumBalance() {
        return _minimumBalance.get(this);
    }
}

module.exports = InsufficientFundsError;
