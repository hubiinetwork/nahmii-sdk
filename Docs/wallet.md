<a name="module_striim-sdk"></a>

## striim-sdk

* [striim-sdk](#module_striim-sdk)
    * [Wallet](#exp_module_striim-sdk--Wallet) ⏏
        * [new Wallet(privateKey, provider)](#new_module_striim-sdk--Wallet_new)
        * [.getStriimBalance()](#module_striim-sdk--Wallet+getStriimBalance) ⇒ <code>Promise</code>
        * [.depositEth(amountEth, [options])](#module_striim-sdk--Wallet+depositEth) ⇒ <code>Promise</code>
        * [.depositToken(amount, symbol, [options])](#module_striim-sdk--Wallet+depositToken) ⇒ <code>Promise</code>

<a name="exp_module_striim-sdk--Wallet"></a>

### Wallet ⏏
Wallet
A class for performing various operations on a wallet.

**Kind**: Exported class  
<a name="new_module_striim-sdk--Wallet_new"></a>

#### new Wallet(privateKey, provider)
Create a Wallet


| Param | Type | Description |
| --- | --- | --- |
| privateKey | <code>string</code> | The private key for the wallet |
| provider | <code>StriimProvider</code> | A StriimProvider instance |

<a name="module_striim-sdk--Wallet+getStriimBalance"></a>

#### wallet.getStriimBalance() ⇒ <code>Promise</code>
Retrieves striim balance for current wallet.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_striim-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a mapping from symbol to human readable amount.  
<a name="module_striim-sdk--Wallet+depositEth"></a>

#### wallet.depositEth(amountEth, [options]) ⇒ <code>Promise</code>
Deposits ETH from the on-chain balance of the wallet to striim.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_striim-sdk--Wallet)  
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
<a name="module_striim-sdk--Wallet+depositToken"></a>

#### wallet.depositToken(amount, symbol, [options]) ⇒ <code>Promise</code>
Deposits a token from the on-chain balance of the wallet to striim.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_striim-sdk--Wallet)  
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
