'use strict';
/* eslint-disable no-unused-expressions */

const chai = Object.create(require('chai'));
chai.should();

const NestedError = require('./nested-error');

describe('nested-error', () => {
    let nestedErrorFromError, nestedErrorFromStr;

    before(() => {
        try {
            const err = new Error('Inner error with code');
            err.code = 404;
            throw err;
        }
        catch (err) {
            nestedErrorFromError = new NestedError(err, 'Outer error');
        }

        try {
            throw 'Inner error string';
        }
        catch (err) {
            nestedErrorFromStr = new NestedError(err, 'Outer error');
        }
    });

    describe('new NestedError() from Error', () => {
        let nestedErr;

        before(() => {
            nestedErr = nestedErrorFromError; // Alias
        });

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

    describe('asStringified() from Error', () => {
        let parsedErr;

        before(() => {
            parsedErr = JSON.parse(nestedErrorFromError.asStringified());
        });

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

    describe('new NestedError() from Error', () => {
        let nestedErr;

        before(() => {
            nestedErr = nestedErrorFromStr; // Alias
        });

        it('has message', () => {
            nestedErr.message.should.equal('Outer error');
        });
        it('has stack', () => {
            nestedErr.stack.should.exist;
        });
        it('has innerError', () => {
            nestedErr.innerError.should.exist;
        });
        it('has asStringified()', () => {
            nestedErr.asStringified.should.exist;
        });
        it('has static asStringified()', () => {
            NestedError.asStringified.should.exist;
        });
    });

    describe('asStringified() from string', () => {
        let parsedErr;

        before(() => {
            parsedErr = JSON.parse(nestedErrorFromStr.asStringified());
        });

        it('has message', () => {
            parsedErr.message.should.equal('Outer error');
        });
        it('has stack', () => {
            parsedErr.stack.should.exist;
        });
        it('has innerError', () => {
            parsedErr.innerError.should.exist;
        });
    });
});