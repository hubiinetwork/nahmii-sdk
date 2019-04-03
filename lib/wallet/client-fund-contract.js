'use strict';

const ethers = require('ethers');

class ClientFundContract extends ethers.Contract {
    constructor(walletOrProvider) {
        const provider = walletOrProvider.provider || walletOrProvider;
        const networkName = provider.network.name;
        const mappings = {
            homestead: require('nahmii-contract-abstractions/build/contracts/ClientFund.json'),
            ropsten: require('nahmii-contract-abstractions-ropsten/build/contracts/ClientFund.json')
        };

        const clientFundDeployment = mappings[networkName];
        if (!clientFundDeployment) 
            throw new Error('Unknown network name: ' + networkName);
        
        
        const chainId = provider.network.chainId;
        const clientFundAddress = clientFundDeployment.networks[chainId].address;

        super(clientFundAddress, clientFundDeployment.abi, walletOrProvider);
    }
}

module.exports = ClientFundContract;
