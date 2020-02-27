<a name="module_nahmii-sdk"></a>

## FeesClaimant
FeesClaimant
A class for the claiming and withdrawal of accrued fees

**Kind**: global class  

* [FeesClaimant](#module_nahmii-sdk)
    * [.claimableFeesForAccruals(wallet, currency, startAccrual, endAccrual)](#module_nahmii-sdk+claimableFeesForAccruals) ⇒ <code>Promise</code>
    * [.claimFeesForAccruals(wallet, currency, startAccrual, endAccrual, [options])](#module_nahmii-sdk+claimFeesForAccruals) ⇒ <code>Promise</code>
    * [.claimableFeesForBlocks(wallet, currency, startBlock, endBlock)](#module_nahmii-sdk+claimableFeesForBlocks) ⇒ <code>Promise</code>
    * [.claimFeesForBlocks(wallet, currency, startBlock, endBlock, [options])](#module_nahmii-sdk+claimFeesForBlocks) ⇒ <code>Promise</code>
    * [.withdrawableFees(wallet, currency)](#module_nahmii-sdk+withdrawableFees) ⇒ <code>Promise</code>
    * [.withdrawFees(wallet, monetaryAmount, [options])](#module_nahmii-sdk+withdrawFees) ⇒ <code>Promise</code>

<a name="module_nahmii-sdk+claimableFeesForAccruals"></a>

### feesClaimant.claimableFeesForAccruals(wallet, currency, startAccrual, endAccrual) ⇒ <code>Promise</code>
Get claimable amount of fees for a span of accruals

**Kind**: instance method of [<code>FeesClaimant</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into a BigNumber value representing the claimable amount of fees.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The claimer nahmii wallet |
| currency | <code>Currency</code> | The currency |
| startAccrual | <code>number</code> | The lower accrual index boundary |
| endAccrual | <code>number</code> | The upper accrual index boundary |

<a name="module_nahmii-sdk+claimFeesForAccruals"></a>

### feesClaimant.claimFeesForAccruals(wallet, currency, startAccrual, endAccrual, [options]) ⇒ <code>Promise</code>
Claim fees for a span of accruals

**Kind**: instance method of [<code>FeesClaimant</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into a record that contains the transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The claimer nahmii wallet |
| currency | <code>Currency</code> | The currency |
| startAccrual | <code>number</code> | The lower accrual index boundary |
| endAccrual | <code>number</code> | The upper accrual index boundary |
| [options] |  | An optional object containing the parameters for gasLimit and gasPrice |

<a name="module_nahmii-sdk+claimableFeesForBlocks"></a>

### feesClaimant.claimableFeesForBlocks(wallet, currency, startBlock, endBlock) ⇒ <code>Promise</code>
Get claimable amount of fees for a span of block numbers

**Kind**: instance method of [<code>FeesClaimant</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into a BigNumber value representing the claimable amount of fees.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The claimer nahmii wallet |
| currency | <code>Currency</code> | The currency |
| startBlock | <code>number</code> | The lower block number boundary |
| endBlock | <code>number</code> | The upper block number boundary |

<a name="module_nahmii-sdk+claimFeesForBlocks"></a>

### feesClaimant.claimFeesForBlocks(wallet, currency, startBlock, endBlock, [options]) ⇒ <code>Promise</code>
Claim fees for a span of block numbers

**Kind**: instance method of [<code>FeesClaimant</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into a record that contains the transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The claimer nahmii wallet |
| currency | <code>Currency</code> | The currency |
| startBlock | <code>number</code> | The lower block number boundary |
| endBlock | <code>number</code> | The upper block number boundary |
| [options] |  | An optional object containing the parameters for gasLimit and gasPrice |

<a name="module_nahmii-sdk+withdrawableFees"></a>

### feesClaimant.withdrawableFees(wallet, currency) ⇒ <code>Promise</code>
Get the withdrawable amount of fees

**Kind**: instance method of [<code>FeesClaimant</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into a BigNumber value representing the withdrawable amount of fees.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The claimer nahmii wallet |
| currency | <code>Currency</code> | The currency |

<a name="module_nahmii-sdk+withdrawFees"></a>

### feesClaimant.withdrawFees(wallet, monetaryAmount, [options]) ⇒ <code>Promise</code>
Withdraw the given amount of fees

**Kind**: instance method of [<code>FeesClaimant</code>](#module_nahmii-sdk)  
**Returns**: <code>Promise</code> - A promise that resolves into a record that contains the transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| wallet | <code>Wallet</code> | The claimer nahmii wallet |
| monetaryAmount | <code>MonetaryAmount</code> | The monetary amount |
| [options] |  | An optional object containing the parameters for gasLimit and gasPrice |
