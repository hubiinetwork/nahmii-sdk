'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const fakeDriipSettlementChallengeDeployment = {
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

describe('DriipSettlementChallengeContract', () => {
    ['ropsten'].forEach((network) => {
        const abstractionModule = network === 'ropsten' ? 'nahmii-contract-abstractions-ropsten' : 'nahmii-contract-abstractions';
        const DriipSettlementChallengeContract = proxyquire('./driip-settlement-challenge-contract', {
            'ethers': fakeEthers,
            [`${abstractionModule}/build/contracts/DriipSettlementChallengeByPayment.json`]: fakeDriipSettlementChallengeDeployment
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
                    contract = new DriipSettlementChallengeContract(walletOrProvider);
                });
    
                it('is an instance of Contract', () => {
                    expect(contract).to.be.an.instanceOf(Contract);
                });
    
                it('uses correct contract address in construction', () => {
                    expect(contract.addr).to.eql(fakeDriipSettlementChallengeDeployment.networks['123456789'].address);
                    expect(contract.abi).to.eql(fakeDriipSettlementChallengeDeployment.abi);
                    expect(contract.signerOrProvider).to.equal(walletOrProvider);
                });
            });
        });
    });
    context('with unsupported network', () => {
        const DriipSettlementChallengeContract = proxyquire('./driip-settlement-challenge-contract', {
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
                new DriipSettlementChallengeContract(fakeProvider);
            }
            catch (error) {
                done();
            }
        });
    });
});
