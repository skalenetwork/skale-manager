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
