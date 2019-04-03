'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const fakeNullSettlementDeployment = {
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

describe('NullSettlementContract', () => {
    ['ropsten'].forEach((network) => {
        const abstractionModule = network === 'ropsten' ? 'nahmii-contract-abstractions-ropsten' : 'nahmii-contract-abstractions';
        const NullSettlementContract = proxyquire('./null-settlement-contract', {
            'ethers': fakeEthers,
            [`${abstractionModule}/build/contracts/NullSettlement.json`]: fakeNullSettlementDeployment
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
                    contract = new NullSettlementContract(walletOrProvider);
                });
    
                it('is an instance of Contract', () => {
                    expect(contract).to.be.an.instanceOf(Contract);
                });
    
                it('uses correct contract address in construction', () => {
                    expect(contract.addr).to.eql(fakeNullSettlementDeployment.networks['123456789'].address);
                    expect(contract.abi).to.eql(fakeNullSettlementDeployment.abi);
                    expect(contract.signerOrProvider).to.equal(walletOrProvider);
                });
            });
        });
    });

    context('with unsupported network', () => {
        const NullSettlementContract = proxyquire('./null-settlement-contract', {
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
                new NullSettlementContract(fakeProvider);
            }
            catch (error) {
                done();
            }
        });
    });
});
