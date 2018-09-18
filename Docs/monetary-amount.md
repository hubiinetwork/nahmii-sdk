<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [MonetaryAmount](#exp_module_nahmii-sdk--MonetaryAmount) ⏏
        * [new MonetaryAmount(amount, type, id)](#new_module_nahmii-sdk--MonetaryAmount_new)
        * _instance_
            * [.toJSON()](#module_nahmii-sdk--MonetaryAmount+toJSON) ⇒
        * _static_
            * [.from(json)](#module_nahmii-sdk--MonetaryAmount.from) ⇒ <code>MonetaryAmount</code> \| <code>null</code>

<a name="exp_module_nahmii-sdk--MonetaryAmount"></a>

### MonetaryAmount ⏏
MonetaryAmount
This class represent a monetary amount for a specific currency.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--MonetaryAmount_new"></a>

#### new MonetaryAmount(amount, type, id)
Constructs a new MonetaryAmount object.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| amount | <code>String</code> \| <code>BigNumber</code> |  | a string or BigNumber denoting the amount in base units (e.g. WEI) |
| type | <code>String</code> |  | hexadecimal string with the type of currency |
| id | <code>Integer</code> | <code>0</code> | number with the item identified (0 for ERC20 tokens) |

**Example**  
```js
const {MonetaryAmount, Payment} = require('nahmii-sdk');

const one_hbt = new MonetaryAmount('1000000000000000', '0xDd6C68bb32462e01705011a4e2Ad1a60740f217F', 0);
const payment = new Payment(provider, one_hbt, sender_address, recipient_address);
```
<a name="module_nahmii-sdk--MonetaryAmount+toJSON"></a>

#### monetaryAmount.toJSON() ⇒
Converts the monetary amount into a JSON object

**Kind**: instance method of [<code>MonetaryAmount</code>](#exp_module_nahmii-sdk--MonetaryAmount)  
**Returns**: A JSON object that is in the format that the API expects  
<a name="module_nahmii-sdk--MonetaryAmount.from"></a>

#### MonetaryAmount.from(json) ⇒ <code>MonetaryAmount</code> \| <code>null</code>
Factory/de-serializing method

**Kind**: static method of [<code>MonetaryAmount</code>](#exp_module_nahmii-sdk--MonetaryAmount)  
**Returns**: <code>MonetaryAmount</code> \| <code>null</code> - A new instance or null if parsing failure  

| Param | Description |
| --- | --- |
| json | A JSON object that can be de-serialized to a MonetaryAmount instance |

