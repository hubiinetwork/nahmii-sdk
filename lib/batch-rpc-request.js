'use strict';

const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const ethers = require('ethers');

/**
 * @private
 * Creates a function selector for use in Ethereum smart contract calls
 * @param {string} functionDesc
 * @return {List} Function selector bytes
 */
function deriveFunctionSelector(functionDesc) {
    return ethers.utils
        .solidityKeccak256(['string'], [functionDesc])
        .slice(0, 10);
}

/**
 * @private
 * Extracts paramTypes from a function sig in format 'proposalStatus(address,address,uint256)'
 * @param {string} functionDesc
 * @return {List} Function selector bytes
 */
function extractParamTypes(functionDesc) {
    return functionDesc
        .split('(')[1]
        .split(')')[0]
        .split(',');
}

/**
 * Creates a function selector for use in Ethereum smart contract calls
 * @param {Address} fromAddress Address submitting the batch
 * @param {Address} contractAddress
 * @param {string} functionSig Name & param types of the function to be called, eg 'proposalStatus(address,address,uint256)'
 * @param {List} paramsList List of Lists containing the different sets of params the SC functions should be called with
 * @param {NahmiiProvider} provider
 * @return {List} paramTypes Function selector bytes
 */
function batchRpcRequest(
    fromAddress,
    contractAddress,
    functionDesc,
    paramsList,
    provider
) {
    const funcSelector = deriveFunctionSelector(functionDesc);
    const paramTypes = extractParamTypes(functionDesc);
    const payload = paramsList.map(params => {
        const encodedArgs = ethers.utils.defaultAbiCoder.encode(paramTypes, params);
        const dataArr = ethers.utils.concat([funcSelector, encodedArgs]);
        const data = ethers.utils.hexlify(dataArr);
        const requestParams = [{ from: fromAddress, to: contractAddress, data }, 'latest'];
        return {
            method: 'eth_call',
            params: requestParams,
            id: 42,
            jsonrpc: '2.0'
        };
    });
    return rpcRequest(provider.connection.url, JSON.stringify(payload));
}

// TODO replace this with cleaner, superagent implementation
/**
 * @private
 * Makes an RPC request to an Ethereum node
 * @param {string} url url of the node 
 * @param {string} json any data to POST with the request
 * @return {<Promise>} Promise that will resolve into the response from the node
 */
function rpcRequest(url, json) {
    const request = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
        request.open('POST', url, true);
        request.setRequestHeader('Content-Type', 'application/json');

        request.onreadystatechange = () => {
            if (request.readyState !== 4) return; 

            let result;
            try {
                result = JSON.parse(request.responseText);
            }
            catch (error) {
                const jsonError = new Error('invalid json response');
                reject(jsonError);
                return;
            }


            resolve(result);
        };

        request.send(json);
    });
}

module.exports = batchRpcRequest;
