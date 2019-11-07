<a name="module_nahmii-sdk"></a>

## PaymentSettlement
PaymentSettlement
A class for managing a settlement in payment driip type.

**Kind**: global class  

* [PaymentSettlement](#module_nahmii-sdk)
    * [new PaymentSettlement(address, receipt, stageAmount, provider)](#new_module_nahmii-sdk_new)
    * _instance_
        * [.type](#module_nahmii-sdk+type) ⇒ <code>string</code>
        * [.receipt](#module_nahmii-sdk+receipt) ⇒ <code>Receipt</code>
        * [.walletNonce](#module_nahmii-sdk+walletNonce) ⇒ <code>number</code>
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

### new PaymentSettlement(address, receipt, stageAmount, provider)
Constructor
Creates a new settlement with a payment receipt for an intended stage amount.


| Param | Type | Description |
| --- | --- | --- |
| address | <code>EthereumAddress</code> | Wallet address |
| receipt | <code>Receipt</code> | Senders address |
| stageAmount | <code>BigNumber</code> | Intended stage amount in BigNumber |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

**Example**  
```js
const {EthereumAddress} = require('nahmii-ethereum-address');
const nahmii = require('nahmii-sdk');
const wallet_address = EthereumAddress.from('0x0000000000000000000000000000000000000001');
const stageAmount = ethers.utils.bigNumberify(1);
const paymentSettlement = new nahmii.PaymentSettlement(wallet_address, receipt, stageAmount, provider);
```
<a name="module_nahmii-sdk+type"></a>

### paymentSettlement.type ⇒ <code>string</code>
This settlement's type

**Kind**: instance property of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+receipt"></a>

### paymentSettlement.receipt ⇒ <code>Receipt</code>
The receipt this settlement is based on

**Kind**: instance property of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+walletNonce"></a>

### paymentSettlement.walletNonce ⇒ <code>number</code>
The wallet's nonce used for starting this settlement

**Kind**: instance property of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+status"></a>

### paymentSettlement.status ⇒ <code>string</code>
This settlement's status. Either ['Qualified', 'Disqualified']

**Kind**: instance property of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+isStarted"></a>

### paymentSettlement.isStarted ⇒ <code>boolean</code>
Indicates if this settlement has been started

**Kind**: instance property of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+isTerminated"></a>

### paymentSettlement.isTerminated ⇒ <code>boolean</code>
Indicates if this settlement has been terminated

**Kind**: instance property of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+isCompleted"></a>

### paymentSettlement.isCompleted ⇒ <code>boolean</code>
Indicates if this settlement has been completed

**Kind**: instance property of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+isOngoing"></a>

### paymentSettlement.isOngoing ⇒ <code>boolean</code>
Indicates if this settlement is ongoing

**Kind**: instance property of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+isStageable"></a>

### paymentSettlement.isStageable ⇒ <code>boolean</code>
Indicates if this settlement is ready to be staged

**Kind**: instance property of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+expirationTime"></a>

### paymentSettlement.expirationTime ⇒ <code>boolean</code>
This settlement's expiration time

**Kind**: instance property of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
<a name="module_nahmii-sdk+start"></a>

### paymentSettlement.start(wallet, [options]) ⇒ <code>Promise</code>
Starts this settlement with a wallet

**Kind**: instance method of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into an object that contains the transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | A nahmii wallet |
| [options] |  | An optional object containing the parameters for gasLimit and gasPrice |

<a name="module_nahmii-sdk+stage"></a>

### paymentSettlement.stage(wallet, [options]) ⇒ <code>Promise</code>
Stages this settlement with a wallet

**Kind**: instance method of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into a record that contains the transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | A nahmii wallet |
| [options] |  | An optional object containing the parameters for gasLimit and gasPrice |

<a name="module_nahmii-sdk+toJSON"></a>

### paymentSettlement.toJSON() ⇒ <code>JSON</code>
Converts this settlement into a JSON object

**Kind**: instance method of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>JSON</code> - A JSON object that is in the format the API expects  
<a name="module_nahmii-sdk.load"></a>

### PaymentSettlement.load(address, currency, provider) ⇒ <code>Promise</code>
A factory function to load an existing settlement

**Kind**: static method of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into a PaymentSettlement instance.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>EthereumAddress</code> | The ethereum address |
| currency | <code>Currency</code> | The currency |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

<a name="module_nahmii-sdk.create"></a>

### PaymentSettlement.create(address, monetaryAmount, provider) ⇒ <code>Promise</code>
A factory function to create a new settlement instance before starting it

**Kind**: static method of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into a PaymentSettlement instance.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>EthereumAddress</code> | The ethereum address |
| monetaryAmount | <code>MonetaryAmount</code> | The monetary amount |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

<a name="module_nahmii-sdk.checkForCreate"></a>

### PaymentSettlement.checkForCreate(address, currency, provider) ⇒ <code>Promise</code>
A factory function to check if a new settlement instance can be created for a wallet/currency pair

**Kind**: static method of [<code>PaymentSettlement</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into an object {canStart: [boolean], maxStageAmount: [BigNumber], receiptToUse: [Receipt]}.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>EthereumAddress</code> | The ethereum address |
| currency | <code>Currency</code> | The currency |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

