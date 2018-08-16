'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');

const privateKey = '0x' + '0F'.repeat(32);
const walletAddress = '0x691A8D05678FC962ff0f2174134379c0051Cb686'; // Derived from privateKey! Not random!

const apiAccessToken = 'hubii-api-token';

const stubbedProvider = {
    chainId: 3,
    getTransactionReceipt: sinon.stub(),
    getApiAccessToken: sinon.stub(),
    getSupportedTokens: sinon.stub(),
    getStriimBalances: sinon.stub()
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
        stubbedProvider.getStriimBalances.reset();
        stubbedProvider.getSupportedTokens.reset();
        stubbedProvider.getTransactionReceipt.reset();
        stubbedProvider.getApiAccessToken.reset();
    });

    context('an empty wallet', () => {
        beforeEach(() => {
            stubbedProvider.getStriimBalances
                .withArgs(walletAddress)
                .resolves([]);
        });

        it('has no striim balance', async () => {
            let balance = await wallet.getStriimBalance();
            expect(balance).to.eql({});
        });
    });

    context('a wallet with striim balance', () => {
        beforeEach(() => {
            stubbedProvider.getStriimBalances
                .withArgs(walletAddress)
                .resolves([
                    {
                        wallet: walletAddress,
                        currency: '0x0000000000000000000000000000000000000000',
                        amount: '100200000000000000000'
                    },
                    {
                        wallet: walletAddress,
                        currency: testTokens[0].currency,
                        amount: '3140000000000000000'
                    }
                ]);
        });

        it('has a striim balance', async () => {
            let balance = await wallet.getStriimBalance();
            expect(balance).to.eql({
                'ETH': '100.2',
                'TT1': '3.14'
            });
        });
    });

    context('a wallet with a non-striim balance', () => {
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

        it('can deposit eth to striim', async () => {
            sinon.stub(wallet, 'send')
                .withArgs(stubbedClientFundContract.address, ethers.utils.parseEther('1.23'), {gasLimit: 1})
                .resolves(fakeTx1);
            let receipt = await wallet.depositEth('1.23', {gasLimit: 1});
            expect(receipt).to.equal(expectedTxReceipt1);
        });

        testTokens.forEach(t => {
            it(`can deposit ${t.symbol} tokens to striim`, async () => {
                stubbedErc20Contract.approve
                    .withArgs(stubbedClientFundContract.address, ethers.utils.parseUnits('2.71', t.decimals), {gasLimit: 1})
                    .resolves(fakeTx1);
                stubbedClientFundContract.depositTokens
                    .withArgs(t.currency, ethers.utils.parseUnits('2.71', t.decimals), {gasLimit: 1})
                    .resolves(fakeTx2);
                let receipts = await wallet.depositToken('2.71', t.symbol, {gasLimit: 1});
                expect(receipts[0]).to.eql(expectedTxReceipt1);
                expect(receipts[1]).to.eql(expectedTxReceipt2);
            });
        });
    });

    context('a wallet with no non-striim balance', () => {
        beforeEach(() => {
            sinon.stub(wallet, 'send').rejects('insufficient funds');
            stubbedErc20Contract.approve.rejects('insufficient funds');
            stubbedClientFundContract.depositTokens.rejects('insufficient funds');
        });

        it('can not deposit eth to striim', (done) => {
            wallet.depositEth('1.23', {gasLimit: 1}).catch(err => {
                expect(err.name).to.eql('insufficient funds');
                done();
            });
        });

        it('can not deposit tokens to striim', (done) => {
            wallet.depositToken('2.71', 'TT1', {gasLimit: 1}).catch(err => {
                expect(err.message).to.match(/failed.*approve/i);
                done();
            });
        });
    });
});
