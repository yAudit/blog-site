---
title: Small Steps in Automating Security
subtitle: Detecting Incorrect Interface Definitions (in Vyper!)
gh-repo: yaudit/blog-site
tags: [vyper]
author: engn33r
twitter: https://x.com/bl4ckb1rd71
date: 2024-04-19
---

# Small Steps in Automating Security

After reviewing many smart contract security findings, categories of bugs can be formed to group these findings. There are reentrancy attacks, rounding errors, accounting bugs, and many more. Often these categories are too large or too complex to consider automated detection with a reasonable signal-to-noise ratio, but sometimes opportunities arise when focusing on small enough subcategories. [Slither](https://github.com/crytic/slither) is an excellent example of focusing on specific subcategories for automation.

Recently, a scenario arose where we found a certain issue more than once and realized automation could be used. Because the decision to automate this process happened while a Vyper audit was ongoing, we took the opportunity to write a standalone proof of concept tool to automate detection of this issue type for Vyper code. In this post, we examine the different patterns of this issue and share our detection tool publicly. This tool could even be integrated into CI/CD pipelines for automated detection of issues during development. Furthermore, this may be the first instance where a tool exists for Vyper before it exists for Solidity.

## Detecting Incorrect Interface Definitions

A very brief background summary: contracts interact with other contracts using external calls. In such cases, there is a caller contract that makes the external call and a called contract that is the target of the external call. In practice, these external calls involve importing the proper interface into the caller contract. It is important that the imported interface matches the called contract, and when this is not the case, issues arise. These issues are not easily caught during contract compilation because the interface of one contract must be mapped to the contract that it corresponds to, which generally only happens during the actual contract call. This can happen during testing if the tests are written to properly test all external calls, or in a worse case scenario, the issue is found after deployment (oops!).

Many variations of incorrect interface definitions can occur. We tried to organize these variations into a table to provide a high-level overview. Each pattern mentioned in this table is expanded on later in this post. Examples are provided in Solidity and Vyper.

|                                    | Interface Imported | Interface Not Imported |
| :--------------------------------: | :----------------: | :--------------------: |
|   **Function Exists and Called**   |        OK!         |       Pattern 1        |
| **Function Exists and Not Called** |     Pattern 3      |          OK!           |
|     **Function Doesn't Exist**     | Pattern 2A and 2B  |          OK!           |

### Pattern 1

Consider a scenario where the called contract implements a function but the interface is not imported into the caller contract before making the external call. This pattern can be named "called but not imported". This pattern is caught by the Solidity and Vyper compilers, which raise an error ("Error (7920): Identifier not found or not unique" is the Solidity compiler error and "vyper.exceptions.UnknownAttribute: Exchange has no member 'totalSupply'." is the Vyper compiler error), so this issue should never appear on-chain.

**Vault.sol**

```solidity
import {transfer, transferFrom} from "src/interfaces/IERC20.sol";

...

uint256 currentSupply = IERC20(_token).totalSupply();
```

---

**Vault.vy**

```python
interface IERC20:
    def transfer(_to: address, _value: uint256) -> bool: nonpayable
    def transferFrom(_from: address, _to: address, _value: uint256) -> bool: nonpayable

...

currentSupply: uint256 = IERC20(_token).totalSupply()
```

### Pattern 2A

Another problematic pattern that exists is when the interface is imported in the caller contract but doesn't exist in the called contract. This pattern can be a result of the function name changing in the called contract but the interface import in the caller contract was not modified to match the updated code. The compiler does not catch this type of issue because there is no linking between an interface in the caller contract and the called contract. In many cases, the called contract may not even be in the same code repository as the caller contract, such as cases where a protocol is interacting with other external protocols. The solution in this case is to make sure the caller and called contract interfaces match properly.

**VaultCaller.sol**

```solidity
interface IVault {
    function get_price() external returns (uint256);
}
```

**Vault.sol**

```solidity
function get_current_price() external {
    ...
}
```

---

**VaultCaller.vy**

```python
interface Vault:
    def get_price() -> uint256: view
```

**Vault.vy**

```python
def get_current_price() -> uint256:
```

### Pattern 2B

There is another variation of this same issue where the interface is imported in the caller contract but doesn't exist in the called contract. This variation exists when an interface in the caller contract is overloaded and is used for interactions with multiple called contracts. For example, consider a vault contract calling multiple strategy contracts, or a vault manager contract calling different vaults. If there are differences in the interfaces of the called contracts, it may be incorrect to use the same interface in the caller contract when interacting with all of the called contracts. If the caller contract tests do not test the integrations with all of the called contracts, this issue may not be caught until after deployment. This variation highlights the importance of testing all logic paths with all possible external calls, instead of assuming that testing one external call is enough to make assumptions about all other external calls.

**TokenIntegrator.sol**

```solidity
interface ICustomToken {
    function transferWithInfo(address to, uint256 amount, uint8 info) external returns (bool);
}
```

**CustomTokenOld.sol**

```solidity
function transferWithInfo(address to, uint256 amount, uint8 info) external returns (bool) {
    ...
}
```

**CustomTokenNew.sol**

```solidity
function transferWithInfo(address to, uint256 amount, uint8 info, bool hasInfo) external returns (bool) {
    ...
}
```

---

**TokenIntegrator.vy**

```python
interface CustomToken:
    def transferWithInfo(to: address, amount: uint256, info: uint8) -> bool: nonpayable
```

**CustomTokenOld.vy**

```python
def transferWithInfo(to: address, amount: uint256, info: uint8) -> bool:
```

**CustomTokenNew.vy**

```python
def transferWithInfo(to: address, amount: uint256, info: uint8, hasInfo: bool) -> bool:
```

The suggested solution in this case is to use two different interfaces in order to handle the slight implementation differences in the external contracts. This solution is demonstrated below.

**TokenIntegrator.sol**

```solidity
interface ICustomNewToken {
    function transferWithInfo(address to, uint256 amount, uint8 info, bool hasInfo) external returns (bool);
}

interface ICustomOldToken {
    function transferWithInfo(address to, uint256 amount, uint8 info) external returns (bool);
}
```

---

**TokenIntegrator.vy**

```python
interface CustomNewToken:
    def transferWithInfo(to: address, amount: uint256, info: uint8, hasInfo: bool) -> bool: nonpayable

interface CustomOldToken:
    def transferWithInfo(to: address, amount: uint256, info: uint8) -> bool: nonpayable
```

### Pattern 3

Finally, perhaps the least impactful interface issue pattern is where an interface is imported but not used. This does not cause any issue when compiling or interacting with the contracts, but simplifying code in a contract to keep it clean is generally a good idea. The suggested approach here is to remove the unnecessary interface import.

**Vault.sol**

```solidity
import {price} from "src/interfaces/PriceOracle.sol";

// price() is not called in this contract after the import, so remove the import
```

---

**Vault.vy**

```python
interface PriceOracle:
    def price() -> uint256: view

# price() is not called in this contract after the import, so remove the import
```

## Automated detection with Vyper Interface Scanner

To automate the detection of the issues described above, yAudit is releasing the [Vyper Interface Scanner](https://github.com/yaudit/vyper-interface-scanner). It's a basic proof of concept tool that demonstrates the detection of these interface issues. It is not heavily tested and is guaranteed to have some bugs, but even in its current state, it has helped to save time in detecting these types of issues. Ideally, a more robust future version of such a tool would rely on the Vyper AST rather than string parsing, but the proof of concept should be sufficient for basic usage and demonstration purposes. This tool has been tested primarily on Vyper 3.10, so keep in mind the upcoming Vyper 4.X release may not be fully supported.

The [Vyper Interface Scanner](https://github.com/yaudit/vyper-interface-scanner) repository includes basic user documentation, but let's look at a simple example of using the tool.

Consider a scenario where a caller contract Factory.vy contains an interface Exchange that is used when calling the contract Exchange.vy to deploy and configure multiple Exchange.vy from this Factory contract. To use the Vyper Interface Scanner tool to check this integration, first install Vyper with `pip install vyper` and then run:

`python interface-checker.py Exchange.vy Factory.vy Exchange`

## Conclusion

Issues related to interfaces involve less complicated logic than many other smart contract bugs. There are different patterns of interface issues and the detection of these patterns can be automated. A proof of concept tool is provided for Vyper code, but a corresponding tool for Solidity does not yet exist. This may be the first example of a security tool created for Vyper code when a similar tool does not exist yet for Solidity code. In summary, all logic paths of external calls should be properly tested to ensure that the caller contract is properly calling a function that exists in the called contract.
