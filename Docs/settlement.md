<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [Settlement](#exp_module_nahmii-sdk--Settlement) ⏏
        * [new Settlement(provider)](#new_module_nahmii-sdk--Settlement_new)
        * [.getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, walletAddress)](#module_nahmii-sdk--Settlement+getRequiredChallengesForIntendedStageAmount) ⇒ <code>Promise</code>
        * [.checkStartChallenge(stageMonetaryAmount, latestReceipt, walletAddress)](#module_nahmii-sdk--Settlement+checkStartChallenge) ⇒ <code>Promise</code>
        * [.getSettleableChallenges(address, ct, id)](#module_nahmii-sdk--Settlement+getSettleableChallenges) ⇒ <code>Promise</code>
        * [.getOngoingChallenges(address, ct, id)](#module_nahmii-sdk--Settlement+getOngoingChallenges) ⇒ <code>Promise</code>
        * [.getMaxChallengesTimeout(address, ct, id)](#module_nahmii-sdk--Settlement+getMaxChallengesTimeout) ⇒ <code>Promise</code>
        * [.getLatestReceiptForSettlement(address, ct)](#module_nahmii-sdk--Settlement+getLatestReceiptForSettlement) ⇒ <code>Promise</code>
        * [.startByRequiredChallenge(requiredChallenge, wallet, [options])](#module_nahmii-sdk--Settlement+startByRequiredChallenge) ⇒ <code>Promise</code>
        * [.stopByOngoingChallenge(ongoingChallenge, wallet, [options])](#module_nahmii-sdk--Settlement+stopByOngoingChallenge) ⇒ <code>Promise</code>
        * [.settleBySettleableChallenge(settleableChallenge, wallet, [options])](#module_nahmii-sdk--Settlement+settleBySettleableChallenge) ⇒ <code>Promise</code>
        * [.startChallenge(stageMonetaryAmount, wallet, [options])](#module_nahmii-sdk--Settlement+startChallenge) ⇒ <code>Promise</code>
        * [.stopChallenges(wallet, ct, id, [options])](#module_nahmii-sdk--Settlement+stopChallenges) ⇒ <code>Promise</code>
        * [.settle(stageMonetaryAmount, wallet, [options])](#module_nahmii-sdk--Settlement+settle) ⇒ <code>Promise</code>

<a name="exp_module_nahmii-sdk--Settlement"></a>

### Settlement ⏏
Settlement
A class for encapsulating the operations of settlements in different types.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--Settlement_new"></a>

#### new Settlement(provider)
Constructor


| Param | Type | Description |
| --- | --- | --- |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

<a name="module_nahmii-sdk--Settlement+getRequiredChallengesForIntendedStageAmount"></a>

#### settlement.getRequiredChallengesForIntendedStageAmount(stageMonetaryAmount, walletAddress) ⇒ <code>Promise</code>
Determine which types of challenges can be started and calculate the intended stage amount accordingly.

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an array determine which types of challenges can be started and calculate the intended stage amount accordingly.  

| Param | Type | Description |
| --- | --- | --- |
| stageMonetaryAmount | <code>MonetaryAmount</code> | The intended stage amount |
| walletAddress | <code>Address</code> | The wallet address |

<a name="module_nahmii-sdk--Settlement+checkStartChallenge"></a>

#### settlement.checkStartChallenge(stageMonetaryAmount, latestReceipt, walletAddress) ⇒ <code>Promise</code>
Returns which type of new challenges can be started

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an array representing which types of new challenges can be started.  

| Param | Type | Description |
| --- | --- | --- |
| stageMonetaryAmount | <code>MonetaryAmount</code> | The intended stage amount |
| latestReceipt | <code>JSON</code> \| <code>null</code> | The receipt object for driip settlement |
| walletAddress | <code>Address</code> | The wallet address |

<a name="module_nahmii-sdk--Settlement+getSettleableChallenges"></a>

#### settlement.getSettleableChallenges(address, ct, id) ⇒ <code>Promise</code>
Determine which types of challenges are qualified for staging and return the intended stage amounts accordingly.

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an array determine which types of challenges are qualified for staging and return the intended stage amounts accordingly.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

<a name="module_nahmii-sdk--Settlement+getOngoingChallenges"></a>

#### settlement.getOngoingChallenges(address, ct, id) ⇒ <code>Promise</code>
Return the ongoing challenges, with the corresponding expiration times and intended stage amount.

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an array representing the ongoing challenges, with the corresponding expiration times and intended stage amount.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

<a name="module_nahmii-sdk--Settlement+getMaxChallengesTimeout"></a>

#### settlement.getMaxChallengesTimeout(address, ct, id) ⇒ <code>Promise</code>
Return max expiration time for the ongoing challenges.

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an integer representing max expiration time for the ongoing challenges.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |

<a name="module_nahmii-sdk--Settlement+getLatestReceiptForSettlement"></a>

#### settlement.getLatestReceiptForSettlement(address, ct) ⇒ <code>Promise</code>
Return the latest receipt made in a currency under a wallet.

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an receipt.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>Address</code> | The wallet address |
| ct | <code>Address</code> | The currency address |

<a name="module_nahmii-sdk--Settlement+startByRequiredChallenge"></a>

#### settlement.startByRequiredChallenge(requiredChallenge, wallet, [options]) ⇒ <code>Promise</code>
Start challenge based on the parameter object generated by #getRequiredChallengesForIntendedStageAmount.

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an transaction object.  

| Param | Type | Description |
| --- | --- | --- |
| requiredChallenge | <code>RequiredChallenge</code> | The object stores the necessary parameters for starting a settlement challenge. |
| wallet | <code>Wallet</code> | The wallet to start challenge |
| [options] |  |  |

<a name="module_nahmii-sdk--Settlement+stopByOngoingChallenge"></a>

#### settlement.stopByOngoingChallenge(ongoingChallenge, wallet, [options]) ⇒ <code>Promise</code>
Stop an ongoing challenge.

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an transaction object.  

| Param | Type | Description |
| --- | --- | --- |
| ongoingChallenge | <code>OngoingChallenge</code> | The object stores the necessary parameters for stopping a settlement challenge. |
| wallet | <code>Wallet</code> | The wallet to stop challenge |
| [options] |  |  |

<a name="module_nahmii-sdk--Settlement+settleBySettleableChallenge"></a>

#### settlement.settleBySettleableChallenge(settleableChallenge, wallet, [options]) ⇒ <code>Promise</code>
Settle a qualified settlement based on the parameter object generated by #getSettleableChallenges.

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an transaction object.  

| Param | Type | Description |
| --- | --- | --- |
| settleableChallenge | <code>SettleableChallenge</code> | The object stores the necessary parameters for settling a qualified settlement challenge. |
| wallet | <code>Wallet</code> | The wallet to start challenge |
| [options] |  |  |

<a name="module_nahmii-sdk--Settlement+startChallenge"></a>

#### settlement.startChallenge(stageMonetaryAmount, wallet, [options]) ⇒ <code>Promise</code>
Start required settlement challenges based the intended stage amount for a currency.

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an array representing the started challenges, with the confirmed transaction object and intended stage amount accordingly.  

| Param | Type | Description |
| --- | --- | --- |
| stageMonetaryAmount | <code>MonetaryAmount</code> | The intended stage amount |
| wallet | <code>Wallet</code> | The nahmii wallet object |
| [options] |  |  |

<a name="module_nahmii-sdk--Settlement+stopChallenges"></a>

#### settlement.stopChallenges(wallet, ct, id, [options]) ⇒ <code>Promise</code>
Stop all ongoing challenges.

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an array representing the stopped challenges, with the confirmed transaction object and the challenge type.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The nahmii wallet object |
| ct | <code>Address</code> | The currency address |
| id | <code>Integer</code> | The currency id |
| [options] |  |  |

<a name="module_nahmii-sdk--Settlement+settle"></a>

#### settlement.settle(stageMonetaryAmount, wallet, [options]) ⇒ <code>Promise</code>
Settle the qualified challenges for a currency.

**Kind**: instance method of [<code>Settlement</code>](#exp_module_nahmii-sdk--Settlement)  
**Returns**: <code>Promise</code> - A promise that resolves into an array representing the settled challenges, with the confirmed transaction object and intended stage amount accordingly.  

| Param | Type | Description |
| --- | --- | --- |
| stageMonetaryAmount | <code>MonetaryAmount</code> | The intended stage amount |
| wallet | <code>Wallet</code> | The nahmii wallet object |
| [options] |  |  |

