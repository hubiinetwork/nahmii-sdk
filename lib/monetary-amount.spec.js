'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const MonetaryAmount = require('./monetary-amount');
const ethers = require('ethers');

describe('MonetaryAmount', () => {

    [
        ['1234', '0x01', '1'],
        ['1234', '0x01', '0'],
        ['1234', '0x01', 1],
        ['1234', '0x02', 0],
        ['1234', '0x02'],
        [ethers.utils.bigNumberify('1234'), '0x02', 0]
    ].forEach(([amount, ct, id]) => {
        let json;

        beforeEach(() => {
            const i = id || 0;
            json = {
                amount: amount.toString(),
                currency: {
                    ct: ct.toString(),
                    id: i.toString()
                }
            };
        });

        context('given ' + JSON.stringify([amount, ct, id]), () => {
            context('a new MonetaryAmount', () => {
                it('can be serialized', () => {
                    const ma = new MonetaryAmount(amount, ct, id);
                    expect(ma.toJSON()).to.eql(json);
                });
            });

            context('a JSON object', () => {
                let ma;

                beforeEach(() => {
                    ma = MonetaryAmount.from(json);
                });

                it('can be de-serialized into a valid MonetaryAmount', () => {
                    expect(ma).to.be.instanceOf(MonetaryAmount);
                });

                it('can be serialized again', () => {
                    expect(ma.toJSON()).to.eql(json);
                });
            });
        });
    });

    context('given invalid inputs', () => {
        it('can not be serialized', () => {
            expect(() => (new MonetaryAmount()).toJSON()).to.throw();
        });
    });
});
