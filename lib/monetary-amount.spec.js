'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const MonetaryAmount = require('./monetary-amount');
const ethers = require('ethers');
const { EthereumAddress } = require('nahmii-ethereum-address');

function cartesian (A, B) {
    const C = [];

    for (let a of A) {
        a = Array.isArray(a) ? a : [ a ];
        for (let b of B) {
            b = Array.isArray(b) ? b : [ b ];
            C.push([...a, ...b]);
        }
    }

    return C;
}

const legalConstructorAmounts = [
    ethers.utils.bigNumberify(-1000),
    ethers.utils.bigNumberify(-1),
    ethers.utils.bigNumberify(0),
    ethers.utils.bigNumberify(1),
    ethers.utils.bigNumberify(1000)
];

const legalFactoryAmounts = [
    -1000, -1, 0, 1, 1000,
    '-1000', '-1', '0', '1', '1000',
    ...legalConstructorAmounts
];

const legalConstructorCts = [
    EthereumAddress.from('0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1'),
    EthereumAddress.from('0x0000000000000000000000000000000000000000'),
    EthereumAddress.from('0x0000000000000000000000000000000000000001')
];

const legalFactoryCts = [
    '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1',
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000001',
    ...legalConstructorCts
];

const legalConstructorIds = [
    undefined, 0, 1, 1000
];

const legalFactoryIds = [
    '0x0', '0x1', '0xaf09', '0xAF09',
    ...legalConstructorIds
];

function toJSON(amount, ct, id) {
    return {
        amount: amount.toString(),
        currency: {
            ct: ct.toString(),
            id: id ? id.toString() : '0'
        }
    };
}

function typeStr (item) {
    if (item && item.constructor && item.constructor.name)
        return item.constructor.name;
    else
        return typeof item;
}

const addrx0 = '0x0000000000000000000000000000000000000000';

const constructorArgs = [
    ...cartesian(cartesian(legalConstructorAmounts, [ EthereumAddress.from(addrx0) ]), [ 0 ]),
    ...cartesian([ ethers.utils.bigNumberify(0) ], cartesian(legalConstructorCts, [ 0 ])),
    ...cartesian([ ethers.utils.bigNumberify(0) ], cartesian([ EthereumAddress.from(addrx0) ], legalConstructorIds))
];

const factoryArgs = [
    ...cartesian(cartesian(legalFactoryAmounts, [ addrx0 ]), [ 0 ]),
    ...cartesian([ 0 ], cartesian(legalFactoryCts, [ 0 ])),
    ...cartesian([ 0 ], cartesian([ addrx0 ], legalConstructorIds))
];

const badConstructorArgs = [
    [ null, EthereumAddress.from(addrx0), 0 ],
    [ ethers.utils.bigNumberify(0), null, 0 ],
    [ ethers.utils.bigNumberify(0), EthereumAddress.from(addrx0), -1 ]
];

describe('MonetaryAmount', () => {

    context('Constructor constructs from args and can serialize to JSON', () => {
        for(const [amount, ct, id] of constructorArgs) {
            it (`with "${amount}" ${typeStr(amount)}, "${ct}" ${typeStr(ct)}, "${id}" ${typeStr(id)}`, () => {
                const ma = new MonetaryAmount(amount, ct, id);
                expect(ma.toJSON()).to.be.eql(toJSON(amount, ct, id));
            });
        }
    });

    context('Constructor throws on illegal input', () => {
        for (const [amount, ct, id] of badConstructorArgs) {
            it (`with "${amount}" ${typeStr(amount)}, "${ct}" ${typeStr(ct)}, "${id}" ${typeStr(id)}`, () => {
                expect(() => new MonetaryAmount(amount, ct, id)).to.throw(TypeError);
            });
        }
    });

    context('Factory constructs from args and can serialize to JSON', () => {
        for (const [amount, ct, id] of factoryArgs) {
            it (`with "${amount}" ${typeStr(amount)}, "${ct}" ${typeStr(ct)}, "${id}" ${typeStr(id)}`, () => {
                const ma = MonetaryAmount.from(amount, ct, id);
                expect(ma.toJSON()).to.be.eql(toJSON(amount, ct, id));
            });
        }
    });

    context('Factory return null on illegal input', () => {
        for (const [amount, ct, id] of badConstructorArgs) {
            it (`with "${amount}" ${typeStr(amount)}, "${ct}" ${typeStr(ct)}, "${id}" ${typeStr(id)}`, () => {
                expect(MonetaryAmount.from(amount, ct, id)).to.equal(null);
            });
        }
    });

    context('Factory constructs from JSON and can serialize to JSON', () => {
        for (const [amount, ct, id] of factoryArgs) {
            it (`with json "${amount}" ${typeStr(amount)}, "${ct}" ${typeStr(ct)}, "${id}" ${typeStr(id)}`, () => {
                const json = toJSON(amount, ct, id);
                const ma = MonetaryAmount.from(json);
                expect(ma.toJSON()).to.be.eql(json);
            });
        }
    });

    context('amount is valid property', () => {
        for (const val of legalFactoryAmounts) {
            it (`with ${val} ${typeStr(val)}`, () => {
                const amount = MonetaryAmount.from(val, addrx0, 0).amount;
                expect(amount.toString()).to.equal(ethers.utils.bigNumberify(val).toString());
            });
        }
    });

    context('ct is valid property', () => {
        for (const val of legalFactoryCts) {
            it (`with ${val} ${typeStr(val)}`, () => {
                const ct = MonetaryAmount.from(0, val, 0).currency.ct;
                expect(ct.toString()).to.equal(EthereumAddress.from(val).toString());
            });
        }
    });

    context('id is valid property', () => {
        for (const val of legalFactoryIds) {
            it (`with ${val} ${typeStr(val)})`, () => {
                const id = MonetaryAmount.from(0, addrx0, val).currency.id;
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
            context('a MonetaryAmount.from', () => {
                it('can be serialized', () => {
                    const ma = MonetaryAmount.from(amount, ct, id);
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
            expect(() => (MonetaryAmount.from()).toJSON()).to.throw();
        });
    });
});
