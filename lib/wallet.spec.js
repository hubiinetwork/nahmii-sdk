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
    getTransactionConfirmation: sinon.stub(),
    getApiAccessToken: sinon.stub(),
    getSupportedTokens: sinon.stub(),
    getNahmiiBalances: sinon.stub()
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
        stubbedProvider.getNahmiiBalances.reset();
        stubbedProvider.getSupportedTokens.reset();
        stubbedProvider.getTransactionConfirmation.reset();
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
        const fakeTxHash = 'some tx hash 1';

        it('can deposit eth to nahmii', async () => {
            sinon.stub(wallet, 'send')
                .withArgs(stubbedClientFundContract.address, ethers.utils.parseEther('1.23'), {gasLimit: 1})
                .resolves(fakeTxHash);
            let hash = await wallet.depositEth('1.23', {gasLimit: 1});
            expect(hash).to.equal(fakeTxHash);
        });

        testTokens.forEach(t => {
            it(`can initiate the deposit of ${t.symbol} tokens to nahmii`, async () => {
                stubbedErc20Contract.approve
                    .withArgs(stubbedClientFundContract.address, ethers.utils.parseUnits('2.71', t.decimals), {gasLimit: 1})
                    .resolves(fakeTxHash);
                const txHash = await wallet.initiateTokenDeposit('2.71', t.symbol, {gasLimit: 1});
                expect(txHash).to.eql(fakeTxHash);
            });
            it(`can complete the deposit of ${t.symbol} tokens to nahmii`, async () => {
                stubbedClientFundContract.depositTokens
                    .withArgs(ethers.utils.parseUnits('2.71', t.decimals), t.currency, '0', 'erc20', {gasLimit: 1})
                    .resolves(fakeTxHash);
                const txHash = await wallet.completeTokenDeposit('2.71', t.symbol, {gasLimit: 1});
                expect(txHash).to.eql(fakeTxHash);
            });
        });
    });

    context('a wallet with no non-nahmii balance', () => {
        beforeEach(() => {
            sinon.stub(wallet, 'send').rejects('insufficient funds');
            stubbedErc20Contract.approve.rejects('insufficient funds');
        });

        it('can not deposit eth to nahmii', (done) => {
            wallet.depositEth('1.23', {gasLimit: 1}).catch(err => {
                expect(err.name).to.eql('insufficient funds');
                done();
            });
        });

        it('can not initiate deposit tokens to nahmii', (done) => {
            wallet.initiateTokenDeposit('2.71', 'TT1', {gasLimit: 1}).catch(err => {
                expect(err.message).to.match(/failed.*approve/i);
                done();
            });
        });
    });
});
