# SKALE Manager Architecture

## Repository Architecture

- `contracts/` – Core Solidity contracts for SKALE Manager and its modules (nodes, Schains, delegation, DKG, wallets, utils, interfaces, tests, and third‑party code).
   - `contracts/delegation/` – Delegation, validator, and staking–related contracts.
   - `contracts/dkg/` – Distributed Key Generation (DKG) and BLS‑related contracts.
   - `contracts/test/` – Helper contracts used only in tests.
   - `contracts/utils/` – Common utility libraries and helpers.
   - `contracts/thirdparty/` – Third‑party Solidity dependencies.
- `migrations/` – Hardhat deployment and upgrade scripts for SKALE Manager contracts.
- `test/` – TypeScript test suite covering core contracts and flows.
- `artifacts/` – Auto‑generated Hardhat build artifacts (ABIs, bytecode, build info).
- `scripts/` – Helper scripts for development and CI pipelines (docs generation, bytecode size, ABI generation, test deploy/upgrade, etc.).
- `docs/` – Contract documentation templates, helpers, and specs.
- `gas/` – Gas usage experiments and benchmarks.
- `long-test/` – Longer‑running or scenario tests.
- `dictionaries/` – Custom SKALE dictionary repository used by cspell for Solidity and SKALE‑specific terms.

## Main Smart Contracts

Below is a high‑level overview of the main contracts in this repository and their responsibilities.

- `SkaleManager.sol` – Central coordinator that:
  - Receives SKL deposits to create Schains and forwards encoded parameters to `Schains`.
  - Orchestrates node registration and node exit lifecycle in cooperation with `Nodes` and `NodeRotation`.
  - Computes validator bounties via `BountyV2` and mints SKL rewards through `SkaleToken`.

- `Nodes.sol` – Manages node registry and operational state:
  - Tracks all nodes, their space capacity, IP/domain, and validator ownership.
  - Enforces minimum staking requirements before creating/maintaining nodes via `DelegationController` and `ConstantsHolder`.
  - Supports state transitions (Active, Leaving, Left, In_Maintenance) and visibility/compliance flags.

- `Schains.sol` – Controls SKALE Chains (Schains):
  - Creates and deletes Schains based on deposits, lifetime, and type using pricing from `ConstantsHolder`.
  - Interacts with `SchainsInternal`, `NodeRotation`, `SkaleDKG`, and `Wallets` to assign nodes and manage chain lifecycle.
  - Provides restart flows when DKG fails and needs a new node group.

- `SchainsInternal.sol` – Internal Schain state:
  - Stores per‑Schain configuration, node groups, and placement information.
  - Exposes internal helpers for `Schains`, `NodeRotation`, and related modules.

- `SkaleDKG.sol` and `dkg/*` – Distributed Key Generation (DKG) engine:
  - Orchestrates multi‑phase DKG protocol for each Schain.
  - Integrates with `KeyStorage`, `SkaleVerifier`, and `NodeRotation` to manage BLS keys and rotate nodes.

- `KeyStorage.sol` – DKG key store:
  - Persists BLS public keys and group keys per Schain.

- `SkaleVerifier.sol` – Cryptographic verification:
  - Verifies group signatures and DKG results using elliptic‑curve operations (`G1Operations`, `G2Operations`).

- `Wallets.sol` – Network and Schain wallets:
  - Manages balances used for gas refunds and operational costs.
  - Implements `refundGasByValidator` to reimburse transactions that keep the network running.

- `BountyV2.sol` – Validator rewards and emission:
  - Computes per‑node bounty amounts from delegated stake and network parameters.
  - Feeds final bounty amounts back to `SkaleManager` for SKL minting and distribution.

- `DelegationController.sol` and `ValidatorService.sol` – Staking and validator registry:
  - Track validator stakes and delegations, including lockups and reward shares.
  - Expose authorization checks used by `Nodes` to ensure only sufficiently‑staked validators can operate nodes.

- `ConstantsHolder.sol` – Network constants:
  - Stores configuration like Minimum Staking Requirement (MSR), chain pricing, rotation delays, and timing values.

- `NodeRotation.sol` – Node rotation across Schains:
  - Manages how nodes are rotated into/out of Schain groups to preserve randomness and security.

- `SkaleToken.sol` – SKL token contract:
  - ERC777‑compatible token used for staking, delegation, chain rental, and bounty minting.

- `ContractManager.sol` & `Permissions.sol` – Upgradeability and access control:
  - `ContractManager` stores the registry of contract addresses used throughout SKALE Manager.
  - `Permissions` adds `allow("ContractName")` guards and role‑based permissions on top of OpenZeppelin access control.
