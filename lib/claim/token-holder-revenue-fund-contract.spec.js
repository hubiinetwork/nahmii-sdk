'use strict';

const CONTRACT_NAME = 'TokenHolderRevenueFund';
const CONTRACT_FILE = 'token-holder-revenue-fund-contract';
const LEGACY_CONTRACT_NAME = CONTRACT_NAME + '-123-456';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const stubbedNahmiiContractConstructor = sinon.stub();

function createContract(walletOrProvider, legacyContractName) {
    const ConfigurationContract = proxyquire('./' + CONTRACT_FILE, {
        '../contract': stubbedNahmiiContractConstructor
    });

    stubbedNahmiiContractConstructor
        .withArgs(CONTRACT_NAME, walletOrProvider)
        .returns(stubbedNahmiiContractConstructor);
    if (legacyContractName) {
        stubbedNahmiiContractConstructor
            .withArgs(legacyContractName, walletOrProvider)
            .returns(stubbedNahmiiContractConstructor);
    }
    return new ConfigurationContract(walletOrProvider, legacyContractName);
}

describe(CONTRACT_NAME, () => {
    const fakeProvider = {
        network: {
            chainId: '123456789',
            name: 'some network'
        }
    };
    const fakeWallet = {
        provider: fakeProvider
    };

    [
        ['wallet', fakeWallet],
        ['provider', fakeProvider]
    ].forEach(([description, walletOrProvider]) => {
        context('with ' + description + ' and no legacy contract name', () => {
            it('is an instance of NahmiiContract', () => {
                expect(createContract(walletOrProvider)).to.be.instanceOf(stubbedNahmiiContractConstructor);
            });
        });
    });

    [
        ['wallet', fakeWallet],
        ['provider', fakeProvider]
    ].forEach(([description, walletOrProvider]) => {
        context('with ' + description + ' and legacy contract name', () => {
            it('is an instance of NahmiiContract', () => {
                expect(createContract(walletOrProvider, LEGACY_CONTRACT_NAME)).to.be.instanceOf(stubbedNahmiiContractConstructor);
            });
        });
    });
});
