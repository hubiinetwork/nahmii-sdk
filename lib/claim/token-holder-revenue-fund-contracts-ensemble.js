'use strict';

const {utils: {bigNumberify}} = require('ethers');
const TokenHolderRevenueFundContract = require('./token-holder-revenue-fund-contract');
const NestedError = require('../nested-error');

const _configurations = new WeakMap();
const _firstAccrualOffset = new WeakMap();

const currencyToKey = (currency) => `${currency.ct.toString()}-${currency.id}`;

const minBigNumber = (n1, n2) => n1.lt(n2) ? n1 : n2;

/**
 * Span (temporally) in accruals and block numbers for the given currency. I.e. infer the
 * accrual and block number boundaries of the given currency for each contract
 * instance in the ensemble
 * @param {Currency} currency - The currency
 */
async function span(currency) {
    const configurations = _configurations.get(this);
    let accrualOffset = _firstAccrualOffset.get(this);
    let blockOffset = 0;
    const currencyKey = currencyToKey(currency);

    for (const configuration of configurations) {
        const closedAccrualsCount = (await configuration.contract.closedAccrualsCount(
            currency.ct.toString(), currency.id
        )).toNumber();

        if (0 === closedAccrualsCount)
            continue;

        const firstBlock = (await configuration.contract.closedAccrualsByCurrency(
            currency.ct.toString(), currency.id, 0
        )).startBlock.toNumber();

        const lastBlock = (await configuration.contract.closedAccrualsByCurrency(
            currency.ct.toString(), currency.id, closedAccrualsCount - 1
        )).endBlock.toNumber();

        const span = {
            closedAccrualsCount,
            firstAccrual: accrualOffset,
            lastAccrual: accrualOffset + closedAccrualsCount - 1,
            firstBlock: Math.max(blockOffset, firstBlock),
            lastBlock
        };

        if (!configuration.spansByCurrency)
            configuration.spansByCurrency = new Map();

        configuration.spansByCurrency.set(currencyKey, span);

        accrualOffset = span.lastAccrual + 1;
        blockOffset = span.lastBlock + 1;
    }
}

/**
 * Return status of whether contract instance span has been executed
 * for the given currency
 * @param {Currency} currency - The currency
 * @returns {boolean} True if span has been executed, else false
 */
function isSpanned(currency) {
    return _configurations.get(this).every(
        configuration => configuration.spansByCurrency && configuration.spansByCurrency.has(currencyToKey(currency))
    );
}

/**
 * @class TokenHolderRevenueFundContractsEnsemble
 * An ensemble of instances of TokenHolderRevenueFundContract
 * @alias module:nahmii-sdk
 */
class TokenHolderRevenueFundContractsEnsemble {
    /**
     * Construct a new ensemble of TokenHolderRevenueFund contracts
     * @param {Wallet|NahmiiProvider} walletOrProvider - A nahmii wallet or provider
     * @param {string[]} abstractionNames - The names of abstractions to be included in the example, defaults
     * to the ['TokenHolderRevenueFund'] which uses the latest contract instance only
     */
    constructor(walletOrProvider, abstractionNames = ['TokenHolderRevenueFund'], firstAccrualOffset = 0) {
        _configurations.set(this, abstractionNames.map(
            abstractionName => ({contract: new TokenHolderRevenueFundContract(walletOrProvider, abstractionName)})
        ));

        if (firstAccrualOffset < 0)
            throw new Error(`Unexpected value of firstAccrualOffset: ${firstAccrualOffset}`);
        _firstAccrualOffset.set(this, firstAccrualOffset);
    }

    /**
     * Returns the first accrual's offset index used in the (temporal) span
     * @returns {number} - First accrual's offset
     */
    get firstAccrualOffset() {
        return _firstAccrualOffset.get(this);
    }

    /**
     * Return status of whether the given accrual has been fully claimed
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @returns {boolean} True if fully claimed, else false
     */
    async fullyClaimed(wallet, currency, accrual) {
        if (!isSpanned.call(this, currency))
            await span.call(this, currency);

        const configurations = _configurations.get(this);
        const currencyKey = currencyToKey(currency);

        for (const configuration of configurations) {
            const span = configuration.spansByCurrency.get(currencyKey);
            if (span.firstAccrual <= accrual && accrual <= span.lastAccrual) {
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
        const configurations = _configurations.get(this);

        const count = (await Promise.all(configurations.map(c => c.contract.closedAccrualsCount(
            currency.ct.toString(), currency.id
        ))))
            .reduce((a, c) => a.add(c), bigNumberify(0));

        return count;
    }

    /**
     * Get claimable amount for the given span of accruals
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} firstAccrual - The lower accrual index boundary
     * @param {number} lastAccrual - The upper accrual index boundary
     * @returns {Promise} A promise that resolves into a BigNumber value representing the claimable amount.
     */
    async claimableAmountByAccruals(wallet, currency, firstAccrual, lastAccrual) {
        if (firstAccrual > lastAccrual)
            throw new Error(`Ordinality mismatch of firstAccrual > lastAccrual (${firstAccrual} > ${lastAccrual})`);

        if (!isSpanned.call(this, currency))
            await span.call(this, currency);

        const configurations = _configurations.get(this);
        const currencyKey = currencyToKey(currency);

        let claimableFees = bigNumberify(0);

        for (const configuration of configurations) {
            const span = configuration.spansByCurrency.get(currencyKey);

            if (lastAccrual < span.firstAccrual || firstAccrual > span.lastAccrual)
                continue;

            claimableFees = claimableFees.add(
                await configuration.contract.claimableAmountByAccruals(
                    wallet.address, currency.ct.toString(), currency.id,
                    Math.max(firstAccrual - span.firstAccrual, 0),
                    Math.min(lastAccrual - span.firstAccrual, span.closedAccrualsCount - 1)
                )
            );
        }

        return claimableFees;
    }

    /**
     * Claim and stage for the given span of accruals
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} firstAccrual - The lower accrual index boundary
     * @param {number} lastAccrual - The upper accrual index boundary
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an array of transaction hashes.
     */
    async claimAndStageByAccruals(wallet, currency, firstAccrual, lastAccrual, options) {
        if (firstAccrual > lastAccrual)
            throw new Error(`Ordinality mismatch of firstAccrual > lastAccrual (${firstAccrual} > ${lastAccrual})`);

        if (!isSpanned.call(this, currency))
            await span.call(this, currency);

        const configurations = _configurations.get(this);
        const currencyKey = currencyToKey(currency);

        try {
            const txs = [];

            for (const configuration of configurations) {
                const span = configuration.spansByCurrency.get(currencyKey);

                if (lastAccrual < span.firstAccrual || firstAccrual > span.lastAccrual)
                    continue;

                const contract = configuration.contract.connect(wallet);
                txs.push(
                    await contract.claimAndStageByAccruals(
                        currency.ct.toString(), currency.id,
                        Math.max(firstAccrual - span.firstAccrual, 0),
                        Math.min(lastAccrual - span.firstAccrual, span.closedAccrualsCount - 1),
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
     * @param {number} firstBlock - The lower block number boundary
     * @param {number} lastBlock - The upper block number boundary
     * @returns {Promise} A promise that resolves into a BigNumber value representing the claimable amount.
     */
    async claimableAmountByBlockNumbers(wallet, currency, firstBlock, lastBlock) {
        if (firstBlock > lastBlock)
            throw new Error(`Ordinality mismatch of firstBlock > lastBlock (${firstBlock} > ${lastBlock})`);

        if (!isSpanned.call(this, currency))
            await span.call(this, currency);

        const configurations = _configurations.get(this);
        const currencyKey = currencyToKey(currency);

        let claimableFees = bigNumberify(0);

        for (const configuration of configurations) {
            const span = configuration.spansByCurrency.get(currencyKey);

            if (lastBlock < span.firstBlock || firstBlock > span.lastBlock)
                continue;

            claimableFees = claimableFees.add(
                await configuration.contract.claimableAmountByBlockNumbers(
                    wallet.address, currency.ct.toString(), currency.id,
                    Math.max(firstBlock, span.firstBlock),
                    Math.min(lastBlock, span.lastBlock)
                )
            );
        }

        return claimableFees;
    }

    /**
     * Claim and stage for the given span of block numbers
     * @param {Wallet} wallet - The claimer nahmii wallet
     * @param {Currency} currency - The currency
     * @param {number} firstBlock - The lower block number boundary
     * @param {number} lastBlock - The upper block number boundary
     * @param [options] - An optional object containing the parameters for gasLimit and gasPrice
     * @returns {Promise} A promise that resolves into an array of transaction hashes.
     */
    async claimAndStageByBlockNumbers(wallet, currency, firstBlock, lastBlock, options) {
        if (firstBlock > lastBlock)
            throw new Error(`Ordinality mismatch of firstBlock > lastBlock (${firstBlock} > ${lastBlock})`);

        if (!isSpanned.call(this, currency))
            await span.call(this, currency);

        const configurations = _configurations.get(this);
        const currencyKey = currencyToKey(currency);

        try {
            const txs = [];

            for (const configuration of configurations) {
                const span = configuration.spansByCurrency.get(currencyKey);

                if (lastBlock < span.firstBlock || firstBlock > span.lastBlock)
                    continue;

                const contract = configuration.contract.connect(wallet);
                txs.push(
                    await contract.claimAndStageByBlockNumbers(
                        currency.ct.toString(), currency.id,
                        Math.max(firstBlock, span.firstBlock),
                        Math.min(lastBlock, span.lastBlock),
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
        const configurations = _configurations.get(this);

        return (await Promise.all(configurations.map(
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
        if (!isSpanned.call(this, monetaryAmount.currency))
            await span.call(this, monetaryAmount.currency);

        const stagedBalance = await this.stagedBalance(wallet, monetaryAmount.currency);
        if (stagedBalance.lt(monetaryAmount.amount))
            throw new Error(`Unable to withdraw more than ${stagedBalance.toString()}`);

        const configurations = _configurations.get(this);

        let amountDue = monetaryAmount.amount;

        try {
            const txs = [];

            for (const configuration of configurations) {
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
