'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

class Contract {
    constructor(addr, abi, signerOrProvider) {
        this.addr = addr;
        this.abi = abi;
        this.signerOrProvider = signerOrProvider;
    }
}

const fakeEthers = {
    Contract
};

const fakeDeployment = {
    networks: {
        '123456789': {
            address: 'some address'
        }
    },
    abi: []
};

const fakeProvider = {
    network: {
        chainId: '123456789',
        name: 'some network name'
    }
};
const fakeWallet = {
    provider: fakeProvider
};

const stubbedContractAbstractions = {
    get: sinon.stub()
};

const proxyquireNahmiiContract = function() {
    return proxyquire('./index', {
        'ethers': fakeEthers,
        './abstractions': stubbedContractAbstractions
    });
};

describe('NahmiiContract', () => {
    let NahmiiContract;

    beforeEach(() => {
        NahmiiContract = proxyquireNahmiiContract();
    });

    [
        ['wallet', fakeWallet],
        ['provider', fakeProvider]
    ].forEach(([description, walletOrProvider]) => {
        describe(`given a valid contract and a ${description}`, () => {
            let contract;

            beforeEach(() => {
                stubbedContractAbstractions.get
                    .withArgs(fakeProvider.network.name, 'SomeContractAbstraction')
                    .returns(fakeDeployment);

                contract = new NahmiiContract('SomeContractAbstraction', walletOrProvider);
            });

            it('is an instance of Contract', () => {
                expect(contract).to.be.an.instanceOf(Contract);
            });

            it('uses correct contract address in construction', () => {
                expect(contract.addr).to.eql(fakeDeployment.networks['123456789'].address);
                expect(contract.abi).to.eql(fakeDeployment.abi);
                expect(contract.signerOrProvider).to.equal(walletOrProvider);
            });
        });
    });

    describe('when contract abstraction can not be loaded', () => {
        beforeEach(() => {
            stubbedContractAbstractions.get.throws(new Error('reasons'));
        });

        it('throws an error', () => {
            expect(
                () => new NahmiiContract('invalid contract name', fakeWallet)
            ).to.throw(Error, /reasons/i);
        });
    });
});
