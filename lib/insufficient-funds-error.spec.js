'use strict';

const chai = require('chai');
const expect = chai.expect;

const InsufficientFundsError = require('./insufficient-funds-error');

describe('InsufficientFundsError', () => {
    it('uses the message property as the error message', () => {
        let e = new InsufficientFundsError({message: 'some error'});
        expect(e.message).to.eql('some error');
    });

    it('extracts the first number of the message as the minimum balance', () => {
        let e = new InsufficientFundsError({message: 'bla bla 991.2340 foo bar 3.141592 something'});
        expect(e.minimumBalance).to.eql(991.234);
    });

    it('has a call stack when thrown', (done) => {
        try {
            throw new InsufficientFundsError({message: 'some error'});
        }
        catch (error) {
            expect(error.stack).to.match(/some error[\s\S]*at.*spec.js/i);
            done();
        }
    });
});
