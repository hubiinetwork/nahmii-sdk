'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const MonetaryAmount = require('./monetary-amount');
const ethers = require('ethers');

function cartesian (A, B) {
    const C = [];

    for (const a of A) {
        for (const b of B) {
            if (Array.isArray(b))
                C.push([a, ...b]);
            else
                C.push([a, b]);
        }
    }

    return C;
}

function bn (n) {
    return ethers.utils.bigNumberify(n);
}

const legalAm = [
    -1000, -1, 0, 1, 1000,
    '-1000', '-1', '0', '1', '1000',
    bn(-1000), bn(-1), bn(0), bn(1), bn(1000)
];

const illegalAm = [
    undefined, null, {}, [],
    '90f8bf6a479f320ead074411a4b0e7944ea8c9c1'
];

const legalCt = [
    '90f8bf6a479f320ead074411a4b0e7944ea8c9c1',
    '0000000000000000000000000000000000000000',
    '0000000000000000000000000000000000000001',
    '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1',
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000001'
];

const illegalCt = [
    undefined, null, {}, [], -1, 0, 1,
    '-1', '0', '1', '0x1', '0x0',
    '90f8bf6a479f320ead074411a4b0e7944ea8c9cg',
    '90f8bf6a479f320ead074411a4b0e7944ea8c9cg',
    '090f8bf6a479f320ead074411a4b0e7944ea8c9c1',
    'x90f8bf6a479f320ead074411a4b0e7944ea8c9c1',
    '0X90f8bf6a479f320ead074411a4b0e7944ea8c9c1'
];

const legalId = [
    undefined, 0, 1, 1000, '0x0', '0x1', '0xaf09', '0xAF09'
];

const illegalId = [
    null, {}, [],-1000, -1, '-1000', '-1', 'x0', '0xag09', '0xag09', '0X0'
];

describe('MonetaryAmount', () => {

    it ('Dummy arguments are legal', () => {
        expect(() => new MonetaryAmount(0, '0x0000000000000000000000000000000000000000', 0)).to.not.throw();
    });

    describe('MonetaryAmount constructs from legal values', () => {
        const legalValues = cartesian(legalAm, cartesian(legalCt, legalId));

        for (const args of legalValues) {
            it (`new MonetaryAmount(${args[0]}, ${args[1]}, ${args[2]})`, () => {
                expect(() => new MonetaryAmount(args[0], args[1], args[2])).to.not.throw();
            });
        }
    });

    describe('MonetaryAmount constructor rejects illegal amount formats', () => {
        for (const am of illegalAm) {
            it (`new MonetaryAmount(${am}, '0x0000000000000000000000000000000000000000', 0)`, () => {
                expect(() => new MonetaryAmount(am, '0x0000000000000000000000000000000000000000', 0)).to.throw();
            });
        }
    });

    describe('MonetaryAmount constructor rejects illegal ct formats', () => {
        for (const ct of illegalCt) {
            it (`new MonetaryAmount(0, ${ct}, 0})`, () => {
                expect(() => new MonetaryAmount(0, ct, 0)).to.throw();
            });
        }
    });

    describe('MonetaryAmount constructor rejects illegal id formats', () => {
        for (const id of illegalId) {
            it (`new MonetaryAmount(0, '0x0000000000000000000000000000000000000000', ${id})`, () => {
                expect(() => new MonetaryAmount(0, '0x0000000000000000000000000000000000000000', id)).to.throw();
            });
        }
    });

    describe('property amount can be retrieved', () => {
        for (const val of legalAm) {
            it (`new MonetaryAmount(${val}, '0x0000000000000000000000000000000000000000', 0)`, () => {
                const amount = new MonetaryAmount(val, '0x0000000000000000000000000000000000000000', 0).amount;
                expect(amount.toString()).to.equal(ethers.utils.bigNumberify(val).toString());
            });
        }
    });

    describe('property ct can be retrieved', () => {
        for (const addr of legalCt) {
            it (`new MonetaryAmount(0, ${addr}, 0})`, () => {
                const ct = new MonetaryAmount(0, addr, 0).ct;
                expect(ct).to.equal('0x' + addr.replace('0x', ''));
            });
        }
    });

    describe('property id can be retrieved', () => {
        for (const val of legalId) {
            it (`new MonetaryAmount(0, '0x0000000000000000000000000000000000000000', ${val})`, () => {
                const id = new MonetaryAmount(0, '0x0000000000000000000000000000000000000000', val).id;
                expect(id).to.equal(Number.parseInt(((v=0) => v)(val)));
            });
        }
    });

    [
        ['1234', '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1', '1'],
        ['1234', '0x0000000000000000000000000000000000000000', '0'],
        ['1234', '0x0000000000000000000000000000000000000001', 1],
        ['1234', '0x0000000000000000000000000000000000000002', 0],
        ['1234', '0x0000000000000000000000000000000000000002'],
        [ethers.utils.bigNumberify('1234'), '0x0000000000000000000000000000000000000002', 0]
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
