<a name="module_nahmii-sdk"></a>

## OnchainBalanceSettlement
OnchainBalanceSettlement
A class for managing a settlement based on ClientFund's active balance.

**Kind**: global class  

* [OnchainBalanceSettlement](#module_nahmii-sdk)
    * [new OnchainBalanceSettlement(address, monetaryAmount, provider)](#new_module_nahmii-sdk_new)
    * _instance_
        * [.type](#module_nahmii-sdk+type) ⇒ <code>string</code>
        * [.status](#module_nahmii-sdk+status) ⇒ <code>string</code>
        * [.isStarted](#module_nahmii-sdk+isStarted) ⇒ <code>boolean</code>
        * [.isTerminated](#module_nahmii-sdk+isTerminated) ⇒ <code>boolean</code>
        * [.isCompleted](#module_nahmii-sdk+isCompleted) ⇒ <code>boolean</code>
        * [.isOngoing](#module_nahmii-sdk+isOngoing) ⇒ <code>boolean</code>
        * [.isStageable](#module_nahmii-sdk+isStageable) ⇒ <code>boolean</code>
        * [.expirationTime](#module_nahmii-sdk+expirationTime) ⇒ <code>boolean</code>
        * [.start(wallet, [options])](#module_nahmii-sdk+start) ⇒ <code>Promise</code>
        * [.stage(wallet, [options])](#module_nahmii-sdk+stage) ⇒ <code>Promise</code>
        * [.toJSON()](#module_nahmii-sdk+toJSON) ⇒ <code>JSON</code>
    * _static_
        * [.load(address, currency, provider)](#module_nahmii-sdk.load) ⇒ <code>Promise</code>
        * [.create(address, monetaryAmount, provider)](#module_nahmii-sdk.create) ⇒ <code>Promise</code>
        * [.checkForCreate(address, currency, provider)](#module_nahmii-sdk.checkForCreate) ⇒ <code>Promise</code>

<a name="new_module_nahmii-sdk_new"></a>

### new OnchainBalanceSettlement(address, monetaryAmount, provider)
Constructor
Creates a new settlement for an intended stage amount without an off-chain receipt.


| Param | Type | Description |
| --- | --- | --- |
| address | <code>EthereumAddress</code> | Wallet address |
| monetaryAmount | <code>MonetaryAmount</code> | Intended stage amount in a currency |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

**Example**  
```js
const nahmii = require('nahmii-sdk');
const {EthereumAddress} = require('nahmii-ethereum-address');
const wallet_address = EthereumAddress.from('0x0000000000000000000000000000000000000001');
const stageAmount = ethers.utils.bigNumberify(1);
const monetaryAmount = MonetaryAmount.from({
     currency: {ct: '0x0000000000000000000000000000000000000002', id: '0'},
     amount: stageAmount
});
const paymentSettlement = new nahmii.OnchainBalanceSettlement(wallet_address, monetaryAmount, provider);
```
<a name="module_nahmii-sdk+type"></a>

### onchainBalanceSettlement.type ⇒ <code>string</code>
This settlement's type

**Kind**: instance property of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+status"></a>

### onchainBalanceSettlement.status ⇒ <code>string</code>
This settlement's status. Either ['Qualified', 'Disqualified']

**Kind**: instance property of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+isStarted"></a>

### onchainBalanceSettlement.isStarted ⇒ <code>boolean</code>
Indicates if this settlement has been started

**Kind**: instance property of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+isTerminated"></a>

### onchainBalanceSettlement.isTerminated ⇒ <code>boolean</code>
Indicates if this settlement has been terminated

**Kind**: instance property of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+isCompleted"></a>

### onchainBalanceSettlement.isCompleted ⇒ <code>boolean</code>
Indicates if this settlement has been completed

**Kind**: instance property of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+isOngoing"></a>

### onchainBalanceSettlement.isOngoing ⇒ <code>boolean</code>
Indicates if this settlement is ongoing

**Kind**: instance property of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+isStageable"></a>

### onchainBalanceSettlement.isStageable ⇒ <code>boolean</code>
Indicates if this settlement is ready to be staged

**Kind**: instance property of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+expirationTime"></a>

### onchainBalanceSettlement.expirationTime ⇒ <code>boolean</code>
This settlement's expiration time

**Kind**: instance property of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+start"></a>

### onchainBalanceSettlement.start(wallet, [options]) ⇒ <code>Promise</code>
Starts this settlement with a wallet

**Kind**: instance method of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into an object that contains the transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | A nahmii wallet |
| [options] |  | An optional object containing the parameters for gasLimit and gasPrice |

<a name="module_nahmii-sdk+stage"></a>

### onchainBalanceSettlement.stage(wallet, [options]) ⇒ <code>Promise</code>
Stages this settlement with a wallet

**Kind**: instance method of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into an record that contains the transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | A nahmii wallet |
| [options] |  | An optional object containing the parameters for gasLimit and gasPrice |

<a name="module_nahmii-sdk+toJSON"></a>

### onchainBalanceSettlement.toJSON() ⇒ <code>JSON</code>
Converts this settlement into a JSON object

**Kind**: instance method of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>JSON</code> - A JSON object that is in the format the API expects  
<a name="module_nahmii-sdk.load"></a>

### OnchainBalanceSettlement.load(address, currency, provider) ⇒ <code>Promise</code>
A factory function to load an existing settlement

**Kind**: static method of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into a PaymentSettlement instance.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>EthereumAddress</code> | The ethereum address |
| currency | <code>Currency</code> | The currency |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

<a name="module_nahmii-sdk.create"></a>

### OnchainBalanceSettlement.create(address, monetaryAmount, provider) ⇒ <code>Promise</code>
A factory function to create a new settlement instance before starting it

**Kind**: static method of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into a PaymentSettlement instance.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>EthereumAddress</code> | The ethereum address |
| monetaryAmount | <code>MonetaryAmount</code> | The monetary amount |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

<a name="module_nahmii-sdk.checkForCreate"></a>

### OnchainBalanceSettlement.checkForCreate(address, currency, provider) ⇒ <code>Promise</code>
A factory function to check if a new settlement instance can be created for a wallet/currency pair

**Kind**: static method of [<code>OnchainBalanceSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into an object {canStart: [boolean], maxStageAmount: [BigNumber], receiptToUse: [Receipt]}.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>EthereumAddress</code> | The ethereum address |
| currency | <code>Currency</code> | The currency |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

