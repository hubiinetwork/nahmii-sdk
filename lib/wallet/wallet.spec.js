'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');
const MonetaryAmount = require('../monetary-amount');

const privateKey = '0x' + '0F'.repeat(32);
const walletAddress = '0x691A8D05678FC962ff0f2174134379c0051Cb686'; // Derived from privateKey! Not random!

const apiAccessToken = 'hubii-api-token';

const stubbedProvider = {
    _ethersType: 'Provider',
    network: {chainId: 3},
    getTransactionReceipt: sinon.stub(),
    getTransactionConfirmation: sinon.stub(),
    getApiAccessToken: sinon.stub(),
    getSupportedTokens: sinon.stub(),
    getNahmiiBalances: sinon.stub(),
    getBalance: sinon.stub(),
    getTransactionCount: sinon.stub(),
    sendTransaction: sinon.stub(),
    getGasPrice: sinon.stub(),
    getNetwork: sinon.stub(),
    resolveName: sinon.stub(),
    getTokenInfo: sinon.stub(),
    getWalletReceipts: sinon.stub()
};
stubbedProvider.reset = function() {
    this.getTransactionReceipt.reset();
    this.getTransactionConfirmation.reset();
    this.getApiAccessToken.reset();
    this.getSupportedTokens.reset();
    this.getNahmiiBalances.reset();
    this.getBalance.reset();
    this.getTransactionCount.reset();
    this.sendTransaction.reset();
    this.getGasPrice.reset();
    this.getNetwork.reset();
    this.resolveName.reset();
    this.getTokenInfo.reset();
    this.getWalletReceipts.reset();
}.bind(stubbedProvider);

const testTokens = [
    {
        currency: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        color: ''
    },
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
stubbedClientFundContract.reset = function() {
    this.receiveTokens.reset();
    this.withdraw.reset();
    this.unstage.reset();
}.bind(stubbedClientFundContract);

const erc20contractClass = function() {
};
erc20contractClass.from = sinon.stub();

const stubbedErc20Contracts = [
    {
        approve: sinon.stub(),
        tokenDecimals: testTokens[0].decimals,
        address: testTokens[0].currency,
        parse: str => ethers.utils.parseUnits(str, testTokens[0].decimals)
    },
    {
        approve: sinon.stub(),
        tokenDecimals: testTokens[1].decimals,
        address: testTokens[1].currency,
        parse: str => ethers.utils.parseUnits(str, testTokens[1].decimals)
    },
    {
        approve: sinon.stub(),
        tokenDecimals: testTokens[2].decimals,
        address: testTokens[2].currency,
        parse: str => ethers.utils.parseUnits(str, testTokens[2].decimals)
    }
];
stubbedErc20Contracts.reset = function() {
    this.forEach(s => s.approve.reset());
}.bind(stubbedErc20Contracts);

const stubbedBalanceTrackerContract = {
    stagedBalanceType: sinon.stub(),
    get: sinon.stub()
};
stubbedBalanceTrackerContract.reset = function() {
    this.stagedBalanceType.reset();
    this.get.reset();
}.bind(stubbedBalanceTrackerContract);

function proxyquireWallet() {
    return proxyquire('./wallet', {
        './client-fund-contract': function() {
            return stubbedClientFundContract;
        },
        '../erc20/erc20-contract': erc20contractClass,
        './balance-tracker-contract': function() {
            return stubbedBalanceTrackerContract;
        }
    });
}

describe('Wallet', () => {
    beforeEach(() => {
        stubbedProvider.getApiAccessToken.resolves(apiAccessToken);
        stubbedProvider.getSupportedTokens.resolves(testTokens);
        stubbedProvider.getTokenInfo.withArgs('ETH').returns(testTokens[0]);
        stubbedProvider.getTokenInfo.withArgs('TT1').returns(testTokens[1]);
        stubbedProvider.getTokenInfo.withArgs('TT2').returns(testTokens[2]);
        erc20contractClass.from.withArgs('ETH').returns(stubbedErc20Contracts[0]);
        erc20contractClass.from.withArgs('TT1').returns(stubbedErc20Contracts[1]);
        erc20contractClass.from.withArgs('TT2').returns(stubbedErc20Contracts[2]);
    });

    afterEach(() => {
        stubbedErc20Contracts.reset();
        stubbedProvider.reset();
        stubbedClientFundContract.reset();
        stubbedBalanceTrackerContract.reset();
    });

    [
        ['private key signing', privateKey],
        ['custom signing', {
            address: walletAddress,
            signMessage: async (rawMessage) => {
                let message = rawMessage;
                if (typeof message === 'string')
                    message = ethers.utils.toUtf8Bytes(message);
                const wallet = new ethers.Wallet(privateKey);
                const signature = wallet.signingKey.signDigest(ethers.utils.hashMessage(message));
                return ethers.utils.joinSignature(signature);
            },
            signTransaction: async (unresolvedTx) => {
                const tx = await ethers.utils.resolveProperties(unresolvedTx);
                const serializedTx = ethers.utils.serializeTransaction(tx);
                const wallet = new ethers.Wallet(privateKey);
                const signature = wallet.signingKey.signDigest(ethers.utils.keccak256(serializedTx));
                return ethers.utils.serializeTransaction(tx, signature);
            }
        }]
    ].forEach(([description, signer]) => {
        describe(`using ${description}`, () => {
            let wallet;

            beforeEach(() => {
                const Wallet = proxyquireWallet();
                wallet = new Wallet(signer, stubbedProvider);
            });

            context('an initialized wallet', () => {
                it('can sign transactions using it\'s \'sign\' method', async () => {
                    const rawTx = {
                        to: walletAddress,
                        value: ethers.utils.parseEther('1.23'),
                        gasLimit: 1
                    };
                    const signedHex = '0xf86580800194691a8d05678fc962ff0f2174134379c0051cb686881111d67bb1bb0000801ca063b9e191cad9ad10903061f2f631b8115e5e7241e48091d28dc8d8683a28e70fa079321a11cf7cbcb3b34650f335c5c82453ca9ca0ca3711623efabebc125b8292';
                    const sig = await wallet.sign(rawTx);
                    expect(sig).to.equal(signedHex);
                });

                it('can sign messages using it\'s \'signMessage\' method', async () => {
                    const message = 'Hello World!';
                    const signedHex = '0xaeca66ebca1a5da255e4c60003ce9709911c4a5bfb9fd62d0f0f6aa9bfc216b217034f7c277f32b1efec116765851b65960be921e8b8711b7529eda338cc08d81b';
                    const sig = await wallet.signMessage(message);
                    expect(sig).to.equal(signedHex);
                });
            });

            context('a wallet with no receipts', () => {
                beforeEach(() => {
                    stubbedProvider.getWalletReceipts
                        .withArgs(walletAddress)
                        .resolves([]);
                });

                it('has no receipts', async () => {
                    let receipts = await wallet.getReceipts();
                    expect(receipts).to.eql([]);
                });
            });

            context('a wallet with receipts', () => {
                let walletReceipts;
                beforeEach(() => {
                    walletReceipts = [
                        {
                            'nonce': 100,
                            'currency': {
                                'ct': '0x0000000000000000000000000000000000000001',
                                'id': '1'
                            },
                            'amount': '1000000000000000000'
                        },
                        {
                            'nonce': 101,
                            'currency': {
                                'ct': '0x0000000000000000000000000000000000000001',
                                'id': '1'
                            },
                            'amount': '1000000000000000000'
                        },
                        {
                            'nonce': 102,
                            'currency': {
                                'ct': '0x0000000000000000000000000000000000000001',
                                'id': '1'
                            },
                            'amount': '1000000000000000000'
                        }
                    ];
                    stubbedProvider.getWalletReceipts
                        .withArgs(walletAddress)
                        .resolves(walletReceipts);
                    stubbedProvider.getWalletReceipts
                        .withArgs(walletAddress, 101)
                        .resolves(walletReceipts.filter(r => r.nonce >= 101));
                    stubbedProvider.getWalletReceipts
                        .withArgs(walletAddress, null, 1)
                        .resolves([walletReceipts[0]]);
                    stubbedProvider.getWalletReceipts
                        .withArgs(walletAddress, 101, 1000, false)
                        .resolves(walletReceipts.filter(r => r.nonce >= 101).reverse());
                });

                it('can fetch it\'s receipts', async () => {
                    let receipts = await wallet.getReceipts();
                    expect(receipts).to.eql(walletReceipts);
                });

                it('can fetch it\'s receipts starting from a specified nonce', async () => {
                    let receipts = await wallet.getReceipts(101);
                    expect(receipts).to.eql(walletReceipts.filter(r => r.nonce >= 101));
                });

                it('can limit the amount of receipts returned', async () => {
                    let receipts = await wallet.getReceipts(null, 1);
                    expect(receipts).to.eql([walletReceipts[0]]);
                });

                it('can fetch receipts in reverse order', async () => {
                    let receipts = await wallet.getReceipts(101, 1000, false);
                    expect(receipts).to.eql(walletReceipts.filter(r => r.nonce >= 101).reverse());
                });
            });

            context('a wallet with no base layer transactions', () => {
                let txCount;

                beforeEach(() => {
                    txCount = 0;
                    stubbedProvider.getTransactionCount
                        .withArgs(walletAddress)
                        .resolves(txCount);
                });

                it('has no base layer transactions', async () => {
                    let balance = await wallet.getTransactionCount();
                    expect(balance).to.eql(txCount);
                });
            });

            context('a wallet with base layer transactions', () => {
                let txCount;
                beforeEach(() => {
                    txCount = 5;
                    stubbedProvider.getTransactionCount
                        .withArgs(walletAddress)
                        .resolves(txCount);
                });

                it('has a positive base layer transactions count', async () => {
                    let balance = await wallet.getTransactionCount();
                    expect(balance).to.eql(txCount);
                });
            });

            context('a wallet with no nahmii balance', () => {
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

            context('a wallet with nahmii staged balance', () => {
                const expectedStagedBalance = ethers.utils.bigNumberify('10000');
                beforeEach(() => {
                    const balanceTypeAddress = '0x1';
                    const currencyAddress = '0x0000000000000000000000000000000000000000';
                    stubbedBalanceTrackerContract.stagedBalanceType
                        .resolves(balanceTypeAddress);
                    stubbedBalanceTrackerContract.get.withArgs(wallet.address, balanceTypeAddress, currencyAddress, 0).resolves(expectedStagedBalance);
                });
                it('has a nahmii staged balance', async () => {
                    const stagedBalance = await wallet.getNahmiiStagedBalance('ETH');
                    expect(stagedBalance).to.equal(expectedStagedBalance);
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
                                amount: '100200000000000000000',
                                amountAvailable: '100200000000000000000'
                            },
                            {
                                wallet: walletAddress,
                                currency: {ct: testTokens[1].currency, id: '0'},
                                amount: '3140000000000000000',
                                amountAvailable: '1140000000000000000'
                            }
                        ]);
                });

                it('has a nahmii balance', async () => {
                    let balance = await wallet.getNahmiiBalance();
                    expect(balance).to.eql({
                        'ETH': '100.2',
                        'TT1': '1.14'
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
                    const monetaryAmount = MonetaryAmount.from(amountBN, currency, 0);
                    let tx = await wallet.withdraw(monetaryAmount);
                    expect(tx).to.equal(fakeTx);
                });
            });

            context('a wallet with nahmii balance in unsupported currency', () => {
                beforeEach(() => {
                    stubbedProvider.getNahmiiBalances
                        .withArgs(walletAddress)
                        .resolves([
                            {
                                wallet: walletAddress,
                                currency: {
                                    ct: '0x0000000000000000000000000000000000004321',
                                    id: '0'
                                },
                                amount: '100200000000000000000',
                                amountAvailable: '100200000000000000000'
                            },
                            {
                                wallet: walletAddress,
                                currency: {ct: testTokens[1].currency, id: '0'},
                                amount: '3140000000000000000',
                                amountAvailable: '1140000000000000000'
                            }
                        ]);
                });

                it('has a nahmii balance', async () => {
                    let balance = await wallet.getNahmiiBalance();
                    expect(balance).to.eql({
                        '0X0000000000000000000000000000000000004321': '100200000000000000000',
                        'TT1': '1.14'
                    });
                });

                it('can withdraw eth or tokens', async () => {
                    const fakeTx = {hash: 'magic tx hash 1'};
                    const amount = '1.23';
                    const currency = '0x0000000000000000000000000000000000004321';
                    const amountBN = ethers.utils.parseUnits(amount, 18);
                    stubbedClientFundContract.withdraw
                        .withArgs(amountBN.toString(), currency, '0', '', {})
                        .resolves(fakeTx);
                    const monetaryAmount = MonetaryAmount.from(amountBN, currency, 0);
                    let tx = await wallet.withdraw(monetaryAmount);
                    expect(tx).to.equal(fakeTx);
                });
            });

            context('a wallet with a base layer balance', () => {
                let walletBal;
                const fakeTxHash = 'some tx hash';

                beforeEach(() => {
                    walletBal = ethers.utils.bigNumberify('10000');
                    stubbedProvider.getBalance
                        .withArgs(walletAddress)
                        .resolves(walletBal);
                });

                it('has a base layer balance', async () => {
                    let result = await wallet.getBalance();
                    expect(result).to.eql(walletBal);
                });

                it('can send a transaction', async () => {
                    const rawTx = {
                        to: walletAddress,
                        value: ethers.utils.parseEther('1.23'),
                        gasLimit: 1
                    };
                    const gasPrice = ethers.utils.bigNumberify('1000');
                    const transactionCount = 1;
                    const network = {chainId: 3};
                    const tx = {
                        value: ethers.utils.parseEther('1.23'),
                        to: walletAddress,
                        gasPrice,
                        gasLimit: 1,
                        nonce: transactionCount,
                        chainId: network.chainId
                    };
                    const signedHex = '0xf867018203e80194691a8d05678fc962ff0f2174134379c0051cb686881111d67bb1bb00008029a0d3ee30ea37851b40850481af6feec666c3f60c13f093ffe1da5c0db30c8b09ada033726b50332de13a9893a6dd759474876b46854cf434bfc5145ed3b46eec843c';
                    stubbedProvider.getGasPrice
                        .resolves(gasPrice);
                    stubbedProvider.getTransactionCount
                        .resolves(transactionCount);
                    stubbedProvider.getNetwork
                        .resolves(network);
                    stubbedProvider.resolveName
                        .resolves(walletAddress);
                    stubbedProvider.sendTransaction
                        .withArgs(signedHex)
                        .resolves({...tx, hash: fakeTxHash});
                    sinon.stub(wallet, 'sign')
                        .withArgs(tx)
                        .resolves(signedHex);

                    const res = await wallet.sendTransaction(rawTx);
                    expect(res).to.deep.equal({...tx, hash: fakeTxHash});
                });

                it('can deposit ETH to nahmii', async () => {
                    const rawTx = {
                        to: stubbedClientFundContract.address,
                        value: ethers.utils.parseEther('1.23'),
                        gasLimit: 1
                    };
                    sinon.stub(wallet, 'sendTransaction')
                        .withArgs(rawTx)
                        .resolves({hash: fakeTxHash});
                    let {hash} = await wallet.depositEth('1.23', {gasLimit: 1});
                    expect(hash).to.equal(fakeTxHash);
                });

                for (let i = 1; i < testTokens.length; i++) {
                    let t = testTokens[i];

                    it(`can initiate the deposit of ${t.symbol} tokens to nahmii`, async () => {
                        stubbedErc20Contracts[i].approve
                            .withArgs(stubbedClientFundContract.address, ethers.utils.parseUnits('2.71', t.decimals), {gasLimit: 1})
                            .resolves({hash: fakeTxHash});
                        const {hash} = await wallet.approveTokenDeposit('2.71', t.symbol, {gasLimit: 1});
                        expect(hash).to.eql(fakeTxHash);
                    });

                    it(`can complete the deposit of ${t.symbol} tokens to nahmii`, async () => {
                        stubbedClientFundContract.receiveTokens
                            .withArgs('', ethers.utils.parseUnits('2.71', t.decimals), t.currency, 0, 'ERC20', {gasLimit: 1})
                            .resolves({hash: fakeTxHash});
                        const {hash} = await wallet.completeTokenDeposit('2.71', t.symbol, {gasLimit: 1});
                        expect(hash).to.eql(fakeTxHash);
                    });

                    it(`rejects when deposit of ${t.symbol} can not be completed`, (done) => {
                        stubbedClientFundContract.receiveTokens
                            .rejects('some error');
                        wallet.completeTokenDeposit('2.71', t.symbol, {gasLimit: 1})
                            .catch(e => {
                                expect(e).to.match(/failed.*deposit.*some.*error/i);
                                done();
                            });
                    });
                }
            });

            context('a wallet with no non-nahmii balance', () => {
                let walletBal;
                beforeEach(() => {
                    walletBal = ethers.utils.bigNumberify('0');
                    stubbedProvider.getBalance
                        .withArgs(walletAddress)
                        .resolves(walletBal);
                    sinon.stub(wallet, 'sendTransaction').rejects('insufficient funds');
                    stubbedErc20Contracts[1].approve.rejects('insufficient funds');
                    stubbedClientFundContract.receiveTokens.rejects('insufficient funds');
                });

                it('has no base layer balance', async () => {
                    let result = await wallet.getBalance();
                    expect(result).to.eql(walletBal);
                });

                it('can not deposit ETH to nahmii', (done) => {
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
                it('can unstage ETH or tokens', async () => {
                    const fakeTx = {hash: 'magic tx hash 1'};
                    const amount = '1.23';
                    const currency = '0x0000000000000000000000000000000000000000';
                    const amountBN = ethers.utils.parseUnits(amount, 18);
                    stubbedClientFundContract.unstage
                        .withArgs(amountBN.toString(), currency, '0', '', {})
                        .resolves(fakeTx);
                    const monetaryAmount = MonetaryAmount.from(amountBN, currency, 0);
                    let tx = await wallet.unstage(monetaryAmount);
                    expect(tx).to.equal(fakeTx);
                });
            });

            for (let i = 1; i < testTokens.length; i++) {
                let token = testTokens[i];

                context('a wallet with a deposit allowance for ' + token.symbol, () => {
                    it('can retrieve allowance', async () => {
                        stubbedErc20Contracts[i].allowance = sinon.stub()
                            .withArgs(wallet.address, token.currency)
                            .resolves(stubbedErc20Contracts[i].parse('123'));
                        const allowance = await wallet.getDepositAllowance(token.symbol);
                        expect(allowance).to.eql(stubbedErc20Contracts[i].parse('123'));
                    });
                });
            }
        });
    });
});
