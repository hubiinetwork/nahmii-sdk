'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const {privateToAddress} = require('ethereumjs-util');

const utils = require('./utils');

describe('#prefix0x()', () => {
    [
        undefined,
        null,
        123,
        {},
        [],
        '',
        '0x123',
        '0x',
        '0xSome String'
    ].forEach(input => {
        it(`returns ${JSON.stringify(input)} unmodified`, () => {
            expect(utils.prefix0x(input)).to.eql(input);
        });
    });

    [
        ['0', '0x0'],
        ['1', '0x1'],
        ['some string', '0xsome string'],
        ['0x0x0xTEST', '0xTEST']
    ].forEach(([input, expected]) => {
        it(`returns input ${JSON.stringify(input)} as ${JSON.stringify(expected)}`, () => {
            expect(utils.prefix0x(input)).to.eql(expected);
        });
    });
});

describe('#strip0x()', () => {
    [
        undefined,
        null,
        123,
        {},
        [],
        '',
        '123123',
        'Some String'
    ].forEach(input => {
        it(`returns ${JSON.stringify(input)} unmodified`, () => {
            expect(utils.strip0x(input)).to.eql(input);
        });
    });

    [
        ['0x', ''],
        ['0x0', '0'],
        ['0x1', '1'],
        ['0xSome String', 'Some String'],
        ['0x0x0x0', '0']
    ].forEach(([input, expected]) => {
        it(`returns input ${JSON.stringify(input)} as ${JSON.stringify(expected)}`, () => {
            expect(utils.strip0x(input)).to.eql(expected);
        });
    });
});

describe('#hashObject()', () => {

    describe('when success', () => {

        [
            {
                description: 'Simple object hash',
                hashProperties: [
                    'firstName',
                    'lastName'
                ],
                obj: {
                    firstName: 'Vitalik',
                    lastName: 'Buterin'
                },
                expectedHash: utils.hash('Vitalik', 'Buterin')
            },
            {
                description: 'Nested properties',
                hashProperties: [
                    'name.firstName',
                    'name.lastName',
                    'age'
                ],
                obj: {
                    name: {
                        firstName: 'Vitalik',
                        lastName: 'Buterin'
                    },
                    age: 24
                },
                expectedHash: utils.hash('Vitalik', 'Buterin', 24)
            }
        ].forEach(({description, hashProperties, obj, expectedHash}) => {

            describe(description, () => {

                it('calculates expected hash', () => {
                    const actualHash = utils.hashObject(obj, hashProperties);
                    expect(actualHash).to.eql(expectedHash);
                });

            });

        });

    });

    describe('when obj is missing a value', () => {

        it('throws error', () => {
            const hashProperties = [
                'name.firstName',
                'name.lastName',
                'age'
            ];
            const obj = {
                name: {
                    firstName: 'Vitalik'
                },
                age: 24
            };

            let error;
            try {
                utils.hashObject(obj, hashProperties);
            } catch (err) {
                error = err;
            }
            expect(error).to.exist;
            expect(error.message).to.match(/Expected property "name.lastname" does not exist on object/i);
        });
    });
});

describe('#isSignedBy()', () => {
    const privateKey = '3a1076bf45ab87712ad64ccb3b10217737f7faacbf2872e88fdd9a537d8fe266';
    const valid = {
        message: utils.hash('some hashed data'),
        signature: utils.sign(utils.hash('some hashed data'), privateKey),
        address: privateToAddress(new Buffer(privateKey, 'hex')).toString('hex')
    };

    context('an address matching message and signature combo', () => {
        [
            utils.strip0x(valid.address),
            utils.prefix0x(valid.address),
            valid.address.toUpperCase(),
            valid.address.toLowerCase()
        ].forEach(address => {
            it('returns true for ' + address, () => {
                expect(utils.isSignedBy(utils.ethHash(valid.message), valid.signature, valid.address)).to.be.true;
            });
        });
    });

    context('an address not matching message and signature combo', () => {
        [
            '0x0000000000000000000000000000000000000001',
            '',
            null,
            undefined
        ].forEach(otherAddress => {
            it('returns false for ' + JSON.stringify(otherAddress), () => {
                expect(utils.isSignedBy(utils.ethHash(valid.message), valid.signature, otherAddress)).to.be.false;
            });
        });
    });
});
