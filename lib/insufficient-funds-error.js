'use strict';

class InsufficientFundsError extends Error {
    constructor(options) {
        super(options.message);

        if (Error.captureStackTrace)
            Error.captureStackTrace(this, InsufficientFundsError);

        let mb = options.message.match(/\d+(\.\d+)?/);
        if (mb && mb.length)
            mb = Number.parseFloat(mb[0]);
        this.minimumBalance = mb;
    }
}

module.exports = InsufficientFundsError;
