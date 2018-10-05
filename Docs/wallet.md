<a name="module_nahmii-sdk"></a>

## nahmii-sdk

- [nahmii-sdk](#nahmii-sdk)
    - [Wallet ⏏](#wallet-%E2%8F%8F)
        - [new Wallet(signer, provider)](#new-walletsigner-provider)
        - [wallet.getNahmiiBalance() ⇒ <code>Promise</code>](#walletgetnahmiibalance-%E2%87%92-codepromisecode)
        - [wallet.depositEth(amountEth, [options]) ⇒ <code>Promise</code>](#walletdepositethamounteth-options-%E2%87%92-codepromisecode)
        - [wallet.depositToken(amount, symbol, [options]) ⇒ <code>Promise</code>](#walletdeposittokenamount-symbol-options-%E2%87%92-codepromisecode)

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
- {function} signTransaction - Takes a transaction as input and returns the same transaction signed as a hex string
- {string} address - The address to use. Must be able to derive from the private key used in the signing functions



| Param | Type | Description |
| --- | --- | --- |
| signer | <code>string or object</code> | A private key, or object containing custom parameters |
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
import TrezorConnect from 'trezor-connect';

const path = "m/44'/60'/0'/0/0";
const getAddress = async () => await TrezorConnect.ethereumGetAddress({ path });
const signMessage = async (message) => await TrezorConnect.ethereumSignMessage({
    path,
    message
});
const signTransaction = async (transaction) => await TrezorConnect.ethereumSignTransaction({
    path,
    transaction
});

const trezorWallet = new Wallet(
  {
    address: getAddress(),
    signMessage,
    signTransaction
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
Deposits ETH from the on-chain balance of the wallet to nahmii.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into a transaction receipt.  
**See**: https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts  

| Param | Type | Description |
| --- | --- | --- |
| amountEth | <code>number</code> \| <code>string</code> | The amount of ETH to deposit. |
| [options] |  |  |

**Example**  
```js
let receipt = await wallet.depositEth('1.1', {gasLimit: 200000});
```
<a name="module_nahmii-sdk--Wallet+depositToken"></a>

#### wallet.depositToken(amount, symbol, [options]) ⇒ <code>Promise</code>
Deposits a token from the on-chain balance of the wallet to nahmii.

**Kind**: instance method of [<code>Wallet</code>](#exp_module_nahmii-sdk--Wallet)  
**Returns**: <code>Promise</code> - A promise that resolves into an array of transaction receipts.  
**See**: https://docs.ethers.io/ethers.js/html/api-providers.html#transaction-receipts  

| Param | Type | Description |
| --- | --- | --- |
| amount | <code>number</code> \| <code>string</code> | The amount of currency to deposit. |
| symbol | <code>string</code> | The currency symbol |
| [options] |  |  |

**Example**  
```js
let receipts = await wallet.depositToken('1.1', 'TT1', {gasLimit: 200000});
```
