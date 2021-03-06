'use strict';

require('./lib/ethers-config');
const NahmiiProvider = require('./lib/nahmii-provider');
const Wallet = require('./lib/wallet');
const Payment = require('./lib/payment');
const Receipt = require('./lib/receipt');
const MonetaryAmount = require('./lib/monetary-amount');
const Currency = require('./lib/currency');
const {SettlementFactory, PaymentSettlement, OnchainBalanceSettlement} = require('./lib/settlement');
const utils = require('./lib/utils');
const Erc20Contract = require('./lib/erc20/erc20-contract');
const NahmiiContract = require('./lib/contract');
const InsufficientFundsError = require('./lib/insufficient-funds-error');
const NahmiiEventProvider = require('./lib/event-provider');
const ClusterInformation = require('./lib/cluster-information');
const {FeesClaimant} = require('./lib/claim');

module.exports = {
    NahmiiProvider,
    NahmiiEventProvider,
    Wallet,
    Payment,
    Receipt,
    MonetaryAmount,
    SettlementFactory,
    Currency,
    PaymentSettlement,
    OnchainBalanceSettlement,
    Erc20Contract,
    NahmiiContract,
    InsufficientFundsError,
    ClusterInformation,
    FeesClaimant,
    utils
};
