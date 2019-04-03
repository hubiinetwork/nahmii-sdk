'use strict';

const ethers = require('ethers');

class ClientFundContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        let clientFundDeployment;

        if (networkName === 'homestead') 
            clientFundDeployment = require('nahmii-contract-abstractions/build/contracts/ClientFund.json');
        
        if (networkName === 'ropsten') 
            clientFundDeployment = require('nahmii-contract-abstractions-ropsten/build/contracts/ClientFund.json');
        
        
        const chainId = provider.network.chainId;
        const clientFundAddress = clientFundDeployment.networks[chainId].address;

        super(clientFundAddress, clientFundDeployment.abi, walletOrProvider);
    }
}

module.exports = ClientFundContract;
