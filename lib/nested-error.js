'use strict';

const asObject = (err) => {
    if (err instanceof Error) {
        const obj = Object.assign({}, err);
        delete obj.stack;
        delete obj.innerError;

        // Assign sequence is important for readability when stringified
        return Object.assign(
            {
                message: err.message
            },
            obj,
            {
                stack: err.stack.split('\n').slice(1, 6), // Only few first stack lines
                innerError: err.innerError
            }
        );
    }
    else {
        return err;
    }
};

class NestedError extends Error {
    constructor (innerError, ...params) {
        super(...params);
        this.innerError = asObject(innerError);
    }

    static asStringified (err) {
        return JSON.stringify(asObject(err), null, 2);
    }

    asStringified () {
        return NestedError.asStringified(this);
    }
}

module.exports = NestedError;