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
const walletAddress = '0x691A8D05678FC962ff0f2174134379c0051Cb686'; // Derived from privateKey! Not random!

const apiAccessToken = 'hubii-api-token';

const stubbedProvider = {
    network: {chainId: 3},
    getTransactionReceipt: sinon.stub(),
    getTransactionConfirmation: sinon.stub(),
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


[
    ['private key signing', privateKey],
    ['custom signing', {
        address: '0x691A8D05678FC962ff0f2174134379c0051Cb686',
        signMessage: sinon.stub(),
        signTransaction: sinon.stub()
    }]
].forEach(([description, signer]) => {
    describe(`Wallet with ${description}`, () => {
        let wallet;

        beforeEach(() => {
            stubbedProvider.getApiAccessToken.resolves(apiAccessToken);
            stubbedProvider.getSupportedTokens.resolves(testTokens);
            const Wallet = proxyquireWallet();
            wallet = new Wallet(signer, stubbedProvider);
        });

        afterEach(() => {
            stubbedErc20Contract.approve.reset();
            stubbedClientFundContract.depositTokens.reset();
            stubbedProvider.getNahmiiBalances.reset();
            stubbedProvider.getSupportedTokens.reset();
            stubbedProvider.getTransactionReceipt.reset();
            stubbedProvider.getApiAccessToken.reset();
            stubbedClientFundContract.withdraw.reset();
            stubbedClientFundContract.unstage.reset();
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

            it('can withdraw eth or tokens', async () => {
                const fakeTx = {hash: 'magic tx hash 1'};
                const amount = '1.23';
                const currency = '0x0000000000000000000000000000000000000000';
                const amountBN = ethers.utils.parseUnits(amount, 18);
                stubbedClientFundContract.withdraw
                    .withArgs(amountBN.toString(), currency, '0', '', {})
                    .resolves(fakeTx);
                const monetaryAmount = new MonetaryAmount(amountBN, currency, 0);
                let tx = await wallet.withdraw(monetaryAmount);
                expect(tx).to.equal(fakeTx);
            });
        });

        context('a wallet with a non-nahmii balance', () => {
            const fakeTxHash = 'some tx hash 1';
            const rawTx = {
                to: stubbedClientFundContract.address,
                value: ethers.utils.parseEther('1.23'),
                gasLimit: 1
            };

            it('can deposit eth to nahmii', async () => {
                sinon.stub(wallet, 'sendTransaction')
                    .withArgs(rawTx)
                    .resolves({hash: fakeTxHash});
                let {hash} = await wallet.depositEth('1.23', {gasLimit: 1});
                expect(hash).to.equal(fakeTxHash);
            });

            testTokens.forEach(t => {
                it(`can initiate the deposit of ${t.symbol} tokens to nahmii`, async () => {
                    stubbedErc20Contract.approve
                        .withArgs(stubbedClientFundContract.address, ethers.utils.parseUnits('2.71', t.decimals), {gasLimit: 1})
                        .resolves({hash: fakeTxHash});
                    const {hash} = await wallet.approveTokenDeposit('2.71', t.symbol, {gasLimit: 1});
                    expect(hash).to.eql(fakeTxHash);
                });

                it(`can complete the deposit of ${t.symbol} tokens to nahmii`, async () => {
                    stubbedClientFundContract.depositTokens
                        .withArgs(ethers.utils.parseUnits('2.71', t.decimals), t.currency, 0, 'ERC20', {gasLimit: 1})
                        .resolves({hash: fakeTxHash});
                    const {hash} = await wallet.completeTokenDeposit('2.71', t.symbol, {gasLimit: 1});
                    expect(hash).to.eql(fakeTxHash);
                });

                it(`rejects when deposit of ${t.symbol} can not be completed`, (done) => {
                    stubbedClientFundContract.depositTokens
                        .rejects('some error');
                    wallet.completeTokenDeposit('2.71', t.symbol, {gasLimit: 1})
                        .catch(e => {
                            expect(e).to.match(/failed.*deposit.*some.*error/i);
                            done();
                        });
                });
            });
        });

        context('a wallet with no non-nahmii balance', () => {
            beforeEach(() => {
                sinon.stub(wallet, 'sendTransaction').rejects('insufficient funds');
                stubbedErc20Contract.approve.rejects('insufficient funds');
                stubbedClientFundContract.depositTokens.rejects('insufficient funds');
            });

            it('can not deposit eth to nahmii', (done) => {
                wallet.depositEth('1.23', {gasLimit: 1}).catch(err => {
                    expect(err.name).to.eql('insufficient funds');
                    done();
                });
            });

            it('can not initiate deposit tokens to nahmii', (done) => {
                wallet.approveTokenDeposit('2.71', 'TT1', {gasLimit: 1}).catch(err => {
                    expect(err.message).to.match(/failed.*approve/i);
                    done();
                });
            });
        });

        context('a wallet with a staged balance', () => {
            it('can unstage eth or tokens', async () => {
                const fakeTx = {hash: 'magic tx hash 1'};
                const amount = '1.23';
                const currency = '0x0000000000000000000000000000000000000000';
                const amountBN = ethers.utils.parseUnits(amount, 18);
                stubbedClientFundContract.unstage
                    .withArgs(amountBN.toString(), currency, '0', {})
                    .resolves(fakeTx);
                const monetaryAmount = new MonetaryAmount(amountBN, currency, 0);
                let tx = await wallet.unstage(monetaryAmount);
                expect(tx).to.equal(fakeTx);
            });
        });
    });
});
