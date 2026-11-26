<!-- cspell:words collateralized -->
# BountyStudy — Findings Summary (from latest run)

Source: `yarn test test/BountyStudy/BountyStudy.ts`
Status: **5 passing**

This document focuses on the **ideas and outcomes** of each test, not a line-by-line replay.

---

## 1) Test preconditions

### Common baseline (all scenarios)
- Delegations: `39M + 1M = 40M SKL`
- `MSR = 20M`  → effective ratio: `40M / 20M = 2`
- Two active nodes exist: `node0`, `node1`
- Bounty reduction enabled

### Extra setup block (`with extra 20M delegation`)
- Adds another `20M` delegation (becomes effective after month transition)
- Effective ratio target in that branch: `60M / 20M = 3`

---

## 2) Scenario goals and observed outcomes

Numbers are shown in **~M SKL** for readability.

When an undelegation is created, it is created during month 1 and becomes effective in month 2

## A) Baseline: no undelegation vs undelegation request (order fixed `0 → 1`)

Goal:
- Check whether undelegation request changes payout pattern over month1/month2/month3.


Observed totals and node split:

| Month | No undelegation split (`node0` / `node1`) | Total | Undelegation sent split (`node0` / `node1`) | Total | Result |
|---|---:|---:|---:|---:|---|
| M1 | `~32.1M / ~32.1M` | `~64.2M` | `~32.1M / ~32.1M` | `~64.2M` | same |
| M2 | `~16.0M / ~16.0M` | `~32.1M` | `~32.1M / 0` | `~32.1M` | same total, different split |
| M3 | `~16.0M / ~16.0M` | `~32.1M` | `~32.1M / 0` | `~32.1M` | same total, different split |

Takeaway:
- Undelegation request does not change month1 payout.
- In month2/month3 it changes **who gets paid**, not the branch total in this claim order.

## B) Baseline: undelegation requested, compare claim order (`0 → 1` vs `1 → 0`)

Goal:
- Measure order sensitivity after undelegation request.

Observed split, totals, and inferred carry-over to next month:

| Month | `0 → 1` split (`node0` / `node1`) | Total | Left in `_epochPool` for next month | `1 → 0` split (`node0` / `node1`) | Total | Left in `_epochPool` for next month | Order effect |
|---|---:|---:|---:|---:|---:|---:|---|
| M1 | `~32.1M / ~32.1M` | `~64.2M` | `~0M` | `~32.1M / ~32.1M` | `~64.2M` | `~0M` | none |
| M2 | `~32.1M / 0` | `~32.1M` | `~0M` | `0 / ~16.0M` (**50% penalty**) | `~16.0M` | `~16.0M` | strong |
| M3 | `~32.1M / 0` | `~32.1M` | `~0M` | `0 / ~24.1M` (**50% penalty**)| `~24.1M` | `~8.0M` | strong |

Takeaway:
- Month1 is order-invariant.
- Month2 and Month3 are order-sensitive in baseline mode. Penalty is applied **IF** node 1 requests first.

`_epochPool` carry-over values above are inferred from unpaid deltas. Test does not print these values

## C) Extra 20M setup: no undelegation vs undelegation request (order fixed `0 → 1`)

Goal:
- Check effect of crossing to 60M delegated (ratio 3) and then requesting undelegation.

Observed totals and node split:

| Month | No undelegation split (`node0` / `node1`) | Total | Undelegation sent split (`node0` / `node1`) | Total | Result |
|---|---:|---:|---:|---:|---|
| M1 | `~32.1M / ~32.1M` | `~64.2M` | `~32.1M / ~32.1M` | `~64.2M` | same |
| M2 | `~10.7M / ~10.7M` | `~21.4M` | `~16.0M / ~16.0M` | `~32.1M` | request path higher |
| M3 | `~14.3M / ~14.3M` | `~28.5M` | `~16.0M / ~16.0M` | `~32.1M` | request path higher |

Takeaway:
- In this setup, undelegation request increases month2/month3 paid totals vs the no-request path.
- Under the 60M delegation, bounty is split by the 2 existing nodes. With 60M, bounty is split by 3 even though only 2 exist.

## D) Extra 20M setup: compare order (`0 → 1` vs `1 → 0`)

Goal:
- Check order sensitivity in the extra-20M branch.

Observed totals (same in both orders):
- M1: `~64.2M`
- M2: `~21.4M`
- M3: `~28.5M`

Takeaway:
- This setup is order-invariant across all three months.
- In M2 and M3 the stake is distributed by 3 nodes while only 2 exist and can claim

---

## 3) Final practical conclusions

- Penalty is **only** applied when nodes are **under-collateralized**, meaning there are more nodes than it should for a validator.
- Penalty can **always** be avoided by validators as long as bounties are collected from node 0 to node N.
- If nodes are **over-collateralized**, the bounty is split by more nodes than existing ones, which leaves some bounty in the pool to be distributed in the next epoch. This creates a harsh loss for validators.
