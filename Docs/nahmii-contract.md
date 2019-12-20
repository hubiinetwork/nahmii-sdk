<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [NahmiiContract](#exp_module_nahmii-sdk--NahmiiContract) ⏏
        * [new NahmiiContract(contractName, walletOrProvider)](#new_module_nahmii-sdk--NahmiiContract_new)
        * [.from(contractName, walletOrProvider)](#module_nahmii-sdk--NahmiiContract.from) ⇒ <code>NahmiiContract</code> \| <code>null</code>

<a name="exp_module_nahmii-sdk--NahmiiContract"></a>

### NahmiiContract ⏏
NahmiiContract
A class providing access to the various nahmii contracts by name.
To validate that the constructed contract object actually matches a contract
officially in use by the nahmii cluster, use the `validate()` method.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--NahmiiContract_new"></a>

#### new NahmiiContract(contractName, walletOrProvider)
(Deprecated) Constructs a new contract wrapper instance by loading the correct ABIs
based on the name of the contract and the network that the provider or
wallet is connected to.


| Param | Type | Description |
| --- | --- | --- |
| contractName | <code>string</code> | Name of the nahmii contract to load |
| walletOrProvider | <code>NahmiiProvider</code> \| <code>Wallet</code> | Wallet or provider connected to nahmii cluster |

**Example**  
```js
const {NahmiiContract} = require('nahmii-sdk');
...
const niiContract = new NahmiiContract('NahmiiToken', nahmiiProvider);

if (await niiContract.validate()) {
    const balance = await niiContract.balanceOf(someWalletAddress);
}
else {
    throw new Error('Contract is not associated with the current cluster');
}
```
<a name="module_nahmii-sdk--NahmiiContract.from"></a>

#### NahmiiContract.from(contractName, walletOrProvider) ⇒ <code>NahmiiContract</code> \| <code>null</code>
Constructs a new contract wrapper instance by loading the correct ABIs
based on the name of the contract and the network that the provider or
wallet is connected to.

**Kind**: static method of [<code>NahmiiContract</code>](#exp_module_nahmii-sdk--NahmiiContract)  
**Returns**: <code>NahmiiContract</code> \| <code>null</code> - - Contract or null if contract could not be resolved  

| Param | Type | Description |
| --- | --- | --- |
| contractName | <code>string</code> | Name of the nahmii contract to load |
| walletOrProvider | <code>NahmiiProvider</code> \| <code>Wallet</code> | Wallet or provider connected to nahmii cluster |

