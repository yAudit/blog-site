---
title: Multisig Security Analysis
subtitle: When is a Safe not so safe?
gh-repo: yaudit/blog-site
tags: [multisig, safe, config, tool]
author: engn33r
twitter: https://x.com/bl4ckb1rd71
date: 2025-10-27
---

# Multisig Security Analysis

Multisignature wallets have become the gold standard for securing large amounts of on-chain assets. DAO treasuries, institutional investors, and whales all look to multisigs as a safer way of managing their substantial funds than relying on just a single hardware wallet (or even worse, a browser extension hot wallet). However, just using a multisig does not in itself offer better security. A 1-of-1 multisig provides zero additional security because it maintains the single wallet point of failure. Other multisig configurations can also be problematic, potentially reducing the safety of the funds secured by the multisig. Multiple configuration parameters and operational practices can impact the risk profile of a multisig. This research effort provides a security analysis tool that evaluates the security level of Safe multisig contracts on EVM chains across 14 security tests. The results of this research include new tools to allow anyone to easily analyze a multisig's security level:

- **Multisig security web app**: Submit a multisig address and get a summary of the multisig's security profile
- **Multisig security API**: An alternative to the user-friendly web app for services that wish to query multisig addresses
- **Python script**: Want to run analysis locally without a web browser? This script has you covered.
- **Open sourced repository**: The GitHub repository containing all of the above is available at https://github.com/yaudit/multisig-security

There are limitations to what this automated tooling was able to accomplish. For example, it is not possible to determine whether multisig signers of a multisig properly follow a [secure signing process](https://frameworks.securityalliance.org/wallet-security/secure-multisig-signing-process), whether the addresses on a multisig are hardware wallets or EOA, and because https://revoke.cash/ has no public API, this tool cannot automatically display a multisig's unused token allowances that could put value at risk if the contract with a non-zero allowance is hacked or malicious. Additionally, some of the checks in this tool do not clearly indicate the configuration is good or bad. Examples of this include whether a Safe has an optional module installed and whether a signer of a multisig is a contract. Such cases require deeper manual investigation to reach proper conclusions. Therefore, this tool should NOT be considered anything close to a comprehensive analysis of a multisig's security posture, but instead should be considered as a quick and easy way to identify glaring errors in a multisig's configuration.

## Background: Why Multisigs Improve Security

Why do DAO treasuries, institutions, and other large asset holders put in the effort to use a multisig wallet to store their funds? The basic idea is that the [attack tree](https://www.schneier.com/academic/archives/1999/12/attack_trees.html) to steal those funds is more complicated than stealing funds from an EOA, making the funds more secure. There are many attack vectors to steal funds from a single signer wallet, but this effort must be duplicated multiple times in order to take funds from a multisig, greatly multiplying the effort involved in such an attack.

![Attack Tree: EOA Compromise](../public/multisig/eoa-attack-tree.svg)
*Figure 1: Attack tree showing the various paths to compromise an Externally Owned Account (EOA). The single point of failure makes EOAs vulnerable to any successful attack vector.*

![Attack Tree: Multisig Compromise](../public/multisig/multisig-attack-tree.svg)
*Figure 2: Attack tree showing the significantly more complex requirements to compromise a 3-of-N multisig. Attackers must successfully execute multiple coordinated attacks simultaneously.*

If we consider two hypothetical multisigs, one with a 1-of-10 multisig and one with a 7-of-10 multisig, we should consider the 7-of-10 multisig is more secure because more signers need to be compromised for the multisig funds to become vulnerable.

But the signer threshold is the most simple configuration parameter in multisig security. There are many configuration parameters, but before diving into them individually, let's take a look at the tools that came out of this research.

## Tools Overview

This repository provides three different ways to analyze multisig security, each designed for different use cases and integration needs.

### 1. Web Application

The primary interface is a user-friendly web application intended for manual analysis. This app lives at https://safe.yaudit.dev/. Simply enter a multisig address and get immediate results, or choose an example address to see how the tool works. And if you want to share the results for a specific contract with friends, there is a "Share" button designed for that exact use case.

### 2. Web Application API

For developers and services that wish to integrate multisig security analysis into their own applications, the web app also offers a REST API endpoint. This allows programmatic access to all security analysis functionality. You can access the API with the same URL that the "share" button uses, but with "api/" added to the URL. For example, https://safe.yaudit.dev/api/1/0x73b047fe6337183A454c5217241D780a932777bD/ is an example of an API URL that returns the analysis results in JSON format.

### 3. Python Script

For users who prefer local command-line tools, want to do batch analysis research on many multisigs, or look to integrate this tool with an existing local toolchain, a standalone Python script offers the same comprehensive security analysis functionality. The script is located in the [python_script directory](https://github.com/yaudit/multisig-security/tree/main/python_script). If you will use the script a lot, you will probably find some benefit if you change the default RPC endpoints, because the script defaults are public endpoints from https://chainlist.org/.

The only external dependency of this script is the popular requests library, so before running the script, use `pip3 install requests`.

#### Single Safe Analysis

```bash
# Analyze a Safe on Ethereum
python3 safe_analyzer.py --address 0x3B59C6d0034490093460787566dc5D6cE17F2f9C --chain ethereum

# Analyze with Etherscan v2 API key for full results
python3 safe_analyzer.py --address 0xc9647361742eb964965b461c44bdf5c4bc3c406d --chain arbitrum --api-key YOUR_API_KEY

# Output as JSON
python3 safe_analyzer.py --address 0x6f5c9B92DC47C89155930E708fBc305b55A5519A --chain arbitrum --api-key YOUR_API_KEY --output json --file analysis.json
```

#### Batch Analysis

```bash
# Create a file with Safe addresses
echo "0xcAD001c30E96765aC90307669d578219D4fb1DCe" > safes.txt
echo "0xFEB4acf3df3cDEA7399794D0869ef76A6EfAff52" >> safes.txt

# Analyze all addresses
python3 safe_analyzer.py --batch safes.txt --chain ethereum --output csv --file results.csv
```

# List of multisig security checks

## 1. Signer Threshold Analysis

**What it checks:** The minimum number of signatures required to execute transactions.

The signer threshold is the fundamental security parameter of any multisig. It determines how many owners must approve a transaction before it can be executed.

**Best case:** A threshold of 4 or more signatures provides robust protection against single points of failure and makes collusion significantly more difficult. With a high threshold, even if one or two private keys are compromised, the multisig remains secure.

**Worst case:** A threshold of 1 signature completely defeats the purpose of a multisig, creating a single point of failure that's no better than a regular wallet. This configuration offers no protection against key compromise and is considered a critical security flaw.

**Why it matters:** The threshold directly determines how many attackers would need to compromise keys to gain control of the funds. A threshold of 2-3 provides moderate security but may be insufficient for high-value assets. The optimal threshold balances security against operational complexity.

## 2. Signer Threshold Percentage

**What it checks:** The percentage of total owners required to approve transactions.

While the absolute threshold number is important, the threshold percentage provides insight into the governance structure and collusion resistance of the multisig.

**Best case:** A threshold representing 51% or more of owners ensures that a majority must always consent to transactions. This provides strong protection against minority collusion and ensures that the majority of stakeholders maintain control.

**Worst case:** A threshold below 34% of owners means that a small minority can execute transactions without broader consensus. This creates significant governance risks and makes collusion attacks much more feasible.

**Why it matters:** Even with a high absolute threshold, if you have many owners, a low percentage threshold can create governance issues. For example, a 3-of-10 multisig only requires 30% consensus, which may not represent the true intent of the majority stakeholders.

## 3. Safe Version Assessment

**What it checks:** Whether the Safe contract is running the latest or recent versions.

Smart contract platforms evolve rapidly, with new versions addressing security vulnerabilities, bugs, and adding features.

**Best case:** Running the latest or second-latest version (within 180 days of release) ensures access to the most recent security improvements and bug fixes. These versions have undergone the most recent security audits and community review.

**Worst case:** Very outdated versions (3+ major versions behind) may contain known security issues that have been publicly disclosed. These versions lack available security improvements and may be incompatible with certain modern tooling.

**Why it matters:** Each new Safe version typically includes security improvements and bug fixes. Staying current reduces exposure to any attack vectors and ensures compatibility with the latest ecosystem tools and standards.

## 4. Contract Creation Date Evaluation

**What it checks:** How long the Safe contract has been deployed and operational.

The age of a contract provides insight into its operational maturity and the amount of real-world testing it has received.

**Best case:** Safes deployed more than 60 days ago have had time to demonstrate operational stability. They've survived potential early-stage issues and have been battle-tested through various market conditions and operational scenarios.

**Worst case:** Safes deployed less than 7 days ago carry higher risk due to their newness. There's insufficient operational history to identify potential issues, and the deployment may represent a rushed or inadequately tested setup.

**Why it matters:** New deployments are more likely to contain configuration errors, untested edge cases, or be associated with experimental or high-risk activities. Established contracts demonstrate operational maturity and stakeholder commitment.

## 5. Multisig Nonce Analysis

**What it checks:** The number of transactions that have been executed by the multisig.

The nonce represents the operational activity level and provides insight into whether the multisig is actively used or potentially abandoned.

**Best case:** A nonce above 10 indicates active usage and operational maturity. Regular transaction activity suggests ongoing stakeholder engagement and demonstrates that the multisig workflows are functioning properly.

**Worst case:** A nonce of 3 or fewer transactions suggests minimal usage. This could indicate an abandoned project, testing setup, or multisig that hasn't been properly operationalized, potentially making it more susceptible to owner key loss or abandonment.

**Why it matters:** Active usage demonstrates that the multisig owners are engaged and the operational procedures are working. Inactive multisigs may have higher risks of owner unavailability, lost keys, or operational challenges when transactions are eventually needed.

## 6. Last Transaction Date Monitoring

**What it checks:** When the multisig was last used for executing transactions.

Recent activity patterns help assess whether the multisig is actively maintained and whether owners are likely to be available for future transactions.

**Best case:** Transaction activity within the last 30 days indicates active engagement by owners. This suggests that signing procedures are working, owners are available, and the multisig is operationally ready for future transactions.

**Worst case:** No activity for 90+ days may indicate abandonment, owner unavailability, or operational difficulties. Extended inactivity increases the risk that owners may have lost access to their keys or are no longer engaged with the project.

**Why it matters:** Long periods of inactivity can signal potential problems with owner availability, lost keys, or abandoned projects. When urgent transactions are needed, inactive multisigs may face operational challenges or delays.

## 7. Optional Modules Assessment

**What it checks:** Whether additional functionality modules are installed on the Safe.

Modules extend Safe functionality but also increase the attack surface and complexity of the system.

**Best case:** No modules installed means the Safe uses only standard, well-audited functionality. This minimizes attack surface and reduces complexity, making the system easier to understand and audit.

**Worst case:** Multiple modules installed increases the attack surface significantly. Each module represents additional code that could contain vulnerabilities, and the interactions between modules can create unexpected security risks.

**Why it matters:** While modules can provide useful functionality, they introduce additional complexity and potential attack vectors. Each module should be carefully audited and its necessity weighed against the security risks it introduces. The results of this test require manual examination to properly assess, because the existence of modules is not necessarily a problem.

## 8. Transaction Guard Configuration

**What it checks:** Whether a transaction guard contract is installed to validate transactions.

Transaction guards can add additional security layers but require careful security review of the guard contract itself.

**Best case:** No transaction guard means the Safe uses standard, well-tested transaction execution logic. This approach minimizes complexity and potential attack vectors while relying on the core Safe's proven security model.

**Worst case:** A poorly implemented or malicious transaction guard could block legitimate transactions, allow unauthorized transactions, or contain vulnerabilities that compromise the entire Safe's security.

**Why it matters:** While guards can add security, they introduce additional complexity and potential failure points. Any guard implementation must be thoroughly audited and its security properties well understood. The results of this test require manual examination to properly assess, because the existence of transaction guards is not necessarily a problem.

## 9. Fallback Handler Analysis

**What it checks:** Whether a fallback handler is configured and if it's a known, safe implementation.

Fallback handlers process calls to undefined functions and can add functionality like EIP-1271 signature verification.

**Best case:** Either no fallback handler (standard Safe functionality) or a known official Safe fallback handler that has been audited and widely used. Official handlers like CompatibilityFallbackHandler provide additional features safely.

**Worst case:** An unknown or custom fallback handler could contain vulnerabilities, malicious code, or unexpected behavior that compromises the Safe's security. Custom handlers require thorough security review.

**Why it matters:** Fallback handlers have significant power over contract behavior and can potentially be used to bypass security measures or introduce vulnerabilities if not properly implemented and audited.

## 10. Chain Configuration Security

**What it checks:** Whether the Safe is deployed on multiple blockchain networks.

Multi-chain deployments can create replay attack risks where transactions from one chain might be replayed on another.

**Best case:** Deployment on a single chain eliminates replay attack risks entirely. There's no possibility of cross-chain transaction replay, and the security model is straightforward to understand and manage.

**Worst case:** Deployment on multiple chains with the same address creates potential replay attack vectors. Signatures created for transactions on one chain might potentially be valid on another chain, depending on the transaction structure and chain ID handling.

**Why it matters:** Cross-chain replay attacks can allow malicious actors to execute unintended transactions on different chains using signatures intended for other networks. Proper chain ID validation and unique addresses per chain help mitigate these risks.

## 11. Owner Activity Analysis

**What it checks:** Whether owner addresses are used for transactions outside of multisig operations.

Dedicated signing keys that are only used for multisig operations provide better security isolation.

**Best case:** All owner addresses show no recent non-multisig activity, indicating they are likely dedicated signing keys used exclusively for multisig operations. This reduces the exposure and attack surface of the signing keys.

**Worst case:** Owner addresses with high transaction activity outside the multisig may be more exposed to various attack vectors, including phishing, malware, or operational security breaches from their other activities.

**Why it matters:** Keys used for multiple purposes have higher exposure to various attack vectors. Dedicated signing keys that are only used for multisig operations have reduced attack surface and are easier to secure properly.

## 12. Emergency Recovery Mechanisms

**What it checks:** Whether recovery modules are installed and how their thresholds compare to normal operations.

Recovery modules can provide emergency access but must be configured carefully to avoid creating new attack vectors.

**Best case:** Recovery mechanisms with thresholds equal to or higher than normal operations provide emergency access without reducing security. This offers resilience against key loss while maintaining security standards.

**Worst case:** Recovery mechanisms with lower thresholds than normal operations create potential backdoors. Attackers might find it easier to compromise the recovery mechanism than the primary multisig, effectively bypassing the intended security.

**Why it matters:** While recovery mechanisms can provide valuable protection against key loss, they must not create easier attack paths. Recovery thresholds should never be lower than normal operational thresholds. The results of this test require manual examination to properly assess, because the existence of emergency recovery mechanisms is not necessarily a problem.

## 13. Contract Signers Evaluation

**What it checks:** Whether any of the multisig signers are smart contracts rather than externally owned accounts (EOAs).

Contract signers add complexity and require recursive security analysis of the signer contracts themselves.

**Best case:** All signers are externally owned accounts (EOAs), which provide straightforward security properties. The security of the multisig depends only on the private key security of the individual owners.

**Worst case:** Contract signers introduce recursive security dependencies. The security of the multisig now depends on the security of the signer contracts, which may have their own vulnerabilities, governance issues, or dependencies.

**Why it matters:** Contract signers significantly complicate security analysis. Each contract signer must be evaluated as thoroughly as the main multisig, and the interaction between multiple contract signers can create complex security dependencies.

## 14. Multi-Chain Signer Analysis

**What it checks:** For multi-chain deployments, whether the same signer addresses are reused across different chains.

This check only appears when the Safe is deployed on multiple chains and analyzes cross-chain signer reuse patterns.

**Best case:** Unique signer addresses for each chain deployment minimize cross-chain key compromise risks. If attackers compromise keys on one chain, they cannot use those keys to attack the Safe on other chains.

**Worst case:** The same signer addresses used across multiple chains create concentrated risk. If an attacker compromises a signing key, they potentially gain attack capabilities against the Safe on multiple blockchain networks simultaneously.

**Why it matters:** Cross-chain signer reuse amplifies the impact of any single key compromise. Using unique signing keys per chain limits the blast radius of security breaches and provides better isolation between different blockchain deployments. The results of this test require manual examination to properly assess, because it may be an intentional choice to use the chosen signer addresses on different chains.

## Conclusion

Multisig security extends far beyond simply using a multisig contract. Configuration choices around thresholds, version management, operational practices, and deployment strategies all significantly impact the security posture of these critical infrastructure components. Multisig maintenance is not done when the multisig is first created, because the contract can be upgraded to newer contract versions when they become available. There is a completely separate topic of [multisig opsec](https://frameworks.securityalliance.org/wallet-security/secure-multisig-signing-process) that is out of scope of this research that also requires substantial attention to follow security best practices.

By analyzing the results of these 14 security tests, teams can identify and address unwanted multisig risks before they become problems. Any multisig user or owner should at least take a glance at the results of this tool, as any unknown risks should be addressed.
