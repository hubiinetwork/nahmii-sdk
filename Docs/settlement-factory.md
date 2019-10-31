<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [SettlementFactory](#exp_module_nahmii-sdk--SettlementFactory) ⏏
        * [new SettlementFactory(provider)](#new_module_nahmii-sdk--SettlementFactory_new)
        * [.calculateRequiredSettlements(address, stageMonetaryAmount)](#module_nahmii-sdk--SettlementFactory+calculateRequiredSettlements) ⇒ <code>Promise</code>
        * [.getAllSettlements(address, ct)](#module_nahmii-sdk--SettlementFactory+getAllSettlements) ⇒ <code>Promise</code>

<a name="exp_module_nahmii-sdk--SettlementFactory"></a>

### SettlementFactory ⏏
SettlementFactory
A class for creating settlement objects.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--SettlementFactory_new"></a>

#### new SettlementFactory(provider)
Constructor


| Param | Type | Description |
| --- | --- | --- |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

<a name="module_nahmii-sdk--SettlementFactory+calculateRequiredSettlements"></a>

#### settlementFactory.calculateRequiredSettlements(address, stageMonetaryAmount) ⇒ <code>Promise</code>
Calculates and returns the required settlements based on the intended stage amount

**Kind**: instance method of [<code>SettlementFactory</code>](#exp_module_nahmii-sdk--SettlementFactory)  
**Returns**: <code>Promise</code> - A promise that resolves into an array containing the required settlement instances to start with.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>EthereumAddress</code> \| <code>string</code> | The ethereum address |
| stageMonetaryAmount | <code>MonetaryAmount</code> | The intended stage amount in a currency |

<a name="module_nahmii-sdk--SettlementFactory+getAllSettlements"></a>

#### settlementFactory.getAllSettlements(address, ct) ⇒ <code>Promise</code>
Returns the existing settlements under a wallet/currency pair

**Kind**: instance method of [<code>SettlementFactory</code>](#exp_module_nahmii-sdk--SettlementFactory)  
**Returns**: <code>Promise</code> - A promise that resolves into an array containing the settlement instances.  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>EthereumAddress</code> \| <code>string</code> | The ethereum address |
| ct | <code>EthereumAddress</code> \| <code>string</code> | The currency address |

