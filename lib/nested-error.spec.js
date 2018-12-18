'use strict';
/* eslint-disable no-unused-expressions */

const chai = Object.create(require('chai'));
chai.should();

const NestedError = require('./nested-error');

const throwInnerError = () => {
    const err = new Error('Inner error with code');
    err.code = 404;
    throw err;
};

const throwNestedError = () => {
    try {
        throwInnerError();
    }
    catch (innerErr) {
        throw new NestedError(innerErr, 'Outer error');
    }
};

describe('nested-error', () => {
    let nestedErr;
    let parsedErr;

    before(() => {
        try {
            throwNestedError();
        }
        catch (err) {
            nestedErr = err;
            parsedErr = JSON.parse(err.asStringified());
        }
    });

    describe('new NestedError()', () => {
        it('has message', () => {
            nestedErr.message.should.equal('Outer error');
        });
        it('has stack', () => {
            nestedErr.stack.should.exist;
        });
        it('has innerError', () => {
            nestedErr.innerError.should.exist;
        });
        it('has innerError.message', () => {
            nestedErr.innerError.message.should.equal('Inner error with code');
        });
        it('has innerError.code', () => {
            nestedErr.innerError.code.should.equal(404);
        });
        it('has innerError.stack', () => {
            nestedErr.innerError.stack.should.exist;
        });
        it('has asStringified()', () => {
            nestedErr.asStringified.should.exist;
        });
        it('has static asStringified()', () => {
            NestedError.asStringified.should.exist;
        });
    });

    describe('asStringified()', () => {
        it('has message', () => {
            parsedErr.message.should.equal('Outer error');
        });
        it('has stack', () => {
            parsedErr.stack.should.exist;
        });
        it('has innerError', () => {
            parsedErr.innerError.should.exist;
        });
        it('has innerError.message', () => {
            parsedErr.innerError.message.should.equal('Inner error with code');
        });
        it('has innerError.code', () => {
            parsedErr.innerError.code.should.equal(404);
        });
        it('has innerError.stack', () => {
            parsedErr.innerError.stack.should.exist;
        });
    });
});