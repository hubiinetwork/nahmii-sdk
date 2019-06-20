<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [NullSettlement](#exp_module_nahmii-sdk--NullSettlement) ⏏
        * [new NullSettlement(provider)](#new_module_nahmii-sdk--NullSettlement_new)
        * [.hasCurrentProposalExpired(address, ct, id)](#module_nahmii-sdk--NullSettlement+hasCurrentProposalExpired) ⇒ <code>Promise</code>
        * [.hasCurrentProposalTerminated(address, ct, id)](#module_nahmii-sdk--NullSettlement+hasCurrentProposalTerminated) ⇒ <code>Promise</code>
        * [.getCurrentProposalExpirationTime(address, ct, id)](#module_nahmii-sdk--NullSettlement+getCurrentProposalExpirationTime) ⇒ <code>Promise</code>
        * [.getCurrentProposalStageAmount(address, ct, id)](#module_nahmii-sdk--NullSettlement+getCurrentProposalStageAmount) ⇒ <code>Promise</code>
        * [.getCurrentProposalStatus(address, ct, id)](#module_nahmii-sdk--NullSettlement+getCurrentProposalStatus) ⇒ <code>Promise</code>
        * [.getCurrentProposalStartBlockNumber(address, ct)](#module_nahmii-sdk--NullSettlement+getCurrentProposalStartBlockNumber) ⇒ <code>Promise</code>
        * [.checkStartChallenge(stageAmount, address)](#module_nahmii-sdk--NullSettlement+checkStartChallenge) ⇒ <code>Promise</code>
        * [.checkSettleNull(address, ct, id)](#module_nahmii-sdk--NullSettlement+checkSettleNull) ⇒ <code>Promise</code>
        * [.settleNull(wallet, ct, id, [options])](#module_nahmii-sdk--NullSettlement+settleNull) ⇒ <code>Promise</code>
        * [.startChallenge(wallet, stageAmount, [options])](#module_nahmii-sdk--NullSettlement+startChallenge) ⇒ <code>Promise</code>
        * [.stopChallenge(wallet, ct, id, [options])](#module_nahmii-sdk--NullSettlement+stopChallenge) ⇒ <code>Promise</code>

<a name="exp_module_nahmii-sdk--NullSettlement"></a>

### NullSettlement ⏏
NullSettlement
A class for creating a _hubii nahmii_ NullSettlement, which is used for settlements without driips.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--NullSettlement_new"></a>

#### new NullSettlement(provider)
Constructor


| Param | Type | Description |
| --- | --- | --- |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

**Example**  
```js
const nahmii = require('nahmii-sdk');
const provider = new nahmii.NahmiiProvider(nahmii_base_url, nahmii_app_id, nahmii_app_secret);

const nullSettlement = new nahmii.NullSettlement(provider);
const expired = await nullSettlement.hasCurrentProposalExpired(walletAddress, currencyAddress, currencyId);
```
<a name="module_nahmii-sdk--NullSettlement+hasCurrentProposalExpired"></a>

#### nullSettlement.hasCurrentProposalExpired(address, ct, id) ⇒ <code>Promise</code>
Returns expire state of the current proposal

**Kind**: instance method of [<code>NullSettlement</code>](#exp_module_nahmii-sdk--NullSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into a boolean value indicating if the latest challenge has expired.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

**Example**  
```js
let hasExpired = await nullSettlement.hasCurrentProposalExpired(address, ct, id);
```
<a name="module_nahmii-sdk--NullSettlement+hasCurrentProposalTerminated"></a>

#### nullSettlement.hasCurrentProposalTerminated(address, ct, id) ⇒ <code>Promise</code>
Returns the terminated state of the current proposal

**Kind**: instance method of [<code>NullSettlement</code>](#exp_module_nahmii-sdk--NullSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into a boolean value indicating if the latest challenge has been terminated.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

**Example**  
```js
let hasTerminated = await nullSettlement.hasCurrentProposalTerminated(address, ct, id);
```
<a name="module_nahmii-sdk--NullSettlement+getCurrentProposalExpirationTime"></a>

#### nullSettlement.getCurrentProposalExpirationTime(address, ct, id) ⇒ <code>Promise</code>
Returns expiration timestamp

**Kind**: instance method of [<code>NullSettlement</code>](#exp_module_nahmii-sdk--NullSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into a BigNumber value representing the timeout timestamp.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

**Example**  
```js
let expirationTime = await nullSettlement.getCurrentProposalExpirationTime(address, ct, id);
```
<a name="module_nahmii-sdk--NullSettlement+getCurrentProposalStageAmount"></a>

#### nullSettlement.getCurrentProposalStageAmount(address, ct, id) ⇒ <code>Promise</code>
Returns intended stage amount of the current challenge proposal

**Kind**: instance method of [<code>NullSettlement</code>](#exp_module_nahmii-sdk--NullSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into a BigNumber value representing the indended stage amount for the latest challenge.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

**Example**  
```js
let stagedAmount = await nullSettlement.getCurrentProposalStageAmount(address, ct, id);
```
<a name="module_nahmii-sdk--NullSettlement+getCurrentProposalStatus"></a>

#### nullSettlement.getCurrentProposalStatus(address, ct, id) ⇒ <code>Promise</code>
Returns status of the current challenge proposal

**Kind**: instance method of [<code>NullSettlement</code>](#exp_module_nahmii-sdk--NullSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into a string of either ['Qualified', 'Disqualified'] indicating the status of the latest challenge.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

**Example**  
```js
let status = await nullSettlement.getCurrentProposalStatus(address, ct, id);
```
<a name="module_nahmii-sdk--NullSettlement+getCurrentProposalStartBlockNumber"></a>

#### nullSettlement.getCurrentProposalStartBlockNumber(address, ct) ⇒ <code>Promise</code>
Returns block number of the start of the current settlement proposal

**Kind**: instance method of [<code>NullSettlement</code>](#exp_module_nahmii-sdk--NullSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into a BigNumber or throws errors  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address. |
| ct | <code>Address</code> | The currency address. |

<a name="module_nahmii-sdk--NullSettlement+checkStartChallenge"></a>

#### nullSettlement.checkStartChallenge(stageAmount, address) ⇒ <code>Promise</code>
Check if a wallet can settle for an intended stage amount.

**Kind**: instance method of [<code>NullSettlement</code>](#exp_module_nahmii-sdk--NullSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into true or throws errors  

| Param | Type | Description |
| --- | --- | --- |
| stageAmount | <code>MonetaryAmount</code> | The intended stage amount to check with. |
| address | <code>Address</code> | The wallet address. |

<a name="module_nahmii-sdk--NullSettlement+checkSettleNull"></a>

#### nullSettlement.checkSettleNull(address, ct, id) ⇒ <code>Promise</code>
Check if a wallet can settle for an intended stage amount.

**Kind**: instance method of [<code>NullSettlement</code>](#exp_module_nahmii-sdk--NullSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into true or throws errors  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address. |
| ct | <code>Address</code> | The currency address. |
| id | <code>Integer</code> | The currency id. |

<a name="module_nahmii-sdk--NullSettlement+settleNull"></a>

#### nullSettlement.settleNull(wallet, ct, id, [options]) ⇒ <code>Promise</code>
Settle a null settlement.

**Kind**: instance method of [<code>NullSettlement</code>](#exp_module_nahmii-sdk--NullSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The wallet object that initiates payment settlement. |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |
| [options] |  |  |

**Example**  
```js
let hashObj = await nullSettlement.settleNull(address, ct, id, {gasLimit: 200000});
```
<a name="module_nahmii-sdk--NullSettlement+startChallenge"></a>

#### nullSettlement.startChallenge(wallet, stageAmount, [options]) ⇒ <code>Promise</code>
Start a null settlement challenge.

**Kind**: instance method of [<code>NullSettlement</code>](#exp_module_nahmii-sdk--NullSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The wallet object that starts the challenge. |
| stageAmount | <code>MonetaryAmount</code> | The amount to stage from the settled balance during the settlement. |
| [options] |  |  |

**Example**  
```js
let hashObj = await nullSettlement.startChallenge(address, stageAmount, {gasLimit: 200000});
```
<a name="module_nahmii-sdk--NullSettlement+stopChallenge"></a>

#### nullSettlement.stopChallenge(wallet, ct, id, [options]) ⇒ <code>Promise</code>
Stop a null settlement challenge for wallet/currency pair.

**Kind**: instance method of [<code>NullSettlement</code>](#exp_module_nahmii-sdk--NullSettlement)  
**Returns**: <code>Promise</code> - A promise that resolves into transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The wallet object that stops the challenge. |
| ct | <code>Address</code> | The currency address. |
| id | <code>Integer</code> | The currency id. |
| [options] |  |  |

