'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

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
