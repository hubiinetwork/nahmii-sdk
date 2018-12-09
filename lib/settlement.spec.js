'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');
const MonetaryAmount = require('./monetary-amount');

const privateKey = '0x' + '0F'.repeat(32);
const apiAccessToken = 'token';

const stubbedProvider = {
    network: { chainId: 3 },
    getTransactionReceipt: sinon.stub(),
    getTransactionConfirmation: sinon.stub(),
    getApiAccessToken: sinon.stub(),
    getSupportedTokens: sinon.stub(),
    getTokenInfo: sinon.stub(),
    getNahmiiBalances: sinon.stub(),
    resolveName: sinon.stub()
};

const testTokens = [
    {
        currency: '0x0000000000000000000000000000000000000001',
        symbol: 'TT1',
        decimals: 18
    },
    {
        currency: '0x0000000000000000000000000000000000000002',
        symbol: 'TT2',
        decimals: 5
    }
];

const stubbedClientFundContract = {
    receiveTokens: sinon.stub(),
    withdraw: sinon.stub(),
    unstage: sinon.stub(),
    address: 'client fund address'
};

const stubbedErc20Contract = {
    approve: sinon.stub()
};

function proxyquireWallet() {
    return proxyquire('./wallet', {
        './client-fund-contract': function() {
            return stubbedClientFundContract;
        },
        './erc20-contract': function(address) {
            stubbedErc20Contract.address = address;
            return stubbedErc20Contract;
        }
    });
}

function proxyquireSettlement() {
    return proxyquire('./settlement', {
        './driip-settlement': function() {
            return stubbedClientFundContract;
        },
        './null-settlement': function(address) {
            stubbedErc20Contract.address = address;
            return stubbedErc20Contract;
        }
    });
}


describe.only('Settlement', () => {
    let wallet;
    let settlement;

    beforeEach(() => {
        stubbedProvider.getApiAccessToken.resolves(apiAccessToken);
        stubbedProvider.getSupportedTokens.resolves(testTokens);
        const Wallet = proxyquireWallet();
        const Settlement = proxyquireSettlement();
        wallet = new Wallet(privateKey, stubbedProvider);
        settlement = new Settlement(stubbedProvider);
        console.log(wallet);
    });

    afterEach(() => {
        stubbedErc20Contract.approve.reset();
        stubbedClientFundContract.receiveTokens.reset();
        stubbedClientFundContract.withdraw.reset();
        stubbedClientFundContract.unstage.reset();
        stubbedProvider.getNahmiiBalances.reset();
        stubbedProvider.getSupportedTokens.reset();
        stubbedProvider.getTransactionConfirmation.reset();
        stubbedProvider.getApiAccessToken.reset();
    });

    describe('#getRequiredChallengesForIntendedStageAmount', () => {
        beforeEach(() => {

        });
        it('should return driip settlement as an required challenge', async () => {
            const stageAmount = ethers.utils.bigNumberify('100');
            const currency = {
                ct: '0x0000000000000000000000000000000000000000',
                id: 0
            };
            const stageMonetaryAmount = new MonetaryAmount(stageAmount, currency.ct, currency.id);
            const receipt = {
                sender: {
                    wallet: '0x1',
                    balances: {
                        current: '200'
                    }
                },
                recipient: {
                    wallet: '0x2'
                }
            };

            const requiredChallenges = await settlement.getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, receipt, '0x1');
            expect(requiredChallenges.length).to.equal(1);
            expect(requiredChallenges[0].type).to.equal('payment-driip');
            expect(requiredChallenges[0].receipt).to.equal(receipt);
            expect(requiredChallenges[0].stageMonetaryAmount.toJSON()).to.deep.equal(stageMonetaryAmount.toJSON());
        });
    });
    describe('#checkStartChallengeFromPayment', () => {
        it('', () => {
            
        });
    });
    describe('#getSettleableChallenges', () => {
        it('', () => {
            
        });
    });
    describe('#getMaxCurrentExpirationTime', () => {
        it('', () => {
            
        });
    });
    describe('#startChallenge', () => {
        it('', () => {
            
        });
    });
    describe('#settle', () => {
        it('', () => {
            
        });
    });
});
