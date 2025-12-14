---
title: Post-deployment Security
subtitle: Fixing a Smart Contract Security Blind Spot
gh-repo: yaudit/blog-site
tags: [security-pipeline]
author: engn33r
twitter: https://x.com/bl4ckb1rd71
date: 2024-06-14
---

# Post-deployment Security: Fixing a Smart Contract Security Blind Spot

What if I told you that what is examined in a standard smart contract security review or audit is different from the protocol operating on-chain? What if the standard smart contract security process in 2024 has a blind spot that can lead to overlooked bugs?

![Morpheus](../public/post-deployment/this-is-fine.png)

Smart contract code is intended to be deployed on-chain. The full on-chain context is not available _before_ the code is deployed on-chain. Most code is not deployed on-chain without a proper security review, so the security review happens _before_ deployment. This means security audits are consistently being performed with incomplete context.

This incomplete context is a problem that can lead to overlooked vulnerabilities or inaccurate assumptions during the code review process. There are many known examples of smart contract code being secure in some contexts but not in others. Common examples are Compound Finance forks (adding an incorrect ERC20 token makes the protocol insecure) and UUPS proxies (an uninitalized proxy is insecure).

The reason for the existence of this blind spot is not due to a single root cause, but several weaknesses. By identifying these weaknesses and upgrading the security process accordingly, the quality of security reviews throughout the entire ecosystem can be improved.

## Issue #1: Out-of-Scope Deployment Scripts

Deployment scripts are rarely considered officially in-scope during a security review. The easiest proof for this is found in the scope descriptions for past auditing contests on Code4rena, Sherlock, and elsewhere. The scope descriptions normally list deployment scripts as out-of-scope, preferring to focus the attention only on smart contract code. There are rare instances where an issue in a deployment script was reported and considered to be valid, but this is not a standard part of the process.

Public audit reports are another source demonstrating that deployment scripts are normally ignored. The scope sections of public reports only list smart contract files or are ambiguous about whether the deployment scripts were in-scope. An example of an ambiguous situation is when a commit hash of the entire git repository is listed instead of a detailed list of every file that was reviewed.

## Issue #2: Unfinished Deployment Scripts

To further demonstrate how deployment scripts are ignored in security reviews, deployment scripts are often among the last files to be finalized before the protocol is deployed. Deployment scripts are often not finished when the security review begins, and this is no doubt reinforced by this mindset that only smart contracts are important files that should be in-scope for the security review. Even if the deployment scripts are considered finalized, the idea of modifying a deployment script at the last minute without a security review is not considered a major error. In contrast, most security-conscious developers would recognize that modifying smart contract code without a proper security review is a major error.

![Deployment script todo](../public/post-deployment/todo.png)

The logic from the developer standpoint is that it’s better to finalize the smart contract code first so that the security work can begin, allowing the deployment scripts to be finalized in parallel. But the hidden risk with this approach is that if the deployment scripts are not finalized at the time of the security review, it is impossible to test the contract deployment in a way that mimics the finalized deployment. The inability to get a clear view of the final on-chain deployed state during the security review is crucial to the next point.

## Issue #3: Invalid Constructor Argument or Governance-defined Variable Assumptions

Constructors and access-controlled functions can sometimes be skimmed quickly in security reviews because it’s often hard to find anything inherently wrong in the simple logic of these lines of code. The core idea is that the deployer or admin of the contract is setting the value of a state variable. In theory, not much can go wrong. The problem is that, without a finalized deployment script, the values passed into these functions are unknown, even though they play a key role in the protocol.

![Magnifier](../public/post-deployment/magnifier.png)

Inaccurate assumptions about these values relative to how the protocol operates on-chain can cause the security review to miss possible issues. For instance, take the common case of a setter function that can only be called by the protocol admin. An example of this could be a function like `setFactory(address)` or `setOracle(address)`. The report from the security review can often contain an issue if there is a problem passing the zero address as input to this function. But what about an admin-controlled setter function named `setFeePercentage(uint256)` that takes a uint256 input argument? What values will be passed to this function and what protections should be in place? Different logical checks are needed if the function expects the value 3% (perhaps the percentage should always be less than or equal to 100) or 103% (perhaps the percentage should always be greater than or equal to 100).

If there is insufficient documentation around `setFeePercentage(uint256)` and no deployment script, the security review may not easily determine how this function is intended to work once it is deployed on-chain. The most simple example of a bad assumption resulting in a vulnerability is the case where the deployment script forgets to call a key function, such as initializing a proxy. Another common issue caused by poor assumptions is which ERC20 tokens are supported by the protocol. Governance actions far in the future may alter this list, which can have security implications. A final detail that is impossible to observe before deployment is what address receives a privilege governance role - this address should be a properly configured multisig and not an EOA.

# Conclusion

The entire smart contract ecosystem is still in its early days. Processes and best practices are still evolving, and security processes will be part of this evolution. This post highlights issues that exist in the current security review process in the hope that awareness of these issues is the first step to fixing these issues. With such awareness, developers and security experts can slowly improve security processes to a better state than they are in today.
