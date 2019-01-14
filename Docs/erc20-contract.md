<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [Erc20Contract](#exp_module_nahmii-sdk--Erc20Contract) ⏏
        * [new Erc20Contract(contractAddress, walletOrProvider, decimals)](#new_module_nahmii-sdk--Erc20Contract_new)
        * _instance_
            * [.parse(string)](#module_nahmii-sdk--Erc20Contract+parse) ⇒ <code>BigNumber</code>
        * _static_
            * [.from(symbol, walletOrProvider)](#module_nahmii-sdk--Erc20Contract.from) ⇒ <code>Promise.&lt;Erc20Contract&gt;</code>

<a name="exp_module_nahmii-sdk--Erc20Contract"></a>

### Erc20Contract ⏏
Erc20Contract
A class for performing various operations on an ERC20 contract.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--Erc20Contract_new"></a>

#### new Erc20Contract(contractAddress, walletOrProvider, decimals)
Construct a new ERC20 contract wrapper


| Param | Type | Description |
| --- | --- | --- |
| contractAddress | <code>string</code> | Address of ERC20 contract |
| walletOrProvider | <code>Wallet</code> \| <code>NahmiiProvider</code> | A nahmii wallet or provider |
| decimals | <code>number</code> | Number of decimals for the token |

<a name="module_nahmii-sdk--Erc20Contract+parse"></a>

#### erc20Contract.parse(string) ⇒ <code>BigNumber</code>
Parses a string to a BigNumber, taking into account the number of
decimals for this specific token.

**Kind**: instance method of [<code>Erc20Contract</code>](#exp_module_nahmii-sdk--Erc20Contract)  
**Returns**: <code>BigNumber</code> - - A big number representation of the input value  

| Param | Type | Description |
| --- | --- | --- |
| string | <code>string</code> | String to parse |

<a name="module_nahmii-sdk--Erc20Contract.from"></a>

#### Erc20Contract.from(symbol, walletOrProvider) ⇒ <code>Promise.&lt;Erc20Contract&gt;</code>
Factory method for creating a new ERC20 wrapper instance from a symbol.

**Kind**: static method of [<code>Erc20Contract</code>](#exp_module_nahmii-sdk--Erc20Contract)  

| Param | Type | Description |
| --- | --- | --- |
| symbol | <code>string</code> | The symbol of the supported token |
| walletOrProvider | <code>Wallet</code> \| <code>NahmiiProvider</code> | A nahmii wallet or provider |

