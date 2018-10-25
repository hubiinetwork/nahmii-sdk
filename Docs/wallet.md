<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [Wallet](#exp_module_nahmii-sdk--Wallet) ⏏
        * [new Wallet(privateKey, provider)](#new_module_nahmii-sdk--Wallet_new)
        * [.getNahmiiBalance()](#module_nahmii-sdk--Wallet+getNahmiiBalance) ⇒ <code>Promise</code>
        * [.depositEth(amountEth, [options])](#module_nahmii-sdk--Wallet+depositEth) ⇒ <code>Promise</code>
        * [.approveTokenDeposit(amount, symbol, [options])](#module_nahmii-sdk--Wallet+approveTokenDeposit) ⇒ <code>Promise</code>
        * [.completeTokenDeposit(amount, symbol, [options])](#module_nahmii-sdk--Wallet+completeTokenDeposit) ⇒ <code>Promise</code>

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

<a name="module_nahmii-sdk--Wallet+getNahmiiBalance"></a>

#### wallet.getNahmiiBalance() ⇒ <code>Promise</code>
Retrieves nahmii balance for current wallet.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a mapping from symbol to human readable amount.  
<a name="module_nahmii-sdk--Wallet+depositEth"></a>

#### wallet.depositEth(amountEth, [options]) ⇒ <code>Promise</code>
Initiates the deposit of ETH from the on-chain balance of the wallet to nahmii.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| amountEth | <code>number</code> \| <code>string</code> | The amount of ETH to deposit. |
| [options] |  |  |

**Example**  
```js
let depositTxHash = await wallet.depositEth('1.1', {gasLimit: 200000});
```
<a name="module_nahmii-sdk--Wallet+approveTokenDeposit"></a>

#### wallet.approveTokenDeposit(amount, symbol, [options]) ⇒ <code>Promise</code>
Initiates the deposit of a token from a wallet's the on-chain balance to nahmii by calling the approve method of the token smart contract.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| amount | <code>number</code> \| <code>string</code> | The amount of currency to deposit. |
| symbol | <code>string</code> | The currency symbol |
| [options] |  |  |

**Example**  
```js
let approveTxHash = await wallet.approveTokenDeposit('1.1', 'TT1', {gasLimit: 200000});
```
<a name="module_nahmii-sdk--Wallet+completeTokenDeposit"></a>

#### wallet.completeTokenDeposit(amount, symbol, [options]) ⇒ <code>Promise</code>
Initiates the completion of a deposit of a token from a wallet's on-chain balance to nahmii by calling the depositTokens method of the nahmii clientFund smart contract.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a transaction hash.

| Param | Type | Description |
| --- | --- | --- |
| amount | <code>number</code> \| <code>string</code> | The amount of currency to deposit. |
| symbol | <code>string</code> | The currency symbol |
| [options] |  |  |

**Example**  
```js
let depositTokensTxHash = await wallet.completeTokenDeposit('1.1', 'TT1', {gasLimit: 200000});
```
