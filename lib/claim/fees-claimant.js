'use strict';

const TokenHolderRevenueFundContract = require('./token-holder-revenue-fund-contract');
const NestedError = require('../nested-error');

const _tokenHolderRevenueFund = new WeakMap();

/**
 * @class FeesClaimant
 * A class for the claiming and withdrawal of accrued fees
 * @alias module:nahmii-sdk
 */
class FeesClaimant {
    constructor(provider) {
        _tokenHolderRevenueFund.set(this, new TokenHolderRevenueFundContract(provider));
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
        const tokenHolderRevenueFund = _tokenHolderRevenueFund.get(this);
        return tokenHolderRevenueFund.claimableAmountByAccruals(
            wallet.address, currency.ct.toString(), currency.id, startAccrual, endAccrual
        );
    }

    /**
     * Claim fees for a span of accruals
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} startAccrual - The lower accrual index boundary
     * @param {number} endAccrual - The upper accrual index boundary
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into a record that contains the transaction hash.
     */
    async claimFeesForAccruals(wallet, currency, startAccrual, endAccrual, options) {
        try {
            const tokenHolderRevenueFund = _tokenHolderRevenueFund.get(this).connect(wallet);
            const tx = tokenHolderRevenueFund.claimAndStageByAccruals(
                currency.ct.toString(), currency.id, startAccrual, endAccrual, options
            );
            return tx;
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
        const tokenHolderRevenueFund = _tokenHolderRevenueFund.get(this);
        return tokenHolderRevenueFund.claimableAmountByBlockNumbers(
            wallet.address, currency.ct.toString(), currency.id, startBlock, endBlock
        );
    }

    /**
     * Claim fees for a span of block numbers
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} startBlock - The lower block number boundary
     * @param {number} endBlock - The upper block number boundary
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into a record that contains the transaction hash.
     */
    async claimFeesForBlocks(wallet, currency, startBlock, endBlock, options) {
        try {
            const tokenHolderRevenueFund = _tokenHolderRevenueFund.get(this).connect(wallet);
            const tx = tokenHolderRevenueFund.claimAndStageByBlockNumbers(
                currency.ct.toString(), currency.id, startBlock, endBlock, options
            );
            return tx;
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
        const tokenHolderRevenueFund = _tokenHolderRevenueFund.get(this);
        return tokenHolderRevenueFund.stagedBalance(
            wallet.address, currency.ct.toString(), currency.id
        );
    }

    /**
     * Withdraw the given amount of fees
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {MonetaryAmount} monetaryAmount - The monetary amount
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into a record that contains the transaction hash.
     */
    async withdrawFees(wallet, monetaryAmount, options) {
        try {
            const tokenHolderRevenueFund = _tokenHolderRevenueFund.get(this).connect(wallet);
            const tx = tokenHolderRevenueFund.withdraw(
                monetaryAmount.amount, monetaryAmount.currency.ct.toString(), monetaryAmount.currency.id, 'ERC20', options
            );
            return tx;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to withdraw fees.');
        }
    }
}

module.exports = FeesClaimant;
