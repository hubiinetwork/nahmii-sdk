'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const MonetaryAmount = require('./monetary-amount');

describe('MonetaryAmount', () => {

    [
        {amount: '1000', currency: {ct: '0x01', id: '1'}},
        {amount: '1000', currency: {ct: '0x01', id: '0'}},
        {amount: '1000', currency: {ct: '0x01', id: 1}},
        {amount: '1000', currency: {ct: '0x01', id: 0}}
    ].forEach(json => {
        describe('given JSON data ' + JSON.stringify(json), () => {
            let ma;

            beforeEach(() => {
                ma = MonetaryAmount.from(json);
            });

            it('de-serializes into a MonetaryAmount instance', () => {
                expect(ma).to.be.instanceOf(MonetaryAmount);
            });

            it('can be serialized again', () => {
                expect(ma.toJSON()).to.eql(json);
            });
        });
    });
});
