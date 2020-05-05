'use strict';

const TokenHolderRevenueFundContractsEnsemble = require('./token-holder-revenue-fund-contracts-ensemble');
const NestedError = require('../nested-error');

const _tokenHolderRevenueFundContractEnsemble = new WeakMap();

/**
 * @class FeesClaimant
 * A class for the claiming and withdrawal of accrued fees
 * @alias module:nahmii-sdk
 */
class FeesClaimant {
    constructor(provider, abstractionNames) {
        _tokenHolderRevenueFundContractEnsemble.set(
            this, new TokenHolderRevenueFundContractsEnsemble(provider, abstractionNames)
        );
    }

    /**
     * Get claimable accruals
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} [startAccrual] - An optional lower accrual index boundary
     * @param {number} [endAccrual] - An optional upper accrual index boundary
     * @returns {Promise} A promise that resolves into an array of claimable accruals.
     */
    async claimableAccruals(wallet, currency, startAccrual, endAccrual) {
        const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);

        startAccrual = startAccrual || 0;
        endAccrual = endAccrual || (await ensemble.closedAccrualsCount(currency)) - 1;

        const accruals = [...Array(endAccrual - startAccrual + 1).keys()]
            .map(o => startAccrual + o);

        const accrualClaimableStats = (await Promise.all(
            accruals.map(accrual => ensemble.fullyClaimed(wallet, currency, accrual))
        ))
            .map((fullyClaimed, index) => ({
                accrual: accruals[index],
                claimable: !fullyClaimed
            }));

        const claimableAccruals = accrualClaimableStats
            .filter(s => s.claimable)
            .map(s => s.accrual);

        return claimableAccruals;
    }

    /**
     * Get claimable amount of fees for a span of accruals
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} startAccrual - The lower accrual index boundary
     * @param {number} endAccrual - The upper accrual index boundary
     * @returns {Promise} A promise that resolves into a BigNumber value representing the claimable amount of fees.
     */
    async claimableFeesForAccruals(wallet, currency, startAccrual, endAccrual) {
        const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);
        return ensemble.claimableAmountByAccruals(
            wallet, currency, startAccrual, endAccrual
        );
    }

    /**
     * Claim fees for a span of accruals
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} startAccrual - The lower accrual index boundary
     * @param {number} endAccrual - The upper accrual index boundary
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an array of transaction hashes.
     */
    async claimFeesForAccruals(wallet, currency, startAccrual, endAccrual, options) {
        try {
            const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);
            const txs = ensemble.claimAndStageByAccruals(
                wallet, currency, startAccrual, endAccrual, options
            );
            return txs;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to claim fees for accruals.');
        }
    }

    /**
     * Get claimable amount of fees for a span of block numbers
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} startBlock - The lower block number boundary
     * @param {number} endBlock - The upper block number boundary
     * @returns {Promise} A promise that resolves into a BigNumber value representing the claimable amount of fees.
     */
    async claimableFeesForBlocks(wallet, currency, startBlock, endBlock) {
        const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);
        return ensemble.claimableAmountByBlockNumbers(
            wallet, currency, startBlock, endBlock
        );
    }

    /**
     * Claim fees for a span of block numbers
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} startBlock - The lower block number boundary
     * @param {number} endBlock - The upper block number boundary
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an array of transaction hashes.
     */
    async claimFeesForBlocks(wallet, currency, startBlock, endBlock, options) {
        try {
            const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);
            const txs = ensemble.claimAndStageByBlockNumbers(
                wallet, currency, startBlock, endBlock, options
            );
            return txs;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to claim fees for blocks.');
        }
    }

    /**
     * Get the withdrawable amount of fees
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @returns {Promise} A promise that resolves into a BigNumber value representing the withdrawable amount of fees.
     */
    async withdrawableFees(wallet, currency) {
        const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);
        return ensemble.stagedBalance(wallet, currency);
    }

    /**
     * Withdraw the given amount of fees
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {MonetaryAmount} monetaryAmount - The monetary amount
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an array of transaction hashes.
     */
    async withdrawFees(wallet, monetaryAmount, options) {
        try {
            const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);
            const txs = ensemble.withdraw(
                wallet, monetaryAmount, 'ERC20', options
            );
            return txs;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to withdraw fees.');
        }
    }
}

module.exports = FeesClaimant;
