'use strict';

const TokenHolderRevenueFundContractsEnsemble = require('./token-holder-revenue-fund-contracts-ensemble');
const NestedError = require('../nested-error');
const {ethers: {utils: {formatUnits}}} = require('ethers');

const _tokenHolderRevenueFundContractEnsemble = new WeakMap();
const _provider = new WeakMap();

async function getTokenInfo(currency) {
    return _provider.get(this).getTokenInfo(currency.ct.toString(), true);
}

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
        _provider.set(this, provider);
    }

    /**
     * Get claimable accruals
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} [firstAccrual] - An optional lower accrual index boundary
     * @param {number} [lastAccrual] - An optional upper accrual index boundary
     * @returns {Promise} A promise that resolves into an array of claimable accruals.
     */
    async claimableAccruals(wallet, currency, firstAccrual, lastAccrual) {
        const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);

        firstAccrual = firstAccrual || 0;
        lastAccrual = lastAccrual || (await ensemble.closedAccrualsCount(currency)) - 1;

        const accruals = [...Array(lastAccrual - firstAccrual + 1).keys()]
            .map(o => firstAccrual + o);

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
     * @param {number} firstAccrual - The lower accrual index boundary
     * @param {number} lastAccrual - The upper accrual index boundary
     * @returns {Promise} A promise that resolves into a string value representing the claimable amount of fees.
     */
    async claimableFeesForAccruals(wallet, currency, firstAccrual, lastAccrual) {
        const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);

        const claimableAmount = await ensemble.claimableAmountByAccruals(
            wallet, currency, firstAccrual, lastAccrual
        );

        const tokenInfo = await getTokenInfo.call(this, currency);

        return tokenInfo ? formatUnits(claimableAmount, tokenInfo.decimals) : claimableAmount.toString();
    }

    /**
     * Claim fees for a span of accruals
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} firstAccrual - The lower accrual index boundary
     * @param {number} lastAccrual - The upper accrual index boundary
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an array of transaction hashes.
     */
    async claimFeesForAccruals(wallet, currency, firstAccrual, lastAccrual, options) {
        try {
            const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);
            const txs = ensemble.claimAndStageByAccruals(
                wallet, currency, firstAccrual, lastAccrual, options
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
     * @param {number} firstBlock - The lower block number boundary
     * @param {number} lastBlock - The upper block number boundary
     * @returns {Promise} A promise that resolves into a string value representing the claimable amount of fees.
     */
    async claimableFeesForBlocks(wallet, currency, firstBlock, lastBlock) {
        const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);

        const claimableAmount = await ensemble.claimableAmountByBlockNumbers(
            wallet, currency, firstBlock, lastBlock
        );

        const tokenInfo = await getTokenInfo.call(this, currency);

        return tokenInfo ? formatUnits(claimableAmount, tokenInfo.decimals) : claimableAmount.toString();
    }

    /**
     * Claim fees for a span of block numbers
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} firstBlock - The lower block number boundary
     * @param {number} lastBlock - The upper block number boundary
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an array of transaction hashes.
     */
    async claimFeesForBlocks(wallet, currency, firstBlock, lastBlock, options) {
        try {
            const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);
            const txs = ensemble.claimAndStageByBlockNumbers(
                wallet, currency, firstBlock, lastBlock, options
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
     * @returns {Promise} A promise that resolves into a string value representing the withdrawable amount of fees.
     */
    async withdrawableFees(wallet, currency) {
        const ensemble = _tokenHolderRevenueFundContractEnsemble.get(this);

        const withdrawableFees = await ensemble.stagedBalance(wallet, currency);

        const tokenInfo = await getTokenInfo.call(this, currency);

        return tokenInfo ? formatUnits(withdrawableFees, tokenInfo.decimals) : withdrawableFees.toString();
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
