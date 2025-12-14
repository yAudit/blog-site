---
title: From a failing test to calling SEAL911
subtitle: A small detail influencing major cryptographic libraries
gh-repo: yaudit/blog-site
tags: [cryptography, RFC6979]
author: Oba
twitter: https://x.com/obatirou
date: 2025-01-14
---

# From a failing test to calling SEAL911

_This article assumes knowledge of ECDSA and familiarity with RFC6979 (see [ecdsa section from the cryptobook](https://cryptobook.nakov.com/digital-signatures/ecdsa-sign-verify-messages) and [rfc6979](https://datatracker.ietf.org/doc/html/rfc6979)). This is also my first long-form post. Any feedback will be hugely appreciated. A huge thank you to [merkleplant](http://merkleplant.xyz/) for the support during the investigation and during the writing of this article._  
**\*TLDR**: go directly to the [PoC repository](https://github.com/obatirou/RFC6979-implementation-analysis), there is everything you need to understand the issue and the outcome.\*

## Contributing To crysol

In my free time, I like to learn about cryptography and zero knowledge. I decided to not stay in theory and wanted to contribute to an open source repository. I found [crysol](https://github.com/verklegarden/crysol) by [merkleplant](http://merkleplant.xyz/) (go follow and contribute). It is a secp256k1 elliptic curve cryptography library in pure Solidity. I thought it was fun. I chose [an issue](https://github.com/verklegarden/crysol/issues/23) and got to work. Let's take something simple to begin with, improving tests: _Add test vectors from Paul Miller's noble-curves_.

For context, [noble-curves](https://github.com/paulmillr/noble-curves) is an audited & minimal JS implementation of elliptic curve cryptography. This library is widely used with projects such as Metamask depending on it. This can be considered as a reference implementation. It makes sense to use the test vectors from this repo to ensure `crysol` has the right behavior. It seemed perfect, the tags were _effort low_ and _good first issue_. The first part was indeed simple, not low effort due to edge cases but everything went well. I added the test vectors for point validity and de/encoding which [led to catching a bug](https://github.com/verklegarden/crysol/pull/32). Confident, I went for the second part: adding the ECDSA signatures vectors. This is where I fell in a rabbit hole.

## The Failing Test

The idea of the issue is that valid `noble-curves` signatures should also be valid when verified with `crysol` which uses [foundry](https://github.com/foundry-rs/foundry)'s vm capabilities under the hood for signature generation. Both `noble-curves` and `foundry` follow RFC6979 which defines a deterministic nonce derivation procedure, ensuring that signatures for the same input are identical. Particularly, signatures from the same private key for the same message should be identical in both implementations. Now, how to verify `noble-curves` signatures with `crysol`?

The encoding of `noble-curves` test vectors is specific: the recovery bit is not serialized into the compact or [DER format](https://wiki.openssl.org/index.php/DER) (look at the [small comment in README.md](https://github.com/paulmillr/noble-curves/tree/main?tab=readme-ov-file#ecdsa-public-key-recovery--extra-entropy)).
There are 4 fields:

- `description`: no need for this one, we will remove it
- `d`: the private key
- `m`: the message hash
- `signature`: the deterministic signature from the private key over the message

```json
{
  "description": "Everything should be made as simple as possible, but not simpler.",
  "d": "0000000000000000000000000000000000000000000000000000000000000001",
  "m": "06ef2b193b83b3d701f765f1db34672ab84897e1252343cc2197829af3a30456",
  "signature": "33a69cd2065432a30f3d1ce4eb0d59b8ab58c74f27c41a7fdb5696ad4e6108c96f807982866f785d3f6418d24163ddae117b7db4d5fdf0071de069fa54342262"
}
```

Signatures from the test vectors are in compact format, meaning the signature consists of only the `r` and `s` fields ([link to code](https://github.com/paulmillr/noble-curves/blob/1db569a52474ea94d6ec06fbe5321d17395ca255/test/secp256k1.test.js#L210)).

```jsx
describe('sign()', () => {
    should('create deterministic signatures with RFC 6979', () => {
      for (const vector of ecdsa.valid) {
        let usig = secp.sign(vector.m, vector.d);
        let sig = usig.toCompactHex();
        const vsig = vector.signature;
        deepStrictEqual(sig.slice(0, 64), vsig.slice(0, 64));
        deepStrictEqual(sig.slice(64, 128), vsig.slice(64, 128));
      }
    });
 ...
}
```

`crysol` provides libraries and types to easily implement an ECDSA signature functionality in solidity. The method we are interested in is `signRaw` which allows to generate an ECDSA signature using a secret key `sk` over a message `m`. Internally, it invokes `foundry`'s vm ([link to code](https://github.com/verklegarden/crysol/blob/6b36e08ba253c6e5c0a2e0afc7a0841fad0dbbad/offchain/signatures/ECDSAOffchain.sol#L85)).

```solidity
 function signRaw(SecretKey sk, bytes32 m)
        internal
        pure
        returns (Signature memory)
    {
        if (!sk.isValid()) {
            revert("SecretKeyInvalid()");
        }

        // Note that foundry's vm uses RFC-6979 for nonce derivation, ie
        // signatures are deterministic.
        uint8 v;
        bytes32 r;
        bytes32 s;
        (v, r, s) = vm.sign(sk.asUint(), m);

        Signature memory sig = Signature(v, r, s);
        // assert(!sig.isMalleable());

        return sig;
    }
```

So, if both implementations follow the RFC6979, then `r`, `s` and `v` should be equal for any `(messageHash, privateKey)` instance. As we do not have access to the `v` value in the test vectors, I ran `crysol`'s `signRaw` function on every `(messageHash, privateKey)` to retrieve `r`, `s` and `v`, verifying that the resulting `r` and `s` match those from `noble-curves`. Then, the only thing to do is to ensure the signatures are valid with the [verify function](https://github.com/verklegarden/crysol/blob/main/src/signatures/ECDSA.sol#L94-L104).

```solidity
// Parse the values from the test vector
uint256 parsedD = vm.parseUint(c.d);
bytes32 parsedM = vm.parseBytes32(c.m);
...
bytes memory parsedSignature = vm.parseBytes(c.signature);
// Retrieve r and s from noble curves
(bytes32 r, bytes32 s) = abi.decode(parsedSignature, (bytes32, bytes32));
// Sign the message with foundry with the secret key parsed
SecretKey sk = Secp256k1.secretKeyFromUint(abi.decode(parsedD, (uint)));
Signature memory signed = sk.signRaw(parsedM);
// ensure r, s are equal
assertEq(r, signed.r);
assertEq(s, signed.s);
// Verify signature from foundry which contains the v value
PublicKey memory pk = sk.toPublicKey();
assertTrue(verify(pk, parsedM, signed));
```

This should work as expected, right?
While iterating over all 2019 vectors, 3 did not output the same `r` and `s`. Yet, they are both valid signatures! I could not understand how the signatures could be different if they both follow the same RFC6979.
Here are the 3 vectors:

```rust
(
    hex!("0000000000000000000000000000000000000000000000000000000000000001"), // privateKey
    hex!("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"), // msgHash
),
(
    hex!("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140"),
    hex!("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
),
(
    hex!("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140"),
    hex!("fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141"),
)
```

## The Rabbit Hole

I began to form hypotheses:

- At what step does the problem arise during signature generation?
- Is there a problem in `crysol`?
  `foundry` is doing the signature. Is the problem in `foundry` then?
- Is there a problem in `noble-curves`?
  The codebase is pretty complex and we will need to dive in.

Although both signatures passed the test and were considered valid by `crysol`, the fact remains that the signatures are different for the same message and private key. My gut feeling pushed me to look into the nonce `k` generation.

### ECDSA and RFC6979

In ECDSA, a signature `(r, s)` is mostly a random point `R` on the curve that is derived from the private key and a message hash. To generate this random point, you first generate a random number `k` in the range `[1, n - 1]`, `n` being the curve order, and multiply that by `G`, the generator.
`k * G` would will give you `R` which is the random point. You take its x coordinates and get `r`.

This `k` is the main actor in RFC6979.

The [documentation](https://datatracker.ietf.org/doc/html/rfc6979) explains how to generate it deterministically. If an implementation deviates from the RFC6979, it will generate different points, and as a result, different signatures compared to other implementations. We need to ensure there is no problem in the generation of `k`. To address this, we will dive into different implementations to compare how this `k` is generated.

### Foundry and RustCrypto

`foundry` provides cheatcodes to sign messages via ECDSA. Let's look at the [sign cheatcode](https://github.com/foundry-rs/foundry/blob/41b4359973235c37227a1d485cdb71dc56959b8b/crates/cheatcodes/src/crypto.rs#L239):

```rust
fn sign(private_key: &U256, digest: &B256) -> Result<alloy_primitives::PrimitiveSignature> {
    // The `ecrecover` precompile does not use EIP-155. No chain ID is needed.
    let wallet = parse_wallet(private_key)?;
    let sig = wallet.sign_hash_sync(digest)?;
    debug_assert_eq!(sig.recover_address_from_prehash(digest)?, wallet.address());
    Ok(sig)
}
```

So, what is this `wallet` and what is the `sign_hash_sync` method?
I would recommend to use VSCode with the rust analyzer plugin to study the code. Here is a summary: the wallet is an [alloy](https://github.com/alloy-rs/alloy) `LocalSigner<ecdsa::SigningKey<k256::Secp256k1>>`. The `alloy` function [sign_hash_sync](https://github.com/alloy-rs/alloy/blob/4632a88d60b5615ed021770fa30dfa6643d75cee/crates/signer-local/src/lib.rs#L121) calls the `sign_prehash` function of the`ecdsa` package from [RustCrypto](https://github.com/RustCrypto/signatures). We can check how `ecdsa` is implemented in [sign_prehash](https://github.com/RustCrypto/signatures/blob/89232d6a962a199fd8211a117db74408353e4383/ecdsa/src/signing.rs#L158) function (keeping in mind `secp256k1` curve particularly):

```rust
/// Sign message prehash using a deterministic ephemeral scalar (`k`)
/// computed using the algorithm described in [RFC6979 § 3.2].
///
/// [RFC6979 § 3.2]: <https://tools.ietf.org/html/rfc6979#section-3>
impl<C> PrehashSigner<Signature<C>> for SigningKey<C>
where
    C: PrimeCurve + CurveArithmetic + DigestPrimitive,
    Scalar<C>: Invert<Output = CtOption<Scalar<C>>> + SignPrimitive<C>,
    SignatureSize<C>: ArrayLength<u8>,
{
    fn sign_prehash(&self, prehash: &[u8]) -> Result<Signature<C>> {
        let z = bits2field::<C>(prehash)?;
        Ok(self
            .secret_scalar
            .try_sign_prehashed_rfc6979::<C::Digest>(&z, &[])?
            .0)
    }
}
```

Ok. Let's go a level deeper by looking at [try_sign_prehashed_rfc6979](https://github.com/RustCrypto/signatures/blob/89232d6a962a199fd8211a117db74408353e4383/ecdsa/src/hazmat.rs#L94)

```rust
 fn try_sign_prehashed_rfc6979<D>(
        &self,
        z: &FieldBytes<C>,
        ad: &[u8],
    ) -> Result<(Signature<C>, Option<RecoveryId>)>
    where
        Self: From<ScalarPrimitive<C>> + Invert<Output = CtOption<Self>>,
        D: Digest + BlockSizeUser + FixedOutput<OutputSize = FieldBytesSize<C>> + FixedOutputReset,
    {
        let k = Scalar::<C>::from_repr(rfc6979::generate_k::<D, _>(
            &self.to_repr(),
            &C::ORDER.encode_field_bytes(),
            z,
            ad,
        ))
        .unwrap();

        self.try_sign_prehashed::<Self>(k, z)
    }
```

Nice, we found the `k` generation which has [rfc6979](https://github.com/RustCrypto/signatures/tree/ecdsa/v0.16.9/rfc6979) crate as a dependency:

```rust
pub fn generate_k<D, N>(
    x: &Array<u8, N>,
    q: &Array<u8, N>,
    h: &Array<u8, N>,
    data: &[u8],
) -> Array<u8, N>
where
    D: Digest + BlockSizeUser + FixedOutput + FixedOutputReset,
    N: ArraySize,
{
    let mut k = Array::default();
    generate_k_mut::<D>(x, q, h, data, &mut k);
    k
}

pub fn generate_k_mut<D>(x: &[u8], q: &[u8], h: &[u8], data: &[u8], k: &mut [u8])
where
    D: Digest + BlockSizeUser + FixedOutput + FixedOutputReset,
{
    let k_len = k.len();
    assert_eq!(k_len, x.len());
    assert_eq!(k_len, q.len());
    assert_eq!(k_len, h.len());
    debug_assert!(bool::from(ct::lt(h, q)));

    let q_leading_zeros = ct::leading_zeros(q);
    let q_has_leading_zeros = q_leading_zeros != 0;
    let mut hmac_drbg = HmacDrbg::<D>::new(x, h, data);

    loop {
        hmac_drbg.fill_bytes(k);

        if q_has_leading_zeros {
            ct::rshift(k, q_leading_zeros);
        }

        if (!ct::is_zero(k) & ct::lt(k, q)).into() {
            return;
        }
    }
}
```

Ok, that's great, we now know which function is called to generate `k` in `foundry`. Let's find how `noble-curves` is implementing this function and compare both implementations.

### Noble Curves

This implementation is more complex. Recall that the `secp256k1` curve equation is $y² = x³ + 7.$ In fact, it is expressed in an equation type called short Weierstrass equation $y^2 = x^3 + ax + b$ (see [safecurves](https://safecurves.cr.yp.to/equation.html)).

In `noble-curves`, there is an abstraction for this form. We can [see how it is instantiated](https://github.com/paulmillr/noble-curves/blob/abd50acd384ef43a206514bfa25a3cb0c6a77f65/src/secp256k1.ts#L57):

```jsx
export const secp256k1 = createCurve(
  {
    a: BigInt(0), // equation params: a, b
    b: BigInt(7), // Seem to be rigid: bitcointalk.org/index.php?topic=289795.msg3183975#msg3183975
    Fp, // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
    n: secp256k1N, // Curve order, total count of valid points in the field
    // Base point (x, y) aka generator point
    Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
  ...
 }
```

Ok, so how do we sign a message?
Let’s look at the [weierstrass.ts](https://github.com/paulmillr/noble-curves/blob/abd50acd384ef43a206514bfa25a3cb0c6a77f65/src/abstract/weierstrass.ts#L1104) file:

```jsx
function sign(
  msgHash: Hex,
  privKey: PrivKey,
  opts = defaultSigOpts
): RecoveredSignature {
  const { seed, k2sig } = prepSig(msgHash, privKey, opts); // Steps A, D of RFC6979 3.2.
  const C = CURVE;
  const drbg =
    ut.createHmacDrbg <
    RecoveredSignature >
    (C.hash.outputLen, C.nByteLength, C.hmac);
  return drbg(seed, k2sig); // Steps B, C, D, E, F, G
}
```

The function `sign` depends on 2 functions: `prepSig` and `createHmacDrbg`.
Let’s take a step back. We omitted to explain how _exactly_ the `k` is generated from a theoretical standpoint. It is obtained by feeding the private key `sk` and message `m` into HMAC-DRGB ([Deterministic Random Bit Generator](https://www.rfc-editor.org/rfc/rfc6979#section-3.1)) which is specified in [NIST SP 800-90A](https://csrc.nist.gov/pubs/sp/800/90/a/r1/final). The formula from RFC6979:

```rust
     K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1))

     where '||' denotes concatenation.  In other words, we compute
     HMAC with key K, over the concatenation of the following, in
     order: the current value of V, a sequence of eight bits of value
     0, the encoding of the (EC)DSA private key x, and the hashed
     message (possibly truncated and extended as specified by the
     bits2octets transform)
```

How is it implemented in `noble-curves`?
After reading the code I do not know how many times, I understood that the seed from the `prepSig` function is in fact the concatenation of the values we want for the input of the HMAC ([link to code](https://github.com/paulmillr/noble-curves/blob/abd50acd384ef43a206514bfa25a3cb0c6a77f65/src/abstract/weierstrass.ts#L1062)).

```jsx
const h1int = bits2int_modN(msgHash);
const d = normPrivateKeyToScalar(privateKey); // validate private key, convert to bigint
const seedArgs = [int2octets(d), int2octets(h1int)];
// extraEntropy. RFC6979 3.6: additional k' (optional).
if (ent != null && ent !== false) {
  // K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1) || k')
  const e = ent === true ? randomBytes(Fp.BYTES) : ent; // generate random bytes OR pass as-is
  seedArgs.push(ensureBytes("extraEntropy", e)); // check for being bytes
}
const seed = ut.concatBytes(...seedArgs); // Step D of RFC6979 3.2
```

Back to `k`, what function is called to generate it? Generating the nonce is straightforward, we simply need to instantiate the HMAC-DRBG by calling the [createHmacDrbg function](https://github.com/paulmillr/noble-curves/blob/2509635fe7ddbb848beb9a3d520310cca6174059/src/abstract/utils.ts#L245).

```jsx
/**
 * Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
 * @returns function that will call DRBG until 2nd arg returns something meaningful
 * @example
 *   const drbg = createHmacDRBG<Key>(32, 32, hmac);
 *   drbg(seed, bytesToKey); // bytesToKey must return Key or undefined
 */
export function createHmacDrbg<T>(
  hashLen: number,
  qByteLen: number,
  hmacFn: (key: Uint8Array, ...messages: Uint8Array[]) => Uint8Array
): (seed: Uint8Array, predicate: Pred<T>) => T {
  if (typeof hashLen !== 'number' || hashLen < 2) throw new Error('hashLen must be a number');
  if (typeof qByteLen !== 'number' || qByteLen < 2) throw new Error('qByteLen must be a number');
  if (typeof hmacFn !== 'function') throw new Error('hmacFn must be a function');
  // Step B, Step C: set hashLen to 8*ceil(hlen/8)
  let v = u8n(hashLen); // Minimal non-full-spec HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
  let k = u8n(hashLen); // Steps B and C

  ...
```

The comments help clarify how to create an instance of the HMAC-DRGB and, by extension, how to generate `k`. To get here, as I am far from fluent in js/ts, it was long.

Ok, that's great, we now know which function is called to generate `k` in `noble-curves`.

### Eth Keys

If the two implementations produce different output, which is the correct one? That’s where [eth-keys](https://github.com/ethereum/eth-keys) from the Ethereum Foundation comes into play as a reference implementation. This Python implementation is easy to understand, and finding how to generate the nonce `k` was quick.

```python
def deterministic_generate_k(
    msg_hash: bytes,
    private_key_bytes: bytes,
    digest_fn: Callable[[], Any] = hashlib.sha256,
) -> int:
    v_0 = b"\x01" * 32
    k_0 = b"\x00" * 32

    k_1 = hmac.new(
        k_0, v_0 + b"\x00" + private_key_bytes + msg_hash, digest_fn
    ).digest()
    v_1 = hmac.new(k_1, v_0, digest_fn).digest()
    k_2 = hmac.new(
        k_1, v_1 + b"\x01" + private_key_bytes + msg_hash, digest_fn
    ).digest()
    v_2 = hmac.new(k_2, v_1, digest_fn).digest()

    kb = hmac.new(k_2, v_2, digest_fn).digest()
    k = big_endian_to_int(kb)
    return k
```

We now have everything we need to compare those `k` and confirm (or not) if my gut feeling was correct. Let's write some code to test this.

## The PoC

The idea is to run tests of problematic vectors in all three implementations and compare not only the resulting `k`, but also the inversion of `k` and computation of `R` (in case the problem lies in other parts of the signature computation). The code below is a modified version from the [repo for the PoC](https://github.com/obatirou/RFC6979-implementation-analysis/tree/main) to get the idea.

```jsx
// noble-curves
const k = drbg(concatBytes(test.privateKey, test.message), (bytes) => {
    const num = bytesToNumberBE(bytes);
    if (num <= 0n || num >= CURVE.n) return;
    return num;
}) as bigint;
console.log('k:', k.toString(16));
const kInv = invert(k, CURVE.n);
console.log('k_inv:', kInv.toString(16));
const R = Point.BASE.multiply(k);
console.log('Rx:', R.toAffine().x.toString(16));

// eth-keys
private_key_scalar = bytes.fromhex(test["private_key"])
message = bytes.fromhex(test["message"])
k = deterministic_generate_k(message, private_key_scalar)
print(f"k: {hex(k)}")
k_inv = inv(k, N)
print(f"k_inv: {hex(k_inv)}")
R = fast_multiply(G, k)
print(f"Rx: {hex(R[0])}")

// RustCrypto
let k =
    generate_k::<Sha256, U32>(&private_key.into(), &modulus.into(), &message.into(), b"");
println!("k: {}", hex::encode(k));
let k = Scalar::from_repr(k).unwrap();
let k_inv = k.invert();
println!("k_inv: {}", hex::encode(k_inv.unwrap().to_repr()));
let big_r = ProjectivePoint::mul_by_generator(&k).to_affine();
println!("Rx: {}", hex::encode(big_r.x()));

```

Let’s launch and see the results:

```jsx
Test vector: {'private_key': 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140', 'message': 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'}

// RustCrypto, eth-keys and noble-curves output the same thing
k: 0xd5707f5502c771172f3b33b4042f5b14042c4365e0ba99d9b0f44f2639059457
k_inv: 0x2ca3f669b3b3a59a36ac422465678bc24a29ae6418dbe399b65de714369d1b43
Rx: 0xccedf9058419be4bf0d0aaf55b20072bcf6acb16621ac4ab90a3ed20b83a85ce
```

Why is `k` the same in all 3 implementations?
Let’s compare the functions `sign` to ensure we are not crazy:

```jsx
// RustCrypto and eth-keys
r: 0xccedf9058419be4bf0d0aaf55b20072bcf6acb16621ac4ab90a3ed20b83a85ce;
s: 0x6c2444f18d6069e828b3ce0e4e5f2f20a2d7e701042bb4bf9361b228f0091ac6;

// noble-curves
r: 0x919026f3e239ea52cf530eb6d345dc2b56ef0928f1e9ad20d8f360284dc65048;
s: 0x14395e7137e2204f15b69239010f3c34fbb3c858a29b0d106b1fa65bc0047263;
```

Where is the problem then? Why are these `k` values identical across the three implementations in PoC, but the signature is different for `noble-curves`?

## The root cause

In fact, after diving again in the code, the problem lies in the input of the HMAC function and the message hash particularly: **_for `noble-curves` it is reduced mod curve order but for `RustCrypto` and `eth-keys`, it is not!_**

```rust
// noble-curves
const h1int = bits2int_modN(msgHash); // <- msgHash is modN !
const d = normPrivateKeyToScalar(privateKey);
const seedArgs = [int2octets(d), int2octets(h1int)]; // <-  passed to the seed for HMAC

// eth-keys
k = deterministic_generate_k(msg_hash, private_key_bytes) // <- the msgHash is used directly

// RustCrypto
let k = Scalar::<C>::from_repr(rfc6979::generate_k::<D, _>(
    &self.to_repr(),
    &C::ORDER.encode_field_bytes(),
    z,                             // <- the msgHash is used directly
    ad,
))
.unwrap();
```

And now, realizing that the 3 problematic vectors defined earlier have a message hash greater or equal to the curve order `n = fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141` you understand that it will generate different inputs after reducing them `mod n`. Why wasn’t this discrepancy reflected in the PoC? It was a bit naive as the inputs were not preprocessed, we passed the same input values.

So, you have 3 really important libraries that do not respect a critical RFC. What do you do? What are the implication of this finding?

## Calling SEAL911

After contacting [SEAL911](https://github.com/security-alliance/seal-911), @pcaversaccio responded in under 5min. Discussing with @paulmillr, he raised a point I overlooked: the input of the HMAC function is the message hash but passing through the `bits2octets`function.

```jsx
 K = HMAC_K(V || 0x01 || int2octets(x) || ***bits2octets***(h1))
```

By looking into the definition of `bits2octets`, it is clear that the message hash needs to be reduced **before** the `k` generation.

```jsx
2.3.4.  Bit String to Octet String

   The bits2octets transform takes as input a sequence of blen bits and
   outputs a sequence of rlen bits.  It consists of the following steps:

   1.  The input sequence b is converted into an integer value z1
       through the bits2int transform:

          z1 = bits2int(b)

   2.  z1 is reduced modulo q, yielding z2 (an integer between 0 and
       q-1, inclusive):

          z2 = z1 mod q
```

This is exactly what `noble-curves` does. In fact, it is `RustCrypto` and `eth-key` that are missing this step, deviating from the RFC specs. This led to creating issues on repositories of libraries affected by this finding.

- [indutny/elliptic/issues/328](https://github.com/indutny/elliptic/issues/328)
- [RustCrypto/elliptic-curves/issues/1100](https://github.com/RustCrypto/elliptic-curves/issues/1100)
- [eth-keys/issues/101](https://github.com/ethereum/eth-keys/issues/101)

`RustCrypto` has already implemented the fix on the [master branch](https://github.com/RustCrypto/signatures/pull/777/files) but has not yet release it. `foundry` [is still using](https://github.com/foundry-rs/foundry/blob/4923529c743f25a0f37503a7bcf7c68caa6901f1/Cargo.lock#L2909) the tag `ecdsa/0.16.9` which is affected by the issue. A [tracking issue](https://github.com/foundry-rs/foundry/issues/9499) was created.
Although it is not a security vulnerability in the sense of forgeable signature or the like, the issue remains that the signature is not deterministic in all cases.

## Conclusion

This was a long post but it reflected how I went from a simple test to finding an implementation issue in major cryptographic libraries. It was really interesting to deep dive into those codebases and deepen my understanding about the nonce generation in ECDSA.

And most importantly, at last, I can finish [my PR](https://github.com/verklegarden/crysol/pull/34).
