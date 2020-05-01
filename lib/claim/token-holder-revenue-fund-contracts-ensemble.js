'use strict';

const {utils: {bigNumberify}} = require('ethers');
const TokenHolderRevenueFundContract = require('./token-holder-revenue-fund-contract');
const NestedError = require('../nested-error');

const _ensemble = new WeakMap();
const _decomposedByCurrency = new WeakMap();
const _firstAccrualOffset = new WeakMap();

const currencyToKey = (currency) => `${currency.ct.toString()}-${currency.id}`;

const minBigNumber = function (n1, n2) {
    return n1.lt(n2) ? n1 : n2;
};

/**
 * @class TokenHolderRevenueFundContractsEnsemble
 * An ensemble of instances of TokenHolderRevenueFundContract
 * @alias module:nahmii-sdk
 */
class TokenHolderRevenueFundContractsEnsemble {
    constructor(walletOrProvider, abstractionNames = ['TokenHolderRevenueFund'], firstAccrualOffset = 0) {
        _ensemble.set(this, abstractionNames.map(n => ({contract: new TokenHolderRevenueFundContract(walletOrProvider, n)})));
        _decomposedByCurrency.set(this, new Map());
        _firstAccrualOffset.set(this, firstAccrualOffset > 0 ? firstAccrualOffset : 0);
    }

    /**
     * Returns the first accrual's offset index used in decomposition
     * @returns {number} - First accrual's offset
     */
    get firstAccrualOffset() {
        return _firstAccrualOffset.get(this);
    }

    /**
     * Return status of whether contract instance decomposition has been executed
     * for the given currency
     * @param {Currency} currency - The currency
     * @returns {boolean} True if decomposition has been executed, else false
     */
    isDecomposed(currency) {
        const decomposedByCurrency = _decomposedByCurrency.get(this);
        return decomposedByCurrency.get(currencyToKey(currency)) || false;
    }

    /**
     * Execute contract instance decomposition for the given currency
     * @param {Currency} currency - The currency
     */
    async decompose(currency) {
        const ensemble = _ensemble.get(this);
        let globalAccrualOffset = _firstAccrualOffset.get(this);
        const currencyKey = currencyToKey(currency);

        for (const configuration of ensemble) {
            const closedAccrualsCount = (await configuration.contract.closedAccrualsCount(
                currency.ct.toString(), currency.id
            )).toNumber();

            const currencyDecomposition = {};
            currencyDecomposition.startAccrual = globalAccrualOffset || 0;
            currencyDecomposition.endAccrual = currencyDecomposition.startAccrual + closedAccrualsCount - 1;
            currencyDecomposition.startBlock =
                (await configuration.contract.closedAccrualsByCurrency(
                    currency.ct.toString(), currency.id, currencyDecomposition.startAccrual
                )).startBlock.toNumber();
            currencyDecomposition.endBlock =
                (await configuration.contract.closedAccrualsByCurrency(
                    currency.ct.toString(), currency.id, currencyDecomposition.endAccrual
                )).endBlock.toNumber();

            if (!configuration.decompositionsByCurrency)
                configuration.decompositionsByCurrency = new Map();

            configuration.decompositionsByCurrency.set(currencyKey, currencyDecomposition);

            globalAccrualOffset = currencyDecomposition.endAccrual + 1;
        }

        _decomposedByCurrency.get(this).set(currencyKey, true);
    }

    /**
     * Return status of whether the given accrual has been fully claimed
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @returns {boolean} True if fully claimed, else false
     */
    async fullyClaimed(wallet, currency, accrual) {
        if (!this.isDecomposed(currency))
            await this.decompose(currency);

        const ensemble = _ensemble.get(this);
        const currencyKey = currencyToKey(currency);

        for (const configuration of ensemble) {
            const decomposition = configuration.decompositionsByCurrency.get(currencyKey);
            if (decomposition.startAccrual <= accrual && accrual <= decomposition.endAccrual) {
                return configuration.contract.fullyClaimed(
                    wallet.address, currency.ct.toString(), currency.id, accrual
                );
            }
        }

        return false;
    }

    /**
     * Get the count of closed accruals for the given currency
     * @param {Currency} currency - The currency
     * @returns {Promise} A promise that resolves into the count of closed accruals
     */
    async closedAccrualsCount(currency) {
        const ensemble = _ensemble.get(this);

        const count = (await Promise.all(ensemble.map(c => c.contract.closedAccrualsCount(
            currency.ct.toString(), currency.id
        ))))
            .reduce((a, c) => a.add(c), bigNumberify(0));

        return count;
    }

    /**
     * Get claimable amount for the given span of accruals
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} startAccrual - The lower accrual index boundary
     * @param {number} endAccrual - The upper accrual index boundary
     * @returns {Promise} A promise that resolves into a BigNumber value representing the claimable amount.
     */
    async claimableAmountByAccruals(wallet, currency, startAccrual, endAccrual) {
        if (startAccrual > endAccrual)
            throw new Error(`Ordinality mismatch of startAccrual > endAccrual (${startAccrual} > ${endAccrual})`);

        if (!this.isDecomposed(currency))
            await this.decompose(currency);

        const ensemble = _ensemble.get(this);
        const currencyKey = currencyToKey(currency);

        let claimableFees = bigNumberify(0);

        for (const configuration of ensemble) {
            const decomposition = configuration.decompositionsByCurrency.get(currencyKey);

            if (endAccrual < decomposition.startAccrual || startAccrual > decomposition.endAccrual)
                continue;

            claimableFees = claimableFees.add(
                await configuration.contract.claimableAmountByAccruals(
                    wallet.address, currency.ct.toString(), currency.id,
                    Math.max(startAccrual, decomposition.startAccrual),
                    Math.min(endAccrual, decomposition.endAccrual)
                )
            );
        }

        return claimableFees;
    }

    /**
     * Claim and stage for the given span of accruals
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} startAccrual - The lower accrual index boundary
     * @param {number} endAccrual - The upper accrual index boundary
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an array of transaction hashes.
     */
    async claimAndStageByAccruals(wallet, currency, startAccrual, endAccrual, options) {
        if (startAccrual > endAccrual)
            throw new Error(`Ordinality mismatch of startAccrual > endAccrual (${startAccrual} > ${endAccrual})`);

        if (!this.isDecomposed(currency))
            await this.decompose(currency);

        const ensemble = _ensemble.get(this);
        const currencyKey = currencyToKey(currency);

        try {
            const txs = [];

            for (const configuration of ensemble) {
                const decomposition = configuration.decompositionsByCurrency.get(currencyKey);

                if (endAccrual < decomposition.startAccrual || startAccrual > decomposition.endAccrual)
                    continue;

                const contract = configuration.contract.connect(wallet);
                txs.push(
                    await contract.claimAndStageByAccruals(
                        currency.ct.toString(), currency.id,
                        Math.max(startAccrual, decomposition.startAccrual),
                        Math.min(endAccrual, decomposition.endAccrual),
                        options
                    )
                );
            }

            return txs;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to claim and stage by accruals.');
        }
    }

    /**
     * Get claimable amount for the given span of block numbers
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} startBlock - The lower block number boundary
     * @param {number} endBlock - The upper block number boundary
     * @returns {Promise} A promise that resolves into a BigNumber value representing the claimable amount.
     */
    async claimableAmountByBlockNumbers(wallet, currency, startBlock, endBlock) {
        if (startBlock > endBlock)
            throw new Error(`Ordinality mismatch of startBlock > endBlock (${startBlock} > ${endBlock})`);

        if (!this.isDecomposed(currency))
            await this.decompose(currency);

        const ensemble = _ensemble.get(this);
        const currencyKey = currencyToKey(currency);

        let claimableFees = bigNumberify(0);

        for (const configuration of ensemble) {
            const decomposition = configuration.decompositionsByCurrency.get(currencyKey);

            if (endBlock < decomposition.startBlock || startBlock > decomposition.endBlock)
                continue;

            claimableFees = claimableFees.add(
                await configuration.contract.claimableAmountByBlockNumbers(
                    wallet.address, currency.ct.toString(), currency.id,
                    Math.max(startBlock, decomposition.startBlock),
                    Math.min(endBlock, decomposition.endBlock)
                )
            );
        }

        return claimableFees;
    }

    /**
     * Claim and stage for the given span of block numbers
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} startBlock - The lower block number boundary
     * @param {number} endBlock - The upper block number boundary
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an array of transaction hashes.
     */
    async claimAndStageByBlockNumbers(wallet, currency, startBlock, endBlock, options) {
        if (startBlock > endBlock)
            throw new Error(`Ordinality mismatch of startBlock > endBlock (${startBlock} > ${endBlock})`);

        if (!this.isDecomposed(currency))
            await this.decompose(currency);

        const ensemble = _ensemble.get(this);
        const currencyKey = currencyToKey(currency);

        try {
            const txs = [];

            for (const configuration of ensemble) {
                const decomposition = configuration.decompositionsByCurrency.get(currencyKey);

                if (endBlock < decomposition.startBlock || startBlock > decomposition.endBlock)
                    continue;

                const contract = configuration.contract.connect(wallet);
                txs.push(
                    await contract.claimAndStageByBlockNumbers(
                        currency.ct.toString(), currency.id,
                        Math.max(startBlock, decomposition.startBlock),
                        Math.min(endBlock, decomposition.endBlock),
                        options
                    )
                );
            }

            return txs;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to claim and stage by blocks numbers.');
        }
    }

    /**
     * Get the staged balance
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @returns {Promise} A promise that resolves into a BigNumber value representing the staged balance
     */
    async stagedBalance(wallet, currency) {
        const ensemble = _ensemble.get(this);

        return (await Promise.all(ensemble.map(
            c => c.contract.stagedBalance(wallet.address, currency.ct.toString(), currency.id)
        )))
            .reduce((a, c) => a.add(c), bigNumberify(0));
    }

    /**
     * Withdraw the given amount
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {MonetaryAmount} monetaryAmount - The monetary amount
     * @param {string} [standard] - The currency standard
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an array of transaction hashes.
     */
    async withdraw(wallet, monetaryAmount, standard = 'ERC20', options = undefined) {
        if (!this.isDecomposed(monetaryAmount.currency))
            await this.decompose(monetaryAmount.currency);

        const stagedBalance = await this.stagedBalance(wallet, monetaryAmount.currency);
        if (stagedBalance.lt(monetaryAmount.amount))
            throw new Error(`Unable to withdraw more than ${stagedBalance.toString()}`);

        const ensemble = _ensemble.get(this);

        let amountDue = monetaryAmount.amount;

        try {
            const txs = [];

            for (const configuration of ensemble) {
                const withdrawableFees = await configuration.contract.stagedBalance(
                    wallet.address, monetaryAmount.currency.ct.toString(), monetaryAmount.currency.id
                );

                const amountToWithdraw = minBigNumber(amountDue, withdrawableFees);
                txs.push(
                    configuration.contract.connect(wallet).withdraw(
                        amountToWithdraw, monetaryAmount.currency.ct.toString(), monetaryAmount.currency.id, standard, options
                    )
                );

                amountDue = amountDue.sub(amountToWithdraw);
                if (amountDue.eq(0))
                    break;
            }

            return txs;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to withdraw.');
        }
    }
}

module.exports = TokenHolderRevenueFundContractsEnsemble;
