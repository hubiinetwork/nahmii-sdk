'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const fakeNullSettlementStateDeployment = {
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

describe('NullSettlementStateContract', () => {
    ['ropsten'].forEach((network) => {
        const abstractionModule = network === 'ropsten' ? 'nahmii-contract-abstractions-ropsten' : 'nahmii-contract-abstractions';
        const NullSettlementStateContract = proxyquire('./null-settlement-state-contract', {
            'ethers': fakeEthers,
            [`${abstractionModule}/build/contracts/NullSettlementState.json`]: fakeNullSettlementStateDeployment
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
                    contract = new NullSettlementStateContract(walletOrProvider);
                });
    
                it('is an instance of Contract', () => {
                    expect(contract).to.be.an.instanceOf(Contract);
                });
    
                it('uses correct contract address in construction', () => {
                    expect(contract.addr).to.eql(fakeNullSettlementStateDeployment.networks['123456789'].address);
                    expect(contract.abi).to.eql(fakeNullSettlementStateDeployment.abi);
                    expect(contract.signerOrProvider).to.equal(walletOrProvider);
                });
            });
        });
    });

    context('with unsupported network', () => {
        const NullSettlementStateContract = proxyquire('./null-settlement-state-contract', {
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
                new NullSettlementStateContract(fakeProvider);
            }
            catch (error) {
                expect(error.message).to.match(/unknown.*network.*test/i);
                done();
            }
        });
    });
});
