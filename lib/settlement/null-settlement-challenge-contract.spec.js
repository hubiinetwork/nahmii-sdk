'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const fakeNullSettlementChallengeDeployment = {
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

describe('NullSettlementChallengeContract', () => {
    ['ropsten', 'homestead'].forEach((network) => {
        const abstractionModule = network === 'ropsten' ? 'nahmii-contract-abstractions-ropsten' : 'nahmii-contract-abstractions';
        const NullSettlementChallengeContract = proxyquire('./null-settlement-challenge-contract', {
            'ethers': fakeEthers,
            [`${abstractionModule}/build/contracts/NullSettlementChallengeByPayment.json`]: fakeNullSettlementChallengeDeployment
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
                    contract = new NullSettlementChallengeContract(walletOrProvider);
                });

                it('is an instance of Contract', () => {
                    expect(contract).to.be.an.instanceOf(Contract);
                });

                it('uses correct contract address in construction', () => {
                    expect(contract.addr).to.eql(fakeNullSettlementChallengeDeployment.networks['123456789'].address);
                    expect(contract.abi).to.eql(fakeNullSettlementChallengeDeployment.abi);
                    expect(contract.signerOrProvider).to.equal(walletOrProvider);
                });
            });
        });
    });
});
