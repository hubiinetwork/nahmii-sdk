<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [NahmiiContract](#exp_module_nahmii-sdk--NahmiiContract) ⏏
        * [new NahmiiContract(contractName, walletOrProvider)](#new_module_nahmii-sdk--NahmiiContract_new)

<a name="exp_module_nahmii-sdk--NahmiiContract"></a>

### NahmiiContract ⏏
NahmiiContract
A class providing access to the various nahmii contracts by name.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--NahmiiContract_new"></a>

#### new NahmiiContract(contractName, walletOrProvider)
Constructs a new contract wrapper instance by loading the correct ABIs
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
const balance = await niiContract.balanceOf(someWalletAddress);
```
