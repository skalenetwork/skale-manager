---
applyTo: "**/*.sol"
---

When reviewing Solidity files in this repository, apply these rules.
Files under `contracts/test/` are excluded from stricter rules rules.
Files under  `contracts/thirdparty/` do not need to be checked - Ideally they should never have ANY changes. If a PR includes changes to third-party code, flag that it.

**Upgrade safety**
- For contracts deployed behind a proxy, never add a `constructor` that writes state. Use `initialize` + `initializer` modifier. Non-proxied contracts (e.g., `SkaleToken`) may use constructors.
- Never reorder, rename, or remove existing storage variables. New variables go in a new storage gap slot or at the end of variable declarations. If layouts are reused, ensure they are 100% compatible.
- If a contract inherits `Permissions`, confirm `initialize` calls `Permissions.initialize(contractManagerAddress)`.
- Confirm existence and safety of reinitializers if there are any.

**Access control**
- All state-changing external/public functions must be protected by a `Permissions` modifier (`allow`, `allowTwo`, `allowThree`, `onlyOwner`) or an explicit role check.
- Verify the string key passed to `allow("ContractName")` matches the exact registered name in ContractManager.

**Events**
- State-changing functions must emit events. Off-chain indexers depend on them — a missing event is a bug.

**Error handling**
- Use custom errors, not `require(condition, "string")`. Shared errors are in `CommonErrors.sol`.
- Revert with descriptive custom errors that include relevant parameters (e.g., `GroupIndexIsInvalid(index)`).

**Gas**
- Flag storage reads inside loops (cache in memory), redundant SLOADs, and unbounded iterations over dynamic arrays.

**Style**
- License: `SPDX-License-Identifier: AGPL-3.0-only` for first-party contracts.
- Use named imports: `import { Foo } from "./Foo.sol";`
- NatSpec is required on all public/external functions and events.
- Follow the module pattern: `contract Name is Permissions, IName { ... }`.
