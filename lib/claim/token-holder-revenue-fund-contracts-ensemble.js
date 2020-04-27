'use strict';

const {utils: {bigNumberify}} = require('ethers');
const TokenHolderRevenueFundContract = require('./token-holder-revenue-fund-contract');
const NestedError = require('../nested-error');

const _ensemble = new WeakMap();
const _brokenDown = new WeakMap();

const currencyKey = (currency) => `${currency.ct.toString()}-${currency.id}`;

const minBigNumber = function (n1, n2) {
    return n1.lt(n2) ? n1 : n2;
};

/**
 * @class TokenHolderRevenueFundContractsEnsemble
 * An ensemble of instances of TokenHolderRevenueFundContract
 * @alias module:nahmii-sdk
 */
class TokenHolderRevenueFundContractsEnsemble {
    constructor(walletOrProvider, ensembleNames = ['TokenHolderRevenueFund']) {
        _ensemble.set(this, ensembleNames.map(n => ({contract: new TokenHolderRevenueFundContract(walletOrProvider, n)})));
        _brokenDown.set(this, new Map());
    }

    /**
     * Execute contract instance break-down for the given currency
     * @param {Currency} currency - The currency
     */
    async breakDown(currency) {
        const brokenDown = _brokenDown.get(this);

        const currencyKey = currencyKey(currency);

        if (brokenDown.get(currencyKey))
            return;

        const ensemble = _ensemble.get(this);

        let globalAccrualOffset = 0;
        for (const configuration of ensemble) {
            const closedAccrualsCount = (await configuration.contract.closedAccrualsCount(
                currency.ct.toString(), currency.id
            )).toNumber();

            if (!configuration.breakDowns)
                configuration.breakDowns = new Map();

            const currencyBreakDown = {};
            currencyBreakDown.startAccrual = globalAccrualOffset || 0;
            currencyBreakDown.endAccrual = currencyBreakDown.startAccrual + closedAccrualsCount;
            currencyBreakDown.startBlock =
                (await configuration.contract.closedAccrualsByCurrency(
                    currency.ct.toString(), currency.id, configuration.startAccrual
                )).startBlock.toNumber();
            currencyBreakDown.endBlock =
                (await configuration.contract.closedAccrualsByCurrency(
                    currency.ct.toString(), currency.id, configuration.endAccrual
                )).endBlock.toNumber();

            configuration.breakDowns.set(currencyKey, currencyBreakDown);

            globalAccrualOffset = currencyBreakDown.endAccrual + 1;
        }

        brokenDown.set(currencyKey, true);
    }

    /**
     * Return status of whether contract instance break-down has been executed for the given currency
     * @param {Currency} currency - The currency
     * @returns {boolean} True if break-down has been executed, else false
     */
    isBrokenDown(currency) {
        const brokenDown = _brokenDown.get(this);
        return brokenDown.get(currencyKey(currency));
    }

    /**
     * Return status of whether the given accrual has been fully claimed
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @returns {boolean} True if fully claimed, else false
     */
    async fullyClaimed(wallet, currency, accrual) {
        if (!this.isBrokenDown(currency))
            await this.breakDown(currency);

        const ensemble = _ensemble.get(this);

        for (const configuration of ensemble) {
            if (configuration.startAccrual <= accrual && accrual <= configuration.endAccrual) {
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

        return count.toNumber();
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

        if (!this.isBrokenDown(currency))
            await this.breakDown(currency);

        const ensemble = _ensemble.get(this);

        let claimableFees = bigNumberify(0);

        for (const configuration of ensemble) {
            if (endAccrual < configuration.startAccrual || startAccrual > configuration.endAccrual)
                continue;

            claimableFees = claimableFees.add(
                await configuration.contract.claimableAmountByAccruals(
                    wallet.address, currency.ct.toString(), currency.id,
                    Math.max(startAccrual, configuration.startAccrual),
                    Math.min(endAccrual, configuration.endAccrual)
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

        if (!this.isBrokenDown(currency))
            await this.breakDown(currency);

        const ensemble = _ensemble.get(this);

        try {
            const txs = [];

            for (const configuration of ensemble) {
                if (endAccrual < configuration.startAccrual || startAccrual > configuration.endAccrual)
                    continue;

                const contract = configuration.contract.connect(wallet);
                txs.push(
                    contract.claimAndStageByAccruals(
                        currency.ct.toString(), currency.id,
                        Math.max(startAccrual, configuration.startAccrual),
                        Math.min(endAccrual, configuration.endAccrual),
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

        if (!this.isBrokenDown(currency))
            await this.breakDown(currency);

        const ensemble = _ensemble.get(this);

        let claimableFees = bigNumberify(0);

        for (const configuration of ensemble) {
            if (endBlock < configuration.startBlock || startBlock > configuration.endBlock)
                continue;

            claimableFees = claimableFees.add(
                await configuration.contract.claimableAmountByBlockNumbers(
                    wallet.address, currency.ct.toString(), currency.id,
                    Math.max(startBlock, configuration.startBlock),
                    Math.min(endBlock, configuration.endBlock)
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

        if (!this.isBrokenDown(currency))
            await this.breakDown(currency);

        const ensemble = _ensemble.get(this);

        try {
            const txs = [];

            for (const configuration of ensemble) {
                if (endBlock < configuration.startBlock || startBlock > configuration.endBlock)
                    continue;

                const contract = configuration.contract.connect(wallet);
                txs.push(
                    contract.claimAndStageByBlockNumbers(
                        currency.ct.toString(), currency.id,
                        Math.max(startBlock, configuration.startBlock),
                        Math.min(endBlock, configuration.endBlock),
                        options
                    )
                );
            }

            return txs;
        }
        catch (error) {
            throw new NestedError(error, 'Unable to claim and stage by blocks.');
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
        if (!this.isBrokenDown(monetaryAmount.currency))
            await this.breakDown(monetaryAmount.currency);

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
