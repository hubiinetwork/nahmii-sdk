<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [MonetaryAmount](#exp_module_nahmii-sdk--MonetaryAmount) ⏏
        * [new MonetaryAmount(amount, ct, [id])](#new_module_nahmii-sdk--MonetaryAmount_new)
        * _instance_
            * [.amount](#module_nahmii-sdk--MonetaryAmount+amount) ⇒ <code>BigNumber</code>
            * [.currency](#module_nahmii-sdk--MonetaryAmount+currency) ⇒ <code>Object</code>
            * [.toJSON()](#module_nahmii-sdk--MonetaryAmount+toJSON) ⇒ <code>Object</code>
        * _static_
            * [.from(jsonOrAmount, [ctOrUndefined], [idOrUndefined])](#module_nahmii-sdk--MonetaryAmount.from) ⇒ <code>MonetaryAmount</code> \| <code>null</code>

<a name="exp_module_nahmii-sdk--MonetaryAmount"></a>

### MonetaryAmount ⏏
MonetaryAmount
This class represent a monetary amount for a specific currency.
The class references the BigNumber implementation of ethers.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--MonetaryAmount_new"></a>

#### new MonetaryAmount(amount, ct, [id])
Constructs a new MonetaryAmount object.

**Throws**:

- <code>TypeError</code> - thrown if input arguments are unexpected.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| amount | <code>BigNumber</code> |  | the amount in base units (e.g. WEI). |
| ct | <code>EthereumAddress</code> |  | currency contract address of the amount. |
| [id] | <code>Integer</code> | <code>0</code> | positive number that identifies the currency item (0 for ERC20 tokens). Default is 0. |

**Example**  
```js
const {MonetaryAmount, Payment} = require('nahmii-sdk');

const one_hbt = MonetaryAmount.from('1000000000000000', '0xDd6C68bb32462e01705011a4e2Ad1a60740f217F', 0);
const payment = new Payment(provider, one_hbt, sender_address, recipient_address);
```
<a name="module_nahmii-sdk--MonetaryAmount+amount"></a>

#### monetaryAmount.amount ⇒ <code>BigNumber</code>
Returns the currency amount in base units (e.g. WEI).

**Kind**: instance property of [<code>MonetaryAmount</code>](#exp_module_nahmii-sdk--MonetaryAmount)  
**Returns**: <code>BigNumber</code> - - currency amount.  
<a name="module_nahmii-sdk--MonetaryAmount+currency"></a>

#### monetaryAmount.currency ⇒ <code>Object</code>
Returns an object with the currency address (ct) and currency identifier (id).

**Kind**: instance property of [<code>MonetaryAmount</code>](#exp_module_nahmii-sdk--MonetaryAmount)  
**Returns**: <code>Object</code> - - currency information.  
<a name="module_nahmii-sdk--MonetaryAmount+toJSON"></a>

#### monetaryAmount.toJSON() ⇒ <code>Object</code>
Converts the monetary amount into a JSON object.

**Kind**: instance method of [<code>MonetaryAmount</code>](#exp_module_nahmii-sdk--MonetaryAmount)  
**Returns**: <code>Object</code> - - A JSON object that is in the format that nahmii APIs expects.  
<a name="module_nahmii-sdk--MonetaryAmount.from"></a>

#### MonetaryAmount.from(jsonOrAmount, [ctOrUndefined], [idOrUndefined]) ⇒ <code>MonetaryAmount</code> \| <code>null</code>
Factory/de-serializing method

**Kind**: static method of [<code>MonetaryAmount</code>](#exp_module_nahmii-sdk--MonetaryAmount)  
**Returns**: <code>MonetaryAmount</code> \| <code>null</code> - - a new instance, or null if parsing fails.  

| Param | Type | Description |
| --- | --- | --- |
| jsonOrAmount | <code>Object</code> \| <code>BigNumber</code> \| <code>String</code> \| <code>Integer</code> | either a JSON object that can be de-serialized to a MonetaryAmount instance, or a currency amount. |
| [ctOrUndefined] | <code>EthereumAddress</code> \| <code>String</code> | currency contract address. Exclusive with JSON as first argument. |
| [idOrUndefined] | <code>String</code> \| <code>Integer</code> | positive number that identifies the currency item (0 for ERC20 tokens). Exclusive with JSON as first argument. |

