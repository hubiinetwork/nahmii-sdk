'use strict';

const ethers = require('ethers');
const {caseInsensitiveCompare} = require('../utils');

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
 * @param {Address} address - The wallet address
 * @returns {number} The nonce
 */
function determineNonceFromReceipt(receipt, address) {
    const {sender, recipient} = receipt;
    return caseInsensitiveCompare(sender.wallet, address) ? sender.nonce : recipient.nonce;
}

/**
 * Determine the balance amount for a wallet.
 * @param {Receipt} receipt - The receipt object
 * @param {Address} address - The wallet address
 * @returns {BigNumber} The receipt balance amount
 */
function determineBalanceFromReceipt(receipt, address) {
    if (caseInsensitiveCompare(receipt.sender.wallet, address))
        return ethers.utils.bigNumberify(receipt.sender.balances.current);
    if (caseInsensitiveCompare(receipt.recipient.wallet, address))
        return ethers.utils.bigNumberify(receipt.recipient.balances.current);
}

module.exports = {
    isRevertContractException,
    determineNonceFromReceipt,
    determineBalanceFromReceipt
};
