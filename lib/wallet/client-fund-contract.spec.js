'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const fakeClientFundDeployment = {
    networks: {
        '123456789': {
            address: 'some address'
        }
    },
    abi: []
};

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

describe('ClientFundContract', () => {
    ['ropsten', 'homestead'].forEach((network) => {
        describe(network, () => {
            const abstractionModule = network === 'ropsten' ? 'nahmii-contract-abstractions-ropsten' : 'nahmii-contract-abstractions';
            const ClientFundContract = proxyquire('./client-fund-contract', {
                'ethers': fakeEthers,
                [`${abstractionModule}/build/contracts/ClientFund.json`]: fakeClientFundDeployment
            });
    
            const fakeProvider = {
                network: {
                    chainId: '123456789',
                    name: network
                }
            };
            const fakeWallet = {
                provider: fakeProvider
            };
    
            [
                ['wallet', fakeWallet],
                ['provider', fakeProvider]
            ].forEach(([description, walletOrProvider]) => {
                context('with ' + description, () => {
                    let contract;
    
                    beforeEach(() => {
                        contract = new ClientFundContract(walletOrProvider);
                    });
    
                    it('is an instance of Contract', () => {
                        expect(contract).to.be.an.instanceOf(Contract);
                    });
    
                    it('uses correct contract address in construction', () => {
                        expect(contract.addr).to.eql(fakeClientFundDeployment.networks['123456789'].address);
                        expect(contract.abi).to.eql(fakeClientFundDeployment.abi);
                        expect(contract.signerOrProvider).to.equal(walletOrProvider);
                    });
                });
            });
        });
    });

    context('with unsupported network', () => {
        const ClientFundContract = proxyquire('./client-fund-contract', {
            'ethers': fakeEthers
        });
        const fakeProvider = {
            network: {
                chainId: '123456789',
                name: 'test'
            }
        };
        it('should throw exception', (done) => {
            try {
                new ClientFundContract(fakeProvider);
            }
            catch (error) {
                expect(error.message).to.match(/unknown.*network.*test/i);
                done();
            }
        });
    });
});
