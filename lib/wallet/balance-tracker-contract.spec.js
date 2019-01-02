'use strict';

const chai = require('chai');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const fakeBalanceTrackerDeployment = {
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

const BalanceTrackerContract = proxyquire('./balance-tracker-contract', {
    'ethers': fakeEthers,
    './abis/ropsten/BalanceTracker': fakeBalanceTrackerDeployment
});

const fakeProvider = {
    network: {
        chainId: '123456789',
        name: 'ropsten'
    }
};
const fakeWallet = {
    provider: fakeProvider
};

describe('BalanceTrackerContract', () => {

    [
        ['wallet', fakeWallet],
        ['provider', fakeProvider]
    ].forEach(([description, walletOrProvider]) => {
        context('with ' + description, () => {
            let contract;

            beforeEach(() => {
                contract = new BalanceTrackerContract(walletOrProvider);
            });

            it('is an instance of Contract', () => {
                expect(contract).to.be.an.instanceOf(Contract);
            });

            it('uses correct contract address in construction', () => {
                expect(contract.addr).to.eql(fakeBalanceTrackerDeployment.networks['123456789'].address);
                expect(contract.abi).to.eql(fakeBalanceTrackerDeployment.abi);
                expect(contract.signerOrProvider).to.equal(walletOrProvider);
            });
        });
    });
});
