'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');
const Receipt = require('./receipt');

const privateKey = '0x' + '0F'.repeat(32);
const walletAddress = '0x691A8D05678FC962ff0f2174134379c0051Cb686'; // Derived from privateKey! Not random!

const apiAccessToken = 'hubii-api-token';

const stubbedProvider = {
    chainId: 3,
    getTransactionReceipt: sinon.stub(),
    getApiAccessToken: sinon.stub(),
    getSupportedTokens: sinon.stub(),
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
    depositTokens: sinon.stub(),
    withdraw: sinon.stub(),
    unstage: sinon.stub(),
    address: 'client fund address'
};

const stubbedErc20Contract = {
    approve: sinon.stub()
};

const stubbedDriipSettlementChallengeContract = {
    startChallengeFromPayment: sinon.stub()
};

const stubbedExchangeContract = {
    settleDriipAsPayment: sinon.stub()
};

function proxyquireWallet() {
    return proxyquire('./wallet', {
        './client-fund-contract': function() {
            return stubbedClientFundContract;
        },
        './erc20-contract': function(address) {
            stubbedErc20Contract.address = address;
            return stubbedErc20Contract;
        },
        './driip-settlement-challenge-contract': function() {
            return stubbedDriipSettlementChallengeContract;
        },
        './exchange-contract': function() {
            return stubbedExchangeContract;
        }
    });
}


describe('Wallet', () => {
    let wallet;

    beforeEach(() => {
        stubbedProvider.getApiAccessToken.resolves(apiAccessToken);
        stubbedProvider.getSupportedTokens.resolves(testTokens);
        const Wallet = proxyquireWallet();
        wallet = new Wallet(privateKey, stubbedProvider);
    });

    afterEach(() => {
        stubbedErc20Contract.approve.reset();
        stubbedClientFundContract.depositTokens.reset();
        stubbedClientFundContract.withdraw.reset();
        stubbedClientFundContract.unstage.reset();
        stubbedDriipSettlementChallengeContract.startChallengeFromPayment.reset();
        stubbedExchangeContract.settleDriipAsPayment.reset();
        stubbedProvider.getNahmiiBalances.reset();
        stubbedProvider.getSupportedTokens.reset();
        stubbedProvider.getTransactionReceipt.reset();
        stubbedProvider.getApiAccessToken.reset();
    });

    context('an empty wallet', () => {
        beforeEach(() => {
            stubbedProvider.getNahmiiBalances
                .withArgs(walletAddress)
                .resolves([]);
        });

        it('has no nahmii balance', async () => {
            let balance = await wallet.getNahmiiBalance();
            expect(balance).to.eql({});
        });
    });

    context('a wallet with nahmii balance', () => {
        beforeEach(() => {
            stubbedProvider.getNahmiiBalances
                .withArgs(walletAddress)
                .resolves([
                    {
                        wallet: walletAddress,
                        currency: {
                            ct: '0x0000000000000000000000000000000000000000',
                            id: '0'
                        },
                        amount: '100200000000000000000'
                    },
                    {
                        wallet: walletAddress,
                        currency: {ct: testTokens[0].currency, id: '0'},
                        amount: '3140000000000000000'
                    }
                ]);
        });

        it('has a nahmii balance', async () => {
            let balance = await wallet.getNahmiiBalance();
            expect(balance).to.eql({
                'ETH': '100.2',
                'TT1': '3.14'
            });
        });
    });

    context('a wallet with a non-nahmii balance', () => {
        const fakeTx1 = {hash: 'magic tx hash 1'};
        const fakeTx2 = {hash: 'magic tx hash 2'};
        const expectedTxReceipt1 = {};
        const expectedTxReceipt2 = {};

        beforeEach(() => {
            stubbedProvider.getTransactionReceipt
                .withArgs(fakeTx1.hash)
                .resolves(expectedTxReceipt1);
            stubbedProvider.getTransactionReceipt
                .withArgs(fakeTx2.hash)
                .resolves(expectedTxReceipt2);
        });

        it('can deposit eth to nahmii', async () => {
            sinon.stub(wallet, 'send')
                .withArgs(stubbedClientFundContract.address, ethers.utils.parseEther('1.23'), {gasLimit: 1})
                .resolves(fakeTx1);
            let receipt = await wallet.depositEth('1.23', {gasLimit: 1});
            expect(receipt).to.equal(expectedTxReceipt1);
        });

        testTokens.forEach(t => {
            it(`can deposit ${t.symbol} tokens to nahmii`, async () => {
                stubbedErc20Contract.approve
                    .withArgs(stubbedClientFundContract.address, ethers.utils.parseUnits('2.71', t.decimals), {gasLimit: 1})
                    .resolves(fakeTx1);
                stubbedClientFundContract.depositTokens
                    .withArgs(ethers.utils.parseUnits('2.71', t.decimals), t.currency, '0', 'erc20', {gasLimit: 1})
                    .resolves(fakeTx2);
                let receipts = await wallet.depositToken('2.71', t.symbol, {gasLimit: 1});
                expect(receipts[0]).to.eql(expectedTxReceipt1);
                expect(receipts[1]).to.eql(expectedTxReceipt2);
            });
        });
    });

    context('a wallet with no non-nahmii balance', () => {
        beforeEach(() => {
            sinon.stub(wallet, 'send').rejects('insufficient funds');
            stubbedErc20Contract.approve.rejects('insufficient funds');
            stubbedClientFundContract.depositTokens.rejects('insufficient funds');
        });

        it('can not deposit eth to nahmii', (done) => {
            wallet.depositEth('1.23', {gasLimit: 1}).catch(err => {
                expect(err.name).to.eql('insufficient funds');
                done();
            });
        });

        it('can not deposit tokens to nahmii', (done) => {
            wallet.depositToken('2.71', 'TT1', {gasLimit: 1}).catch(err => {
                expect(err.message).to.match(/failed.*approve/i);
                done();
            });
        });
    });

    context('settle payment', () => {
        const fakeTx = {hash: 'magic tx hash 1'};

        it('can start payment challenge period for eth', async () => {
            const receipt = Receipt.from({}, {
                amount: '100',
                currency: {ct: '0x0000000000000000000000000000000000000000', id: 0},
                sender: {wallet: ''},
                recipient: {wallet: ''}
            });
            const amount = '1.23';
            stubbedDriipSettlementChallengeContract.startChallengeFromPayment
                .withArgs(receipt.toJSON(), wallet.address, ethers.utils.parseUnits(amount, 18), {})
                .resolves(fakeTx);
            let tx = await wallet.startChallengeFromPayment(receipt, amount);
            expect(tx).to.equal(fakeTx);
        });

        testTokens.forEach(t => {
            it(`can start payment challenge period for token ${t.symbol}`, async () => {
                const receipt = Receipt.from({}, {
                    amount: '100',
                    currency: {ct: testTokens[1].currency, id: 0},
                    sender: {wallet: ''},
                    recipient: {wallet: ''}
                });
                const amount = '1.23';
                stubbedDriipSettlementChallengeContract.startChallengeFromPayment
                    .withArgs(receipt.toJSON(), wallet.address, ethers.utils.parseUnits(amount, testTokens[1].decimals), {})
                    .resolves(fakeTx);
                let tx = await wallet.startChallengeFromPayment(receipt, amount);
                expect(tx).to.equal(fakeTx);
            });
        });

        it('can settle payment driip', async () => {
            const receipt = Receipt.from({}, {
                amount: '100',
                currency: {ct: '0x0000000000000000000000000000000000000000', id: 0},
                sender: {wallet: ''},
                recipient: {wallet: ''}
            });
            stubbedExchangeContract.settleDriipAsPayment
                .withArgs(receipt.toJSON(), wallet.address, {})
                .resolves(fakeTx);
            let tx = await wallet.settleDriipAsPayment(receipt, {});
            expect(tx).to.equal(fakeTx);
        });
    });
    context('withdraw back into base layer', () => {
        const fakeTx = {hash: 'magic tx hash 1'};
        
        it('can withdraw eth', async () => {
            const amount = '1.23';
            stubbedClientFundContract.withdraw
                .withArgs(ethers.utils.parseUnits(amount, 18), '0x0000000000000000000000000000000000000000', 0, '', {})
                .resolves(fakeTx);
            let tx = await wallet.withdrawEth(amount, {});
            expect(tx).to.equal(fakeTx);
        });

        testTokens.forEach(t => {
            it(`can withdraw ${t.symbol} tokens`, async () => {
                const amount = '1.23';
                stubbedClientFundContract.withdraw
                    .withArgs(ethers.utils.parseUnits(amount, t.decimals), t.currency, 0, '', {})
                    .resolves(fakeTx);
                let tx = await wallet.withdrawToken(amount, t.symbol, {});
                expect(tx).to.equal(fakeTx);
            });
        });
    });

    context('withdraw back into base layer', () => {
        const fakeTx = {hash: 'magic tx hash 1'};

        it('can unstage eth', async () => {
            const amount = '1.23';
            stubbedClientFundContract.unstage
                .withArgs(ethers.utils.parseUnits(amount, 18), '0x0000000000000000000000000000000000000000', 0, {})
                .resolves(fakeTx);
            let tx = await wallet.unstageEth(amount, {});
            expect(tx).to.equal(fakeTx);
        });

        testTokens.forEach(t => {
            it(`can unstage ${t.symbol} tokens`, async () => {
                const amount = '1.23';
                stubbedClientFundContract.unstage
                    .withArgs(ethers.utils.parseUnits(amount, t.decimals), t.currency, 0, {})
                    .resolves(fakeTx);
                let tx = await wallet.unstageToken(amount, t.symbol, {});
                expect(tx).to.equal(fakeTx);
            });
        });
    });
});
