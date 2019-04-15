'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedRopstenAbstractions = {
    getAbstraction: sinon.stub()
};

describe('Contract Abstractions #get()', () => {
    let abstractions;

    beforeEach(() => {
        abstractions = proxyquire('./index', {
            'nahmii-contract-abstractions-ropsten': stubbedRopstenAbstractions,
            // TODO: Fix once mainnet abstractions factory is available
            'nahmii-contract-abstractions/build/contracts/a valid contract.json': {}
        });
    });

    describe('given a valid network and contract name', () => {
        ['ropsten', 'homestead'].forEach(networkName => {
            describe(`given a valid contract name for '${networkName}'`, () => {
                const contractName = 'a valid contract';

                beforeEach(() => {
                    stubbedRopstenAbstractions.getAbstraction
                        .withArgs(networkName, contractName)
                        .returns({});
                });

                it('returns the abstraction', () => {
                    expect(abstractions.get(networkName, contractName)).to.not.be.null;
                });
            });

            describe(`given an invalid contract name for '${networkName}'`, () => {
                beforeEach(() => {
                    stubbedRopstenAbstractions.getAbstraction
                        .throws(new Error('unable to find module'));
                });

                it('throws an error', () => {
                    expect(() => abstractions.get(networkName, 'contract?')).to.throw(Error, /find module/i);
                });
            });
        });
    });

    describe('given an unknown network name', () => {
        it('throws an error', () => {
            expect(() => abstractions.get('network?', 'contract?')).to.throw(Error, /unknown network/i);
        });
    });
});
