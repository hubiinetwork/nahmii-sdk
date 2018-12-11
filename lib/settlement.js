'use strict';

/**
 * @module nahmii-sdk
 */

const ethers = require('ethers');
const {caseInsensitiveCompare} = require('./utils');
const DriipSettlement = require('./driip-settlement');
const NullSettlement = require('./null-settlement');
const Receipt = require('./receipt');
const MonetaryAmount = require('./monetary-amount');

const _provider = new WeakMap();
const _driipSettlement = new WeakMap();
const _nullSettlement = new WeakMap();

class Settlement {
    constructor(provider) {
        _provider.set(this, provider);
        _driipSettlement.set(this, new DriipSettlement(provider));
        _nullSettlement.set(this, new NullSettlement(provider));
    }

    async getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, latestReceipt, walletAddress) {
        const {amount, currency} = stageMonetaryAmount.toJSON();
        const stageAmount = ethers.utils.bigNumberify(amount);

        let latestDriipBalance;
        let driipSettlementStageAmount;
        let nullSettlementStageAmount;

        let requiredChallenges = [];
        let allowedChallenges = [];
        try {
            allowedChallenges = await this.checkStartChallenge(stageMonetaryAmount, latestReceipt, walletAddress);
            if (!allowedChallenges.length) 
                return requiredChallenges;
            
        } catch (error) {} //eslint-disable-line

        if (allowedChallenges.length === 1) {
            const allowedChallenge = allowedChallenges[0];
            if (allowedChallenge === 'null') {
                return [{
                    type: 'null',
                    stageMonetaryAmount
                }];
            }
            if (allowedChallenge === 'payment-driip') {
                return [{
                    type: 'payment-driip',
                    stageMonetaryAmount,
                    receipt: latestReceipt
                }];
            }
        }

        if (caseInsensitiveCompare(latestReceipt.sender.wallet, walletAddress)) 
            latestDriipBalance = ethers.utils.bigNumberify(latestReceipt.sender.balances.current);
        
        if (caseInsensitiveCompare(latestReceipt.recipient.wallet, walletAddress)) 
            latestDriipBalance = ethers.utils.bigNumberify(latestReceipt.recipient.balances.current);

        if (ethers.utils.bigNumberify(stageAmount).gt(latestDriipBalance)) {
            driipSettlementStageAmount = latestDriipBalance;
            nullSettlementStageAmount = stageAmount.sub(latestDriipBalance);
            requiredChallenges = [{
                type: 'payment-driip', 
                receipt: latestReceipt,
                stageMonetaryAmount: new MonetaryAmount(driipSettlementStageAmount, currency.ct, currency.id)
            }, {
                type: 'null',
                stageMonetaryAmount: new MonetaryAmount(nullSettlementStageAmount, currency.ct, currency.id)
            }];
        } else {
            requiredChallenges = [{
                type: 'payment-driip', 
                receipt: latestReceipt,
                stageMonetaryAmount
            }];
        }
        
        return requiredChallenges;
    }

    async checkStartChallenge(stageMonetaryAmount, latestReceipt, walletAddress) {
        const provider = _provider.get(this);
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);

        let allowedChallenges = [];
        try {
            await driipSettlement.checkStartChallengeFromPayment(Receipt.from(provider, latestReceipt), walletAddress);
            allowedChallenges.push('payment-driip');
        } catch (error) {} //eslint-disable-line
        try {
            await nullSettlement.checkStartChallenge(stageMonetaryAmount, walletAddress);
            allowedChallenges.push('null');
        } catch (error) {} //eslint-disable-line

        return allowedChallenges;
    }

    async getSettleableChallenges(address, ct, id) {
        const provider = _provider.get(this);
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);
        
        const setteableChallenges = [];
        try {
            const nonce = await driipSettlement.getCurrentProposalNonce(address, ct, id);
            const stageAmount = await driipSettlement.getCurrentProposalStageAmount(address, ct, id);
            const receipts = await provider.getWalletReceipts(address, null, 1000);
            const challengedReceipt = receipts.filter(r => r.nonce === nonce.toNumber())[0];
            await driipSettlement.checkSettleDriipAsPayment(Receipt.from(provider, challengedReceipt), address);

            setteableChallenges.push({
                type: 'payment-driip', 
                receipt: challengedReceipt, 
                intendedStageAmount: new MonetaryAmount(stageAmount, ct, id)
            });
        } catch (error) {} //eslint-disable-line

        try {
            const stageAmount = await nullSettlement.getCurrentProposalStageAmount(address, ct, id);
            await nullSettlement.checkSettleNull(address, ct, id);
            setteableChallenges.push({
                type: 'null',
                intendedStageAmount: new MonetaryAmount(stageAmount, ct, id)
            });
        } catch (error) {} //eslint-disable-line

        return setteableChallenges;
    }

    async getOngoingChallenges(address, ct, id) {
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);

        const driipExpirationTime = await driipSettlement.getCurrentProposalExpirationTime(address, ct, id);
        const nullExpirationTime = await nullSettlement.getCurrentProposalExpirationTime(address, ct, id);
        
        const ongoingChallenges = [];
        let currentTime = new Date().getTime();
        if (driipExpirationTime) {
            const expirationTime = driipExpirationTime.toNumber() * 1000;
            if (expirationTime > currentTime) {
                const intendedStageAmount = await driipSettlement.getCurrentProposalStageAmount(address, ct, id);
                const stageMonetaryAmount = new MonetaryAmount(intendedStageAmount, ct, id);
                ongoingChallenges.push({
                    type: 'payment-driip',
                    expirationTime,
                    intendedStageAmount: stageMonetaryAmount
                });
            }
        }
        if (nullExpirationTime) {
            const expirationTime = nullExpirationTime.toNumber() * 1000;
            if (expirationTime > currentTime) {
                const intendedStageAmount = await nullSettlement.getCurrentProposalStageAmount(address, ct, id);
                const stageMonetaryAmount = new MonetaryAmount(intendedStageAmount, ct, id);
                ongoingChallenges.push({
                    type: 'null',
                    expirationTime,
                    intendedStageAmount: stageMonetaryAmount
                });
            }
        }
        return ongoingChallenges;
    }

    async startChallenge(stageMonetaryAmount, wallet, options = {}) {
        const provider = _provider.get(this);
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);
        const {currency} = stageMonetaryAmount.toJSON();
        const receipts = await provider.getWalletReceipts(wallet.address, null, 1000);
        const latestReceipt = receipts.filter(r => r.currency.ct === currency.ct)[0];
        const requiredChallenges = await this.getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, latestReceipt, wallet.address);
        const txs = [];
        for (let requiredChallenge of requiredChallenges) {
            const {type, receipt, stageMonetaryAmount} = requiredChallenge;
            let tx;
            if (type === 'null') 
                tx = await nullSettlement.startChallenge(wallet, stageMonetaryAmount, options);
            
            if (type === 'payment-driip') 
                tx = await driipSettlement.startChallengeFromPayment(Receipt.from(wallet, receipt), stageMonetaryAmount, wallet, options);

            txs.push({tx, type, intendedStageAmount: stageMonetaryAmount});
        }

        return txs;
    }

    async settle(ct, id, wallet, options = {}) {
        const driipSettlement = _driipSettlement.get(this);
        const nullSettlement = _nullSettlement.get(this);

        const settleableChallenges = await this.getSettleableChallenges(wallet.address, ct, id);
        const txs = [];
        for (let settleableChallenge of settleableChallenges) {
            const {type, receipt, intendedStageAmount} = settleableChallenge;
            let tx;
            if (type === 'null') 
                tx = await nullSettlement.settleNull(wallet, ct, id, options);
            
            if (type === 'payment-driip') 
                tx = await driipSettlement.settleDriipAsPayment(Receipt.from(wallet, receipt), wallet, options);
            
            txs.push({tx, type, intendedStageAmount});
        }

        return txs;
    }
}

module.exports = Settlement;
