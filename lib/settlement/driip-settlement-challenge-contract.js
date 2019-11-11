'use strict';

const {isRevertContractException} = require('./utils');
const NahmiiContract = require('../contract');
const NestedError = require('../nested-error');

class DriipSettlementChallengeContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('DriipSettlementChallengeByPayment', walletOrProvider);
    }

    /**
     * Returns the proposal nonce
     * @param {EthereumAddress} address - The wallet address
     * @param {EthereumAddress} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the nonce of the latest challenge.
     * @example
     * let nonce = await driipSettlement.getCurrentProposalNonce(address, ct, id);
     */
    async getCurrentProposalNonce(address, ct, id) {
        try {
            return await this.proposalNonce(address.toString(), ct.toString(), id);
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the nonce of the current proposal.');
        }
    }

    /**
     * Returns the expiration time of the proposal
     * @param {EthereumAddress} address - The wallet address
     * @param {EthereumAddress} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the timeout timestamp.
     * @example
     * let expirationTime = await driipSettlement.getCurrentProposalExpirationTime(address, ct, id);
     */
    async getCurrentProposalExpirationTime(address, ct, id) {
        try {
            return await this.proposalExpirationTime(address.toString(), ct.toString(), id);
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the expiration time of the current proposal.');
        }
    }

    /**
     * Returns expire state of the current proposal
     * @param {EthereumAddress} address - The wallet address
     * @param {EthereumAddress} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a boolean value indicating if the latest challenge has expired.
     * @example
     * let hasExpired = await driipSettlement.hasCurrentProposalExpired(address, ct, id);
     */
    async hasCurrentProposalExpired(address, ct, id) {
        try {
            return await this.hasProposalExpired(address.toString(), ct.toString(), id);
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to check whether the proposal has expired.');
        }
    }

    /**
     * Returns terminate state of the current proposal
     * @param {EthereumAddress} address - The wallet address
     * @param {EthereumAddress} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a boolean value indicating if the latest challenge has been terminated.
     * @example
     * let hasExpired = await driipSettlement.hasCurrentProposalTerminated(address, ct, id);
     */
    async hasCurrentProposalTerminated(address, ct, id) {
        try {
            return await this.hasProposalTerminated(address.toString(), ct.toString(), id);
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to check whether the proposal has been terminated.');
        }
    }

    /**
     * Returns intended stage amount of the current challenge proposal
     * @param {EthereumAddress} address - The wallet address
     * @param {EthereumAddress} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the indended stage amount for the latest challenge.
     * @example
     * let stagedAmount = await driipSettlement.getCurrentProposalStageAmount(address, ct, id);
     */
    async getCurrentProposalStageAmount(address, ct, id) {
        try {
            return await this.proposalStageAmount(address.toString(), ct.toString(), id);
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the stage amount of the proposal.');
        }
    }

    /**
     * Returns status of the current challenge proposal
     * @param {EthereumAddress} address - The wallet address
     * @param {EthereumAddress} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a string of either ['Qualified', 'Disqualified'] indicating the status of the latest challenge.
     * @example
     * let status = await driipSettlement.getCurrentProposalStatus(address, ct, id);
     */
    async getCurrentProposalStatus(address, ct, id) {
        const challengeStatuses = ['Qualified', 'Disqualified'];
        try {
            const statusIndex = await this.proposalStatus(address.toString(), ct.toString(), id);
            return challengeStatuses[statusIndex];
        }
        catch (err) {
            if (isRevertContractException(err)) 
                return null;
            
            throw new NestedError(err, 'Unable to get the status of the proposal.');
        }
    }
}

module.exports = DriipSettlementChallengeContract;
