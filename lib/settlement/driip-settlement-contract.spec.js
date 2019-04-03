'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const fakeDriipSettlementDeployment = {
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

describe('DriipSettlementContract', () => {
    ['ropsten'].forEach((network) => {
        const abstractionModule = network === 'ropsten' ? 'nahmii-contract-abstractions-ropsten' : 'nahmii-contract-abstractions';
        const DriipSettlementContract = proxyquire('./driip-settlement-contract', {
            'ethers': fakeEthers,
            [`${abstractionModule}/build/contracts/DriipSettlementByPayment.json`]: fakeDriipSettlementDeployment
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
                    contract = new DriipSettlementContract(walletOrProvider);
                });
    
                it('is an instance of Contract', () => {
                    expect(contract).to.be.an.instanceOf(Contract);
                });
    
                it('uses correct contract address in construction', () => {
                    expect(contract.addr).to.eql(fakeDriipSettlementDeployment.networks['123456789'].address);
                    expect(contract.abi).to.eql(fakeDriipSettlementDeployment.abi);
                    expect(contract.signerOrProvider).to.equal(walletOrProvider);
                });
            });
        });
    });

    context('with unsupported network', () => {
        const DriipSettlementContract = proxyquire('./driip-settlement-contract', {
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
                new DriipSettlementContract(fakeProvider);
            }
            catch (error) {
                done();
            }
        });
    });
});
