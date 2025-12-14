---
title: When L2s Fall
subtitle: Newsflash - single points of failure can fail
gh-repo: yaudit/blog-site
tags: [L2, sequencer]
author: engn33r
twitter: https://x.com/bl4ckb1rd71
date: 2024-08-19
---

# When L2s Fall

The goal of L2 protocols is to provide a better blockchain user experience by reducing costs and latency compared to transacting on L1 mainnet Ethereum. If you've spent any time in the blockchain space, you know about the blockchain trilemma.

![trilemma](../public/L2_sequencer/trilemma.jpg)

Most, if not all, L2 chains built on mainnet Ethereum focus on scalability at the cost of decentralization. In contrast to mainnet Ethereum, top L2 chains require all transactions to pass through a single bottleneck, the L2 sequencer. The role of the L2 sequencer is to take L2 transactions, build L2 blocks, and submit the L2 blocks onto the L1 chain. The sequencer role is crucial to L2 uptime, and if the sequencer or associated system components goes down, the chain goes down. This article investigates instances of major L2 downtime events across different L2 chains. Minor downtime events of under 30 minutes were not included, because these minor incidents are more common and harder to identify.

## Centralized Sequencer Weakness

Murphy's law states that anything that can go wrong, will go wrong. Many L2s have experienced sequencer downtime, and if current trends continue, this will not change until a more decentralized sequencer approach is adopted. Some newer L2 chains do use decentralized sequencer models, mostly leveraging the [HotStuff BFT consensus protocol](https://arxiv.org/abs/1803.05069), but such big differences come with [tradeoffs](https://ethresear.ch/t/rollup-decentralisation-analysis-framework/17366).

One could imagine that a worst case scenario for a L2 chain is unlimited downtime e.g. the chain goes down and the sequencer is not restarted. In such a scenario, assets would be locked on the chain with no way out. Luckily, [L2Beat](https://l2beat.com/scaling/summary) has a "Sequencer Failure" category to track which L2 chains have support for a fallback escape hatch if this scenario arises with. Unfortunately, most chains have not made it clear exactly how this fallback escape hatch will work in reality, and there is no way to test any of these escape hatches to verify that they will work when needed.

The paranoid among us may imagine a worst case scenario where the sequencer server is compromised by black hats and the L2 team is somehow prevented from bringing a new sequencer back online. The entire TVL of the L2 chain could be held for ransom. A similar scenario could occur should the management of a L2 sequencer turn malicious and seek a way to extract value from users on the chain. Luckily, no such worst case scenario has occurred to date, but the idea of so much value relying on the trust of a few individuals or entities is problematic in the long run.

In an effort to highlight the risks of such centralized design, this is the first attempt to examine the causes of unplanned L2 sequencer downtime across different L2s. After examining the root cause of specific incidents, a brief explanation is given of the data collection methods used.

For clarification, a common example of L2 chain downtime that is not examined is planned maintenance downtime. Some examples of this include the OP Bedrock upgrade, which had an expected downtime of [4 hours](https://gov.optimism.io/t/bedrock-downtime-what-to-know/5792), and the Arbitrum Nova upgrade, which had an expected downtime of [2-4 hours](https://x.com/arbitrum/status/1564370880880381952).

## L2 Downtime Incidents (ordered chronologically)

## Arbitrum: September 14, 2021

This 45 minute downtime incident was from [a sudden increase in submitted transactions](https://medium.com/offchainlabs/arbitrum-one-outage-report-d365b24d49c). Details on this downtime incident are sparse, but perhaps that is not surprising given it was in the early days (first 6 months) of Arbitrum.

**Takeaway:** Prepare to handle sudden increases in transaction volume.

**Blocks:** Downtime started at block [828469](https://arbiscan.io/block/828469) until block [828470](https://arbiscan.io/block/828470).

## Arbitrum: January 9, 2022

This downtime incident may be unique because it was caused by hardware failure, not software failure. While backup measures for this scenario [were supposedly in place](https://offchain.medium.com/todays-arbitrum-sequencer-downtime-what-happened-6382a3066fbc), those measures failed due to a poorly timed software update.

**Takeaway:** Verify that backup measures are bulletproof, even in combined failure scenarios (i.e. hardware failure + software update).

**Blocks:** Downtime started at block [4509809](https://arbiscan.io/block/4509809) until block [4509828](https://arbiscan.io/block/4509828).

## Polygon: March 11, 2022

This downtime incident started as a scheduled maintenance window but lasted longer than most users expected. The exact duration is either around [5 hours](https://todayincrypto.com/news/the-polygon-network-is-back-online-after-a-5-hour-outage/) or [11 hours](https://cointelegraph.com/news/polygon-network-suffers-from-extended-service-outage-after-upgrade), depending whether you use blockchain explorer timestamps or news articles as an information source. [The main issue](https://forum.polygon.technology/t/pos-chain-downtime-and-heimdall-issue/2324) was in the consensus layer, where the different Heimdall validators (a Tendermint fork) were unable to reach 2/3 consensus. The Bor component of validators (a geth fork) was unaffected, but was not able to continue building blocks when consensus could not be reached. [A temporary hotfix](https://forum.polygon.technology/t/update-temporary-hotfix-deployed-to-resume-the-polygon-pos-chain/2364) helped get the chain moving again, but it is unclear what the long term solution was for the consensus issue in Heimdall.

**Takeaway:** Thoroughly test new software so that maintenance window operations go smoothly.

**Blocks:** Delays started at block [25811391](https://polygonscan.com/block/25811391) until block [25811439](https://polygonscan.com/block/25811439).

## zkSync: April 1, 2023

This incident resulted in over 4 hours of downtime, but the fix for the issue only took 5 minutes. One reason for the slow response time in responding to this issue is that the monitoring for the database that went down failed to work as expected. The protocol [tweeted](https://x.com/zksync/status/1642277357368090626) "The database health alert did not trigger because it could not connect to it to collect metrics." Another reason given for the delay is that all the team was at an off-site, so they did not have engineers in multiple time zones like normal.

**Takeaway:** Test that monitoring systems will trigger errors in all forms of failure modes. Make sure that the on-call engineer is always on-call, even during team off-sites.

**Blocks:** Downtime started at block [5308](https://explorer.zksync.io/batch/5308) until block [5312](https://explorer.zksync.io/batch/5312).

## Optimism: April 26, 2023

While the sequencer remained online, [this two-hour incident](https://github.com/ethereum-optimism/optimism/blob/f5221f4d1fae6f3da1bd4d1647e45f40e2b055c4/docs/postmortems/2023-04-26-transaction-delays.md) was caused by a sudden 10x increase in transactions that resulted in delayed inclusion of transactions due to longer delays in Optimism's read-only replica. Users experienced transaction confirmations delays of several minutes, even though the transactions had been processed. The solutions to handle this going forward were to add monitoring for such events and to design the then-upcoming Bedrock upgrade to handle such scenarios. Bedrock handles this scenario better by using a fixed two-second block time (instead of building a new block for every transaction) and replacing the read-only replica design with a more efficient way of indexing blocks using a P2P gossip network. Despite this incident having a [postmortem writeup by Optimism](https://github.com/ethereum-optimism/optimism/blob/f5221f4d1fae6f3da1bd4d1647e45f40e2b055c4/docs/postmortems/2023-04-26-transaction-delays.md), the incident is not listed as an incident on the [Optimism status page](https://status.optimism.io/).

![OP 2023 postmortem](../public/L2_sequencer/OP_incident_April_2023.png)

_The y-axis indicates the delay (in seconds) for indexing of blocks after the sequencer processed them. Note the increase on April 26._

**Takeaway:** Stress test systems with 10x or more than the average traffic.

**Blocks:** Unlike the other incidents in this list, the exact blocks impacted during this incident are unclear. The block timestamps on Optimism L2 remained consistent during the stated time period of this incident. Likewise, the [batch submitter](https://etherscan.io/address/0x6887246668a3b87F54DeB3b94Ba47a6f63F32985) on mainnet Ethereum continued submitting transactions during the stated time period without any unusual gaps. One possible explanation is that transactions could be processed faster by the sequencer than could be included by the batch submitter. In other words, the high transaction volume processed by the sequencer meant the batch submitter could not keep up without delayed inclusion of some transactions.

## Arbitrum: June 7, 2023

This [downtime incident](https://x.com/ArbitrumDevs/status/1667333516441403393) lasted nearly two hours. The problem was [not the sequencer](https://arbitrumfoundation.notion.site/June-7-2023-Batch-Poster-Outage-d49c50df42864c7b83521fd7aa5897f2), which actually continued working during the entirety of the incident. The issue was that the L1 batch poster (AKA [batch submitter](https://etherscan.io/address/0xc1b634853cb333d3ad8663715b08f41a3aec47cc) according to the etherscan label), which submits L2 data to mainnet Ethereum, stopped doing so. The reason no transactions were submitted to mainnet Ethereum was that a bug introduced in [PR #1640](https://github.com/OffchainLabs/nitro/pull/1640) caused the batch poster to use an incorrect block nonce, and when a certain transaction queue length was achieved, the batch poster halted. The configuration which caused the batch poster to halt was an old temporary workaround that should have been removed previously. To resolve this issue, the Redis storage was cleared and the batch poster was restarted with an older version without the newly introduced bug. Because the sequencer was functioning normally during this time, the timestamps of blocks on Arbitrum look normal, with many blocks produced during the period where the batch poster was down (blocks [98671050](https://arbiscan.io/block/98671050) to [98696350](https://arbiscan.io/block/98696350)). There are several PRs mitigating this issue ([#1682](https://github.com/OffchainLabs/nitro/pull/1682), [#1684](https://github.com/OffchainLabs/nitro/pull/1684), and [#1685](https://github.com/OffchainLabs/nitro/pull/1685)).

**Takeaway:** Remove any unnecessary logic that can lead to denial-of-service conditions, such as a paused chain.

**Blocks:** Downtime with the [Arbitrum batch poster](https://etherscan.io/address/0xc1b634853cb333d3ad8663715b08f41a3aec47cc) where no transactions were sent to mainnet Ethereum started at block [17427658](https://etherscan.io/block/17427658) until block [17428180](https://etherscan.io/block/17428180). It then underwent a restart with another period of delay and downtime between block [17428239](https://etherscan.io/block/17428239) and [17428486](https://etherscan.io/block/17428486).

## Arbitrum: December 15, 2023

This downtime incident lasted [just over an hour](https://status.arbitrum.io/clq6te1l142387b8n5bmllk9es), but the side effects went beyond sequencer downtime. The [root cause of the issue](https://github.com/ArbitrumFoundation/docs/blob/50ee88b406e6e5f3866b32d147d05a6adb0ab50e/postmortems/15_Dec_2023.md) was a combination of a surge in transactions from inscriptions combined with a syncing bug in the Ethereum consensus client that the sequencer relied on. If the consensus client had synced normally, as was the case after the downtime incident, the chain would likely have been able to handle the increased number of transactions. The bug caused the backlog to grow in a way that metrics did not properly capture, and presumably did not trigger alerts, resulting in some servers running out of memory and a halted sequencer.

To resolve the issue, a new sequencer build was deployed and the servers that ran out of memory were restarted. There are several commits that are related to the fix for this issue ([1](https://github.com/OffchainLabs/nitro/pull/2023), [2](https://github.com/OffchainLabs/nitro/pull/2024), [3](https://github.com/OffchainLabs/nitro/pull/2025), [4](https://github.com/OffchainLabs/nitro/commit/fd8d0b4295e638157b102e3cff91cf41a389c35c)).

A separate issue that resulted from this incident was [an imbalance in the gas pricing mechanism](https://github.com/ArbitrumFoundation/docs/blob/50ee88b406e6e5f3866b32d147d05a6adb0ab50e/postmortems/15_Dec_2023.md#l1-gas-pricing-issue). Users paid too little gas at the start of the surge of transactions, and the resulting imbalance caused gas fees to jump in an effort to compensate. The Arbitrum Foundation decided to pay off the gas fees deficit and investigate improvements to their gas pricing mechanics. For curious readers, a deeper technical examination of this incident was performed by [Dedaub](https://dedaub.com/blog/arbitrum-sequencer-outage/).

![Arbitrum Dec 15 2023 backlog](../public/L2_sequencer/Arbitrum_15_Dec_2023_backlog.png)

_After the sequencer fix was applied, the backlog was able to return to high levels without problems._

**Takeaway:** Monitoring and alerting should be applied to all parts of the system to properly identify anomalies in realtime. Prepare to handle sudden increases in transaction volume.

**Blocks:** Delays started at block [160384179](https://arbiscan.io/block/160384179) until block [160385961](https://arbiscan.io/block/160385961).

## zkSync: December 25, 2023

This incident involved over 4 hours of chain downtime. Similar to the bad luck of the April 1st zkSync downtime incident, the developer team was not working normal hours during this downtime event because of the Christmas holiday. The issue was caused by [a combination of two factors](https://x.com/zkSyncDevs/status/1739395228233335154). The first factor was that the operator did not calculate the state update exactly right. The second factor was an unnecessary safety state that was then triggered. The operator's output must match the state update calculated by L1 contracts, and because these were not the same, it triggered the safety state which caused the sequencer to wait for manual intervention to resolve the situation. The resolution was to fix the operator state update bug and to remove the safety state, which was designed for an earlier codebase version and was no longer necessary.

**Takeaway:** Remove any unnecessary logic that can lead to denial-of-service conditions, such as a paused chain.

**Blocks:** Downtime started at block [363034](https://explorer.zksync.io/batch/363034) until block [363035](https://explorer.zksync.io/batch/363035). The proving timestamp in the explorer is where the downtime is visible.

## Optimism: February 15, 2024

[This two-hour incident](https://status.optimism.io/clsmrawc31448hmlj2ja14ui3) required an upgrade to the sequencer. The initial fix for the issue did not resolve the chain stability issues, so a secondary fix was needed. One of the comments in the [incident notice states](https://status.optimism.io/clsmrawc31448hmlj2ja14ui3) "we are waiting for the sequencer to come back online", but the L2 timestamps actually don't show any sequencer downtime (unless the timestamps of the blocks in the explorer aren't accurate and are somehow implied). The downtime is visible in the irregular cadence of transactions from the [batch submitter](https://etherscan.io/address/0x6887246668a3b87F54DeB3b94Ba47a6f63F32985) on Ethereum L1. Node operators with a stuck node needed to [perform a full node restart](https://blockworks.co/news/optimism-outage-instabilities). It is unclear if any commits to the Optimism monorepo on February 15 are related to this downtime incident, but there is [one odd PR](https://github.com/ethereum-optimism/optimism/pull/9560) without any explanation that could be related.

**Takeaway:** None, the exact sequencer fix was not explained.

**Blocks:** Downtime and irregular transaction intervals with the [Optimism batch submitter](https://etherscan.io/address/0x6887246668a3b87F54DeB3b94Ba47a6f63F32985) started at block [19231012](https://etherscan.io/block/19231012) until block [19231545](https://etherscan.io/block/19231545). The most notable period of complete downtime started at block [19231012](https://etherscan.io/block/19231012) until block [19231145](https://etherscan.io/block/19231145). A shorter downtime period started at block [19231183](https://etherscan.io/block/19231183) until block [19231255](https://etherscan.io/block/19231255).

## Linea: June 2, 2024

This downtime incident of about 90 minutes may be the first known example of a purposeful pause of a L2 sequencer that was not a planned maintenance period. The cause of the sequencer pause was not a bug in the L2 chain, but rather a bug in a smart contract deployed on the chain. [The protocol team explained](https://x.com/LineaBuild/status/1797283402745573837) that the sequencer was shut down to minimize the financial impact to Linea TVL during a hack of the Velocore DEX. Not surprisingly, there [was some criticism](https://cointelegraph.com/news/linea-hack-highlights-need-for-decentralization-on-ethereum-layer-twos) after this event that a voluntary pause of an L2 chain could happen due to a unilateral decision by the protocol team.

**Takeaway:** If an L2 chain maintains a policy of pausing the chain in the event of a hack, users should be informed of this policy in advance.

**Blocks:** Downtime started at block [5081800](https://lineascan.build/block/5081800) until block [5081801](https://lineascan.build/block/5081801).

## Data Collection Methods

If a researcher wishes to identify L2 downtime events using only on-chain data, there are a couple of options. The easiest shortcut available is to use the Average Block Time Chart that is found on some L2 etherscan pages. Some chains (Optimism, Arbitrum) do not have this chart currently (although [Arbitrum used to](https://web.archive.org/web/20240809144629/https://arbiscan.io/charts) earlier this month, so maybe it's only temporarily gone?). If the L2 etherscan site does have this data, anomalies in the chart will normally be caused by downtime incidents. One example is shown below, where the [Polygon chart](https://polygonscan.com/chart/blocktime) shows the increased block times due to downtime on March 10-11 2022.

![Polygon downtime](../public/L2_sequencer/Polygon-blocktime.png)

A second option to identifying downtime events can rely on data collection from public blockchain RPC endpoints. The basic idea is to query the timestamp of a sequence of blocks and check whether the difference in block timestamps is outside of the normal range. The difficulty here is in identifying what the normal range is. Even mainnet Ethereum does not generate a block every 12 seconds like clockwork. If mainnet Ethereum [misses a slot](https://blog.ethereum.org/2021/11/29/how-the-merge-impacts-app-layer#block-time), there might be a 24 second difference between block timestamps, or even more if multiple slots are missed in sequence. For readers that prefer hard proof, missed slots are visualized as red squares on [beaconcha.in](https://beaconcha.in/). Two examples are mainnet Ethereum blocks [19521620](https://etherscan.io/block/19521620) and [19522751](https://etherscan.io/block/19522751) which have a gap of 36 seconds from the previous block. These blocks were identified using [this small custom script](https://gist.github.com/yaudit/1883784c1771b3f47271413ede7d8b52) that proved very useful in identifying the relevant block numbers for each incident below. A more advanced tool to find block timestamp anomalies is [here](https://github.com/shotaronowhere/special-l2-relativity) and mentioned in [this detailed twitter thread](https://x.com/shotaronowhere/status/1666720771421671426).

The primary data collection method used to find the incidents below was manual searching on search engines with different keywords. Some AI search tools assisted as well. No L2 chains examined were found to have a single resource showing all the downtime events for the chain. Some chains have status pages ([Optimism](https://status.optimism.io), [Arbitrum](https://status.arbitrum.io/), [Linea](https://linea.statuspage.io), [zkSync](https://uptime.com/statuspage/zkSync), etc.) but they are often light on details about downtime incidents. Detailed postmortems are often only found in twitter threads soon after the downtime incident rather than on the official L2 status page. Understanding the root cause of L2 downtime is further hindered by the closed source code of most L2 sequencers. It's unfortunate that L2s collectively holding billions of TVL rely on centralized and closed source sequencers. Therefore, when an L2 development team explains that they have upgraded the sequencer, there is no public "source of truth" where users can see the changes themselves - instead, users must trust that the L2 devs know what they are doing.

# Conclusion

Overall the information about L2 downtime incidents is hard to find, often unclear when it comes to technical details, and not stored in consistent locations. One example of this is how one zkSync downtime announcement came from their [@zksync](https://x.com/zksync/status/1642277357368090626) twitter account while another one came from their [@zkSyncDevs](https://x.com/zkSyncDevs/status/1739395228233335154) twitter account. Similarly, Optimism has created a [postmortems folder](https://github.com/ethereum-optimism/optimism/tree/develop/docs/postmortems) in their repository, but it is not updated for new downtime incidents like the February 15 2024 incident. While the marketing teams of these L2 chains may wish to hide anything perceived as a problem with the chain, the lack of organized information sharing results in a lost opportunity for technical information sharing. Such information sharing could be useful between different L2 chains, but also for engineers internal to the L2 chain who are less informed about the details of past downtime incidents. Given that the recent inscriptions craze took down [half a dozen chains](https://cointelegraph.com/news/inscriptions-evm-frenzy-clogs-up-blockchains), there is some distance to go before L2 chains can become as robust as mainnet Ethereum. At the same time, L2 chains offer a playground to move faster and try more risky solutions than mainnet Ethereum would adopt, so it is understandable that this is where issues would appear.

An honorable mention also goes out to Stacks, a Bitcoin L2, that had a [9-hour downtime incident](https://unchainedcrypto.com/bitcoin-l2-stacks-back-up-after-9-hour-outage/) on June 13-14 2024. Regardless of where the tech stack is built, L2 systems are hard. No technical details were given for this particular incident.

Some suggestions I would offer L2 chains regarding their post-mortem writeups include:

- In postmortems, clearly specify the timezone of any timestamps related to an incident. It's annoying that some writeups use US Eastern Time when all blockchain explorers use UTC.
- Compile incident postmortems in a single location, to avoid twitter threads getting lost to history.
- Specify the block numbers where an incident starts and ends (the block numbers in this article were obtained manually).

One point to note is that the developers in the Ethereum ecosystem have pointed to [Solana downtime](https://thechainsaw.com/finance/solana-down-network-freeze-ten-times-recover/) as an issue with Solana's design. However, comparing the slow L1 mainnet Ethereum chain (counted by tps) to the much faster Solana chain is potentially less accurate than comparing L2 chains to Solana. Comparing the downtime incidents of L2 chains built on Ethereum is a better comparison to Solana's downtime incidents.
