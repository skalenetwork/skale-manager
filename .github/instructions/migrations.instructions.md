---
applyTo: "migrations/**/*.ts"
---

When reviewing migration scripts, apply these rules:

**Deploy scripts (`deploy.ts`)**
- Every new contract must be deployed via `upgrades.deployProxy` and registered in ContractManager with `setContractsAddress(name, address)`.
- The name passed to `setContractsAddress` must match the string key that `Permissions` modifiers use in `allow("Name")`. Check `getNameInContractManager` for aliases (e.g., `BountyV2` → `Bounty`).
- Verify `getInitializerParameters` returns the correct arguments for new contracts.

**Upgrade scripts (`upgrade.ts`)**
- If a contract adds new storage variables, confirm the upgrade preserves layout compatibility (no reorder/removal).
- If a contract adds a `reinitializer(n)`, the upgrade must call it — either via `upgradeAndCall` or in `postUpgrade.ts`. A reinitializer that is never called is a silent bug.
- If a contract is renamed or a new contract replaces an old one, verify the ContractManager registration is updated.
- Check that `contractNamesToUpgrade` is inclusive of all contracts.

**General**
- Never hardcode addresses. Use ContractManager lookups or deployment artifacts.
- Migration scripts run once and are irreversible on mainnet. Review with the same rigor as contract code.
