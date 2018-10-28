<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [Wallet](#exp_module_nahmii-sdk--Wallet) ⏏
        * [new Wallet(privateKey, provider)](#new_module_nahmii-sdk--Wallet_new)
        * [.getAvaliableBalances()](#module_nahmii-sdk--Wallet+getAvaliableBalances) ⇒ <code>Promise</code>
        * [.getStagedBalances()](#module_nahmii-sdk--Wallet+getStagedBalances) ⇒ <code>Promise</code>
        * [.getSettledBalances()](#module_nahmii-sdk--Wallet+getSettledBalance) ⇒ <code>Promise</code>
        * [.getDepositedBalances()](#module_nahmii-sdk--Wallet+getDepositedBalance) ⇒ <code>Promise</code>
        * [.depositEth(amountEth, [options])](#module_nahmii-sdk--Wallet+depositEth) ⇒ <code>Promise</code>
        * [.depositToken(amount, symbol, [options])](#module_nahmii-sdk--Wallet+depositToken) ⇒ <code>Promise</code>

<a name="exp_module_nahmii-sdk--Wallet"></a>

### Wallet ⏏
Wallet
A class for performing various operations on a wallet.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--Wallet_new"></a>

#### new Wallet(privateKey, provider)
Create a Wallet


| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>string</code> | The private key for the wallet |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

<a name="module_nahmii-sdk--Wallet+getAvaliableBalances"></a>

#### wallet.getAvaliableBalances() ⇒ <code>Promise</code>
Retrieves the avaliable nahmii balance for current wallet.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a mapping from symbol to human readable amount.  

<a name="module_nahmii-sdk--Wallet+getStagedBalances"></a>

#### wallet.getStagedBalances() ⇒ <code>Promise</code>
Retrieves all staged balances for current wallet.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a mapping from symbol to human readable amount.  

<a name="module_nahmii-sdk--Wallet+getSettledBalances"></a>

#### wallet.getSettledBalances() ⇒ <code>Promise</code>
Retrieves all settled balances for current wallet.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a mapping from symbol to human readable amount.  

<a name="module_nahmii-sdk--Wallet+getDepositedBalances"></a>

#### wallet.getDepositedBalances() ⇒ <code>Promise</code>
Retrieves all deposited balances for current wallet.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a mapping from symbol to human readable amount.  

<a name="module_nahmii-sdk--Wallet+depositEth"></a>

#### wallet.depositEth(amountEth, [options]) ⇒ <code>Promise</code>
Deposits ETH from the on-chain balance of the wallet to nahmii.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a transaction receipt.  
**See**: https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts  

| Param | Type | Description |
| --- | --- | --- |
| amountEth | <code>number</code> \| <code>string</code> | The amount of ETH to deposit. |
| [options] |  |  |

**Example**  
```js
let receipt = await wallet.depositEth('1.1', {gasLimit: 200000});
```
<a name="module_nahmii-sdk--Wallet+depositToken"></a>

#### wallet.depositToken(amount, symbol, [options]) ⇒ <code>Promise</code>
Deposits a token from the on-chain balance of the wallet to nahmii.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of transaction receipts.  
**See**: https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts  

| Param | Type | Description |
| --- | --- | --- |
| amount | <code>number</code> \| <code>string</code> | The amount of currency to deposit. |
| symbol | <code>string</code> | The currency symbol |
| [options] |  |  |

**Example**  
```js
let receipts = await wallet.depositToken('1.1', 'TT1', {gasLimit: 200000});
```
