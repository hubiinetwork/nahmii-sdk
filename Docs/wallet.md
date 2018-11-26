<a name="module_nahmii-sdk"></a>

## nahmii-sdk

* [nahmii-sdk](#module_nahmii-sdk)
    * [Wallet](#exp_module_nahmii-sdk--Wallet) ⏏
        * [new Wallet(signer, provider)](#new_module_nahmii-sdk--Wallet_new)
        * [.getNahmiiBalance()](#module_nahmii-sdk--Wallet+getNahmiiBalance) ⇒ <code>Promise</code>
        * [.depositEth(amountEth, [options])](#module_nahmii-sdk--Wallet+depositEth) ⇒ <code>Promise</code>
        * [.approveTokenDeposit(amount, symbol, [options])](#module_nahmii-sdk--Wallet+approveTokenDeposit) ⇒ <code>Promise</code>
        * [.completeTokenDeposit(amount, symbol, [options])](#module_nahmii-sdk--Wallet+completeTokenDeposit) ⇒ <code>Promise</code>

<a name="exp_module_nahmii-sdk--Wallet"></a>

### Wallet ⏏
Wallet
A class for performing various operations on a wallet.

**Kind**: Exported class  
<a name="new_module_nahmii-sdk--Wallet_new"></a>

#### new Wallet(signer, provider)

Create a Wallet from a private key or custom address and signing parameters.

Use a private key to initialize a software wallet, and custom parameters to initialize a hardware wallet.

The custom parameters are

- {function} signMessage - Takes a string as input and returns a flat format Ethereum signature
- {function} signTransaction - Takes a transaction as input and returns the same transaction signed as a hex string. The input may contain unresolved values, so it's important to wait for them to resolve with `ethers.utils.resolveProperties(tx);` before performing any logic.
- {string} address - The address to use. Must be able to derive from the private key used in the signing functions



| Param | Type | Description |
| --- | --- | --- |
| signer | <code>string</code> or <code>object</code> | A private key, or object containing custom parameters |
| provider | <code>NahmiiProvider</code> | A NahmiiProvider instance |

**Wallet from private key example**
```js
const privateKey = '0x9616c2ab6330c7fda535042c120b55d992fa8c2c2a3d82603ea043aeb09ff411';
const provider = new NahmiiProvider(...);
const softwareWallet = new Wallet(privateKey, provider);
```

**Wallet from Ledger Nano S example**
```js
import Transport from '@ledgerhq/hw-transport-node-hid';
import LedgerEth from '@ledgerhq/hw-app-eth';

const signMessage = async message => {
  const transport = await Transport.create();
  const eth = new LedgerEth(transport);

  if (typeof message === "string") {
    message = ethers.utils.toUtf8Bytes(message);
  }
  let messageHex = ethers.utils.hexlify(message).substring(2);
  return eth.signPersonalMessage("m/44'/60'/0'/0", messageHex).then(signature => {
    signature.r = "0x" + signature.r;
    signature.s = "0x" + signature.s;
    return ethers.utils.joinSignature(signature);
  });
};

const signTransaction = async unresolvedTx => {
  const transport = await Transport.create();
  const eth = new LedgerEth(transport);

  const tx = await ethers.utils.resolveProperties(unresolvedTx);
  const serializedTx = ethers.utils.serializeTransaction(tx);
  const sig = await eth.signTransaction("m/44'/60'/0'/0", serializedTx.substring(2));
  sig.r = '0x' + sig.r;
  sig.s = '0x' + sig.s;
  return ethers.utils.serializeTransaction(tx, sig);
};

const transport = await Transport.create();
const eth = new LedgerEth(transport);
const ledgerWallet = new Wallet(
  {
    address: await eth.getAddress("m/44'/60'/0'/0"),
    signMessage,
    signTransaction
  },
  new NahmiiProvider(...)
);
```

**Wallet from Trezor example**

```js
import trezor from 'trezor.js';

const getAddress = async () => {
  const deviceList = new trezor.DeviceList();
  const { session } = await deviceList.acquireFirstDevice();
  return await session.ethereumGetAddress([0]);
}

const signMessage = async (message) => {
  const deviceList = new trezor.DeviceList();
  const { session } = await deviceList.acquireFirstDevice();

  if (typeof message === "string") {
    message = ethers.utils.toUtf8Bytes(message);
  }
  let messageHex = ethers.utils.hexlify(message).substring(2);
  return await session.signEthMessage([0], messageHex);
}

const signTransaction = async (unresolvedTx) => {
  const deviceList = new trezor.DeviceList();
  const { session } = await deviceList.acquireFirstDevice();

  const tx = await ethers.utils.resolveProperties(unresolvedTx);

  // Trezor requires all params excluding chainId to be even len hex strings without a 0x prefix
  const trezorTx = {...tx};
  Object.keys(tx).map(k => {
    let val = tx[k];
    if (k === 'chainId') return;
    val = ethers.utils.hexlify(val); // transform into hex
    val = val.substring(2); // remove 0x prefix
    val = (val.length % 2) ? '0' + val : val; // pad with a leading 0 if uneven
    trezorTx[k] = val;
  });

  const sig = await session.signEthTx(
    [0],
    trezorTx.nonce,
    trezorTx.gasPrice,
    trezorTx.gasLimit,
    trezorTx.to,
    trezorTx.value,
    null,
    trezorTx.chainId
  );
  sig.r = '0x' + sig.r;
  sig.s = '0x' + sig.s;

  return ethers.utils.serializeTransaction(tx, sig);
}

const trezorWallet = new Wallet(
  {
    address: await getAddress(),
    signMessage: signMessage,
    signTransaction: signTransaction
  },
  new NahmiiProvider(...)
);
```

<a name="module_nahmii-sdk--Wallet+getNahmiiBalance"></a>

#### wallet.getNahmiiBalance() ⇒ <code>Promise</code>
Retrieves nahmii balance for current wallet.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a mapping from symbol to human readable amount.  
<a name="module_nahmii-sdk--Wallet+depositEth"></a>

#### wallet.depositEth(amountEth, [options]) ⇒ <code>Promise</code>
Initiates the deposit of ETH from the on-chain balance of the wallet to nahmii.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| amountEth | <code>number</code> \| <code>string</code> | The amount of ETH to deposit. |
| [options] |  |  |

**Example**  
```js
let depositTxHash = await wallet.depositEth('1.1', {gasLimit: 200000});
```
<a name="module_nahmii-sdk--Wallet+approveTokenDeposit"></a>

#### wallet.approveTokenDeposit(amount, symbol, [options]) ⇒ <code>Promise</code>
Initiates the deposit of a token from a wallet's the on-chain balance to nahmii by calling the approve method of the token smart contract.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a transaction hash.  

| Param | Type | Description |
| --- | --- | --- |
| amount | <code>number</code> \| <code>string</code> | The amount of currency to deposit. |
| symbol | <code>string</code> | The currency symbol |
| [options] |  |  |

**Example**  
```js
let approveTxHash = await wallet.approveTokenDeposit('1.1', 'TT1', {gasLimit: 200000});
```
<a name="module_nahmii-sdk--Wallet+completeTokenDeposit"></a>

#### wallet.completeTokenDeposit(amount, symbol, [options]) ⇒ <code>Promise</code>
Initiates the completion of a deposit of a token from a wallet's on-chain balance to nahmii by calling the depositTokens method of the nahmii clientFund smart contract. Requires approveTokenDeposit to have been called first.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a transaction hash.

| Param | Type | Description |
| --- | --- | --- |
| amount | <code>number</code> \| <code>string</code> | The amount of currency to deposit. |
| symbol | <code>string</code> | The currency symbol |
| [options] |  |  |

**Example**  
```js
let depositTokensTxHash = await wallet.completeTokenDeposit('1.1', 'TT1', {gasLimit: 200000});
```
