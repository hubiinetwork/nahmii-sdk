'use strict';

const {isRevertContractException} = require('./utils');
const NahmiiContract = require('../contract');
const NestedError = require('../nested-error');

class NullSettlementChallengeContract extends NahmiiContract {
    constructor(walletOrProvider) {
        super('NullSettlementChallengeByPayment', walletOrProvider);
    }

    /**
     * Returns expire state of the current proposal
     * @param {EthereumAddress} address - The wallet address
     * @param {EthereumAddress} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a boolean value indicating if the latest challenge has expired.
     * @example
     * let hasExpired = await nullSettlement.hasCurrentProposalExpired(address, ct, id);
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
     * Returns the terminated state of the current proposal
     * @param {EthereumAddress} address - The wallet address
     * @param {EthereumAddress} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a boolean value indicating if the latest challenge has been terminated.
     * @example
     * let hasTerminated = await nullSettlement.hasCurrentProposalTerminated(address, ct, id);
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
     * Returns expiration timestamp
     * @param {EthereumAddress} address - The wallet address
     * @param {EthereumAddress} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the timeout timestamp.
     * @example
     * let expirationTime = await nullSettlement.getCurrentProposalExpirationTime(address, ct, id);
     */
    async getCurrentProposalExpirationTime(address, ct, id) {
        try {
            return await this.proposalExpirationTime(address.toString(), ct.toString(), id);
        }
        catch (err) {
            if (isRevertContractException(err))
                return null;

            throw new NestedError(err, 'Unable to get the expiration time for current proposal.');
        }
    }

    /**
     * Returns intended stage amount of the current challenge proposal
     * @param {EthereumAddress} address - The wallet address
     * @param {EthereumAddress} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a BigNumber value representing the indended stage amount for the latest challenge.
     * @example
     * let stagedAmount = await nullSettlement.getCurrentProposalStageAmount(address, ct, id);
     */
    async getCurrentProposalStageAmount(address, ct, id) {
        try {
            return await this.proposalStageAmount(address.toString(), ct.toString(), id);
        }
        catch (err) {
            if (isRevertContractException(err))
                return null;

            throw new NestedError(err, 'Unable to get the stage amount for current proposal.');
        }
    }

    /**
     * Returns status of the current challenge proposal
     * @param {EthereumAddress} address - The wallet address
     * @param {EthereumAddress} ct - The currency address
     * @param {Integer} id - The currency id
     * @returns {Promise} A promise that resolves into a string of either ['Qualified', 'Disqualified'] indicating the status of the latest challenge.
     * @example
     * let status = await nullSettlement.getCurrentProposalStatus(address, ct, id);
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

            throw new NestedError(err, 'Unable to get the status for current proposal.');
        }
    }
}

module.exports = NullSettlementChallengeContract;
