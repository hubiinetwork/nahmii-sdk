'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
const {caseInsensitiveCompare} = require('./utils');
const DriipSettlement = require('./driip-settlement');
const NullSettlement = require('./null-settlement');
const Receipt = require('./receipt');

const _provider = new WeakMap();
const _driipSettlement = new WeakMap();
const _nullSettlement = new WeakMap();

class Settlement {
    constructor(provider) {
        _provider.set(this, provider);
        _driipSettlement.set(this, new DriipSettlement(provider));
        _nullSettlement.set(this, new NullSettlement(provider));
    }

    async startChallenge(stageAmount, wallet, options = {}) {
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);
        const provider = _provider.get(this);
        
        const {amount, currency} = stageAmount.toJSON();
        const tokenInfo = provider.getTokenInfo(currency.ct, true);

        const receipts = await provider.getWalletReceipts(wallet.address, null, 1000);
        let latestReceipt = receipts.filter(r => r.currency.ct === currency.ct)[0];

        let startedChallengedFromPayment = false;
        if (latestReceipt) {
            const settled = await driipSettlement.hasPaymentDriipSettled(latestReceipt.nonce, wallet.address);
            //use canStartChallengeFromPayment to check instead, and try catch for this part
            if (!settled) {
                const receiptObj = Receipt.from(provider, latestReceipt);
                let latestDriipBalance;
                if (caseInsensitiveCompare(latestReceipt.sender.wallet, wallet.address)) 
                    latestDriipBalance = ethers.utils.bigNumberify(latestReceipt.sender.balances.current);
                
                if (caseInsensitiveCompare(latestReceipt.recipient.wallet, wallet.address)) 
                    latestDriipBalance = ethers.utils.bigNumberify(latestReceipt.recipient.balances.current);
                

                if (ethers.utils.bigNumberify(amount).gt(latestDriipBalance)) 
                    throw new Error(`The max intended stage balance is ${ethers.utils.formatUnits(latestDriipBalance, tokenInfo.decimals)} ${tokenInfo.symbol}`);
                

                const tx = await driipSettlement.startChallengeFromPayment(receiptObj, stageAmount, wallet, options);
                startedChallengedFromPayment = true;
                return {tx, type: 'payment-driip'};
            }
        }

        if (!startedChallengedFromPayment) {
            const tx = await nullSettlement.startChallenge(wallet, stageAmount, options);
            return {tx, type: 'null'};
        }
    }

    async settle(ct, id, wallet, options = {}) {
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);
        const provider = _provider.get(this);

        const receipts = await provider.getWalletReceipts(wallet.address, null, 1000);
        let latestReceipt = receipts.filter(r => r.currency.ct === ct)[0];

        let settledPaymentDriip = false;
        if (latestReceipt) {
            const settled = await driipSettlement.hasPaymentDriipSettled(latestReceipt.nonce, wallet.address);
            if (!settled) {
                const receiptObj = Receipt.from(provider, latestReceipt);
                const tx = await driipSettlement.settleDriipAsPayment(receiptObj, wallet);
                settledPaymentDriip = true;
                return {tx, type: 'payment-driip'};
            }
        }

        if (!settledPaymentDriip) {
            const tx = await nullSettlement.settleNull(wallet, ct, id, options);
            return {tx, type: 'null'};
        }
    }
}

module.exports = Settlement;
