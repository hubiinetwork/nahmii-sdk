<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [DriipSettlement](#exp_module_nahmii-sdk--DriipSettlement) ⏏
        * [new DriipSettlement(provider)](#new_module_nahmii-sdk--DriipSettlement_new)
        * [.getCurrentProposalNonce(address, ct, id)](#module_nahmii-sdk--DriipSettlement+getCurrentProposalNonce) ⇒ <code>Promise</code>
        * [.getCurrentProposalExpirationTime(address, ct, id)](#module_nahmii-sdk--DriipSettlement+getCurrentProposalExpirationTime) ⇒ <code>Promise</code>
        * [.hasProposalExpired(address, ct, id)](#module_nahmii-sdk--DriipSettlement+hasProposalExpired) ⇒ <code>Promise</code>
        * [.getCurrentProposalStageAmount(address, ct, id)](#module_nahmii-sdk--DriipSettlement+getCurrentProposalStageAmount) ⇒ <code>Promise</code>
        * [.getCurrentProposalStatus(address, ct, id)](#module_nahmii-sdk--DriipSettlement+getCurrentProposalStatus) ⇒ <code>Promise</code>
        * [.getSettlementByNonce(nonce)](#module_nahmii-sdk--DriipSettlement+getSettlementByNonce) ⇒ <code>Promise</code>
        * [.hasPaymentDriipSettled(nonce, address)](#module_nahmii-sdk--DriipSettlement+hasPaymentDriipSettled) ⇒ <code>Promise</code>
        * [.checkStartChallengeFromPayment(receipt, address)](#module_nahmii-sdk--DriipSettlement+checkStartChallengeFromPayment) ⇒ <code>Promise</code>
        * [.checkSettleDriipAsPayment(receipt, address)](#module_nahmii-sdk--DriipSettlement+checkSettleDriipAsPayment) ⇒ <code>Promise</code>
        * [.settleDriipAsPayment(receipt, wallet, [options])](#module_nahmii-sdk--DriipSettlement+settleDriipAsPayment) ⇒ <code>Promise</code>
        * [.startChallengeFromPayment(receipt, stageAmount, wallet, [options])](#module_nahmii-sdk--DriipSettlement+startChallengeFromPayment) ⇒ <code>Promise</code>
        * [.stopChallenge(wallet, ct, id, [options])](#module_nahmii-sdk--DriipSettlement+stopChallenge) ⇒ <code>Promise</code>

<a name="exp_module_nahmii-sdk--DriipSettlement"></a>

### DriipSettlement ⏏
DriipSettlement
A class for creating a _hubii nahmii_ DriipSettlement, which is used for settlement with driip.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--DriipSettlement_new"></a>

#### new DriipSettlement(provider)
Constructor


| Param | Type | Description |
| --- | --- | --- |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

**Example**  
```js
const nahmii = require('nahmii-sdk');
const provider = new nahmii.NahmiiProvider(nahmii_base_url, nahmii_app_id, nahmii_app_secret);

const driipSettlement = new nahmii.DriipSettlement(provider);
const expired = await driipSettlement.hasProposalExpired(walletAddress, currencyAddress, currencyId);
```
<a name="module_nahmii-sdk--DriipSettlement+getCurrentProposalNonce"></a>

#### driipSettlement.getCurrentProposalNonce(address, ct, id) ⇒ <code>Promise</code>
Returns the proposal nonce

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into a BigNumber value representing the nonce of the latest challenge.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

**Example**  
```js
let nonce = await driipSettlement.getCurrentProposalNonce(address, ct, id);
```
<a name="module_nahmii-sdk--DriipSettlement+getCurrentProposalExpirationTime"></a>

#### driipSettlement.getCurrentProposalExpirationTime(address, ct, id) ⇒ <code>Promise</code>
Returns the expiration time of the proposal

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into a BigNumber value representing the timeout timestamp.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

**Example**  
```js
let expirationTime = await driipSettlement.getCurrentProposalExpirationTime(address, ct, id);
```
<a name="module_nahmii-sdk--DriipSettlement+hasProposalExpired"></a>

#### driipSettlement.hasProposalExpired(address, ct, id) ⇒ <code>Promise</code>
Returns expire state of the current proposal

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into a boolean value indicating if the latest challenge has expired.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

**Example**  
```js
let hasExpired = await driipSettlement.hasProposalExpired(address, ct, id);
```
<a name="module_nahmii-sdk--DriipSettlement+getCurrentProposalStageAmount"></a>

#### driipSettlement.getCurrentProposalStageAmount(address, ct, id) ⇒ <code>Promise</code>
Returns intended stage amount of the current challenge proposal

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into a BigNumber value representing the indended stage amount for the latest challenge.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

**Example**  
```js
let stagedAmount = await driipSettlement.getCurrentProposalStageAmount(address, ct, id);
```
<a name="module_nahmii-sdk--DriipSettlement+getCurrentProposalStatus"></a>

#### driipSettlement.getCurrentProposalStatus(address, ct, id) ⇒ <code>Promise</code>
Returns status of the current challenge proposal

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into a string of either ['Qualified', 'Disqualified'] indicating the status of the latest challenge.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

**Example**  
```js
let status = await driipSettlement.getCurrentProposalStatus(address, ct, id);
```
<a name="module_nahmii-sdk--DriipSettlement+getSettlementByNonce"></a>

#### driipSettlement.getSettlementByNonce(nonce) ⇒ <code>Promise</code>
Returns settlement details object.

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into the settlement details object.  

| Param | Type | Description |
| --- | --- | --- |
| nonce | <code>number</code> | The nonce that this function queries for. |

**Example**  
```js
let settlement = await driipSettlement.getSettlementByNonce(1);
```
<a name="module_nahmii-sdk--DriipSettlement+hasPaymentDriipSettled"></a>

#### driipSettlement.hasPaymentDriipSettled(nonce, address) ⇒ <code>Promise</code>
Check if the driip has been settled by a wallet

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into boolean to indicate if the driip has been settled.  

| Param | Type | Description |
| --- | --- | --- |
| nonce | <code>number</code> | The nonce that this function queries for. |
| address | <code>Address</code> | The wallet address that this function queries for. |

<a name="module_nahmii-sdk--DriipSettlement+checkStartChallengeFromPayment"></a>

#### driipSettlement.checkStartChallengeFromPayment(receipt, address) ⇒ <code>Promise</code>
Check if a wallet can start new challenge for a nahmii payment receipt

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into true or throws errors  

| Param | Type | Description |
| --- | --- | --- |
| receipt | <code>Receipt</code> | The nahmii receipt object to check with. |
| address | <code>Address</code> | The wallet address. |

<a name="module_nahmii-sdk--DriipSettlement+checkSettleDriipAsPayment"></a>

#### driipSettlement.checkSettleDriipAsPayment(receipt, address) ⇒ <code>Promise</code>
Check if a wallet can settle for a nahmii payment receipt

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into true or throws errors  

| Param | Type | Description |
| --- | --- | --- |
| receipt | <code>Receipt</code> | The nahmii receipt object to check with. |
| address | <code>Address</code> | The wallet address. |

<a name="module_nahmii-sdk--DriipSettlement+settleDriipAsPayment"></a>

#### driipSettlement.settleDriipAsPayment(receipt, wallet, [options]) ⇒ <code>Promise</code>
Settle a payment driip of this wallet.

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| receipt | <code>Receipt</code> | The receipt object for the payment settlement. |
| wallet | <code>Wallet</code> | The wallet object that initiates payment settlement. |
| [options] |  |  |

**Example**  
```js
let hashObj = await driipSettlement.settleDriipAsPayment(receipt, wallet, {gasLimit: 200000});
```
<a name="module_nahmii-sdk--DriipSettlement+startChallengeFromPayment"></a>

#### driipSettlement.startChallengeFromPayment(receipt, stageAmount, wallet, [options]) ⇒ <code>Promise</code>
Start a challenge from a payment

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| receipt | <code>Receipt</code> | The receipt object for payment challenge. |
| stageAmount | <code>MonetaryAmount</code> | The amount to stage from the settled balance during the settlement. |
| wallet | <code>Wallet</code> | The wallet object that starts the payment challenge. |
| [options] |  |  |

**Example**  
```js
let hashObj = await driipSettlement.startChallengeFromPayment(receipt, stageAmount, wallet, {gasLimit: 200000});
```
<a name="module_nahmii-sdk--DriipSettlement+stopChallenge"></a>

#### driipSettlement.stopChallenge(wallet, ct, id, [options]) ⇒ <code>Promise</code>
Stop a driip settlement challenge for wallet/currency pair.

**Kind**: instance method of [<code>DriipSettlement</code>](#exp_module_nahmii-sdk--DriipSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The wallet object that stops the challenge. |
| ct | <code>Address</code> | The currency address. |
| id | <code>Integer</code> | The currency id. |
| [options] |  |  |

