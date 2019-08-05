'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const Currency = require('./currency');
const {EthereumAddress} = require('nahmii-ethereum-address');
const BSON = require('bson');

function cartesian (A, B) {
    const C = [];

    for (let a of A) {
        a = Array.isArray(a) ? a : [a];
        for (let b of B) {
            b = Array.isArray(b) ? b : [b];
            C.push([...a, ...b]);
        }
    }

    return C;
}

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

function toJSON(ct, id) {
    return {
        ct: ct.toString(),
        id: id ? id.toString() : '0'
    };
}

function toBSON(ct, id) {
    return {
        ct: EthereumAddress.from(ct).toBinary(),
        id: id === undefined ? new BSON.Int32(0) : new BSON.Int32(id)
    };
}

function typeStr (item) {
    if (item && item.constructor && item.constructor.name)
        return item.constructor.name;
    else
        return typeof item;
}

const addrx0 = '0x0000000000000000000000000000000000000000';

const constructorArgs = [...cartesian(legalConstructorCts, legalConstructorIds)];

const factoryArgs = [
    ...cartesian(legalFactoryCts, [0]),
    ...cartesian([addrx0], legalConstructorIds)
];

const badConstructorArgs = [
    [null, 0],
    [EthereumAddress.from(addrx0), -1]
];

describe('Currency', () => {

    context('Constructor constructs from args and can serialize to JSON and BSON', () => {
        for(const [ct, id] of constructorArgs) {
            it (`with "${ct}" ${typeStr(ct)}, "${id}" ${typeStr(id)}`, () => {
                const currency = new Currency(ct, id);
                expect(currency.toJSON()).to.be.eql(toJSON(ct, id));
                expect(currency.toBSON()).to.be.eql(toBSON(ct, id));
            });
        }
    });

    context('Constructor throws on illegal input', () => {
        for (const [ct, id] of badConstructorArgs) {
            it (`with "${ct}" ${typeStr(ct)}, "${id}" ${typeStr(id)}`, () => {
                expect(() => new Currency(ct, id)).to.throw(TypeError);
            });
        }
    });

    context('Factory constructs from args and can serialize to JSON and BSON', () => {
        for (const [ct, id] of factoryArgs) {
            it (`with "${ct}" ${typeStr(ct)}, "${id}" ${typeStr(id)}`, () => {
                const currency = Currency.from({ct, id});
                expect(currency.toJSON()).to.be.eql(toJSON(ct, id));
                expect(currency.toBSON()).to.be.eql(toBSON(ct, id));
            });
        }
    });

    context('Factory return null on illegal input', () => {
        for (const [ct, id] of badConstructorArgs) {
            it (`with "${ct}" ${typeStr(ct)}, "${id}" ${typeStr(id)}`, () => {
                expect(Currency.from({ct, id})).to.equal(null);
            });
        }
        it ('with null', () => {
            expect(Currency.from(null)).to.equal(null);
        });
    });

    context('Factory constructs from JSON and can serialize to JSON and BSON', () => {
        for (const [ct, id] of factoryArgs) {
            it (`with json "${ct}" ${typeStr(ct)}, "${id}" ${typeStr(id)}`, () => {
                const json = toJSON(ct, id);
                const bson = toBSON(ct, id);
                const currency = Currency.from(json);

                expect(currency.toJSON()).to.be.eql(json);
                expect(currency.toBSON()).to.be.eql(bson);
            });
        }
    });

    context('ct is valid property', () => {
        for (const val of legalFactoryCts) {
            it (`with ${val} ${typeStr(val)}`, () => {
                const {ct} = Currency.from({ct: val, id: 0});
                expect(ct.toString()).to.equal(EthereumAddress.from(val).toString());
            });
        }
    });

    context('id is valid property', () => {
        for (const val of legalFactoryIds) {
            it (`with ${val} ${typeStr(val)})`, () => {
                const {id} = Currency.from({ct: addrx0, id: val});
                expect(id).to.equal(val === undefined ? 0 : Number.parseInt(val));
            });
        }
    });

    [
        ['0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1', '1'],
        ['0x0000000000000000000000000000000000000000', '0'],
        ['0x0000000000000000000000000000000000000001', 1],
        ['0x0000000000000000000000000000000000000002', 0],
        ['0x0000000000000000000000000000000000000002'],
        ['0x0000000000000000000000000000000000000002', 0]
    ].forEach(([ct, id]) => {
        let json;

        beforeEach(() => {
            const i = id || 0;
            json = {
                ct: ct.toString(),
                id: i.toString()
            };
        });

        context('given ' + JSON.stringify([ct, id]), () => {
            context('a Currency.from', () => {
                it('can be serialized', () => {
                    const currency = Currency.from({ct, id});
                    expect(currency.toJSON()).to.eql(json);
                });
            });

            context('a JSON object', () => {
                let currency;

                beforeEach(() => {
                    currency = Currency.from(json);
                });

                it('can be de-serialized into a valid Currency', () => {
                    expect(currency).to.be.instanceOf(Currency);
                });

                it('can be serialized again', () => {
                    expect(currency.toJSON()).to.eql(json);
                });
            });
        });
    });

    context('given invalid inputs', () => {
        it('can not be serialized to JSON', () => {
            expect(() => (Currency.from()).toJSON()).to.throw();
        });
        it('can not be serialized to BSON', () => {
            expect(() => (Currency.from()).toBSON()).to.throw();
        });
    });
});
