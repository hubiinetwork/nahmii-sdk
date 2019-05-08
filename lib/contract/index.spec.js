'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

class Contract {
    constructor(addr, abi, signerOrProvider) {
        this.address = addr;
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
            address: '0x1234567890123456789012345678901234567890'
        }
    },
    abi: []
};

const fakeProvider = {
    network: {
        chainId: '123456789',
        name: 'some network name'
    },
    getClusterInformation: sinon.stub()
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
            let contract, clusterInformation;

            beforeEach(() => {
                clusterInformation = {
                    ethereum: {
                        contracts: {
                            contract1: '0x0000000000000000000000000000000000000001',
                            contract2: '0x0000000000000000000000000000000000000002',
                            SomeContractAbstraction: fakeDeployment.networks['123456789'].address,
                            contract3: '0x0000000000000000000000000000000000000003'
                        },
                        net: fakeProvider.network.name
                    }
                };
                fakeProvider.getClusterInformation.resolves(clusterInformation);

                stubbedContractAbstractions.get
                    .withArgs(fakeProvider.network.name, 'SomeContractAbstraction')
                    .returns(fakeDeployment);

                contract = new NahmiiContract('SomeContractAbstraction', walletOrProvider);
            });

            it('is an instance of Contract', () => {
                expect(contract).to.be.an.instanceOf(Contract);
            });

            it('uses correct contract address in construction', () => {
                expect(contract.address).to.eql(fakeDeployment.networks['123456789'].address);
                expect(contract.abi).to.eql(fakeDeployment.abi);
                expect(contract.signerOrProvider).to.equal(walletOrProvider);
            });

            describe('given a name and address that exist in the cluster', () => {
                it('can be validated', async () => {
                    expect(await contract.validate()).to.be.true;
                });
            });

            describe('given a name that doesnt exist in the cluster', () => {
                beforeEach(() => {
                    delete clusterInformation.ethereum.contracts.SomeContractAbstraction;
                });

                it('can not be validated', async () => {
                    expect(await contract.validate()).to.be.false;
                });
            });

            describe('given a valid name but incorrect address', () => {
                beforeEach(() => {
                    clusterInformation.ethereum.contracts.SomeContractAbstraction = '0x0000000000111111111122222222223333333333';
                });

                it('can not be validated', async () => {
                    expect(await contract.validate()).to.be.false;
                });
            });

            describe('given a mismatching network for the cluster', () => {
                beforeEach(() => {
                    clusterInformation.ethereum.net = 'whatevs network';
                });

                it('can not be validated', async () => {
                    expect(await contract.validate()).to.be.false;
                });
            });

            describe('abi contains invalid address (syntax)', () => {
                let contract;

                beforeEach(() => {
                    stubbedContractAbstractions.get
                        .withArgs(fakeProvider.network.name, 'SomeContractAbstraction')
                        .returns({
                            networks: {
                                '123456789': {
                                    address: 'not a valid address'
                                }
                            },
                            abi: []
                        });

                    contract = new NahmiiContract('SomeContractAbstraction', walletOrProvider);
                });

                it('can not be validated', async () => {
                    expect(await contract.validate()).to.be.false;
                });
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
