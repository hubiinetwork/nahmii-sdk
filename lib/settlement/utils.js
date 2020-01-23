'use strict';

const ethers = require('../ethers');
const {EthereumAddress} = require('nahmii-ethereum-address');

/**
 * Checks whether it is an expected revert contract exception.
 * @param {Error} error - error object thrown by ethers contract funcion call
 * @returns {Boolean} True if it is revert exception thrown by the contract
 */
function isRevertContractException(error) {
    return error.code === 'CALL_EXCEPTION' || error.code === -32000;
}

/**
 * Determine the settlement nonce for a wallet.
 * @param {Receipt} receipt - The receipt object
 * @param {EthereumAddress} address - The wallet address
 * @returns {number} The nonce
 */
function determineNonceFromReceipt(receipt, address) {
    const {sender, recipient} = receipt;
    const senderAddress = EthereumAddress.from(sender.wallet);
    const recipientAddress = EthereumAddress.from(recipient.wallet);
    
    if (senderAddress.isEqual(address)) 
        return sender.nonce;
    
    if (recipientAddress.isEqual(address)) 
        return recipient.nonce;
    
    throw new Error('The address neither matches the sender or recipient.');
}

/**
 * Determine the balance amount for a wallet.
 * @param {Receipt} receipt - The receipt object
 * @param {EthereumAddress} address - The wallet address
 * @returns {BigNumber} The receipt balance amount
 */
function determineBalanceFromReceipt(receipt, address) {
    const {sender, recipient} = receipt;
    const senderAddress = EthereumAddress.from(sender.wallet);
    const recipientAddress = EthereumAddress.from(recipient.wallet);

    if (senderAddress.isEqual(address)) 
        return ethers.utils.bigNumberify(sender.balances.current);
    
    if (recipientAddress.isEqual(address)) 
        return ethers.utils.bigNumberify(recipient.balances.current);
    
    throw new Error('The address neither matches the sender or recipient.');
}

module.exports = {
    isRevertContractException,
    determineNonceFromReceipt,
    determineBalanceFromReceipt
};
