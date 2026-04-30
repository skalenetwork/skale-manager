---
applyTo: "test/**/*.ts"
---

When reviewing TypeScript test files, apply these rules:

**Fixture pattern**
- Tests must use the snapshot-based `fastBeforeEach` helper from `test/tools/mocha.ts`, not Hardhat's `loadFixture`.
- Heavy setup (deploying contracts, granting roles) goes inside a `before` block. `fastBeforeEach` handles snapshot/restore per test.

**Deployment**
- Deploy contracts via the helper factories in `test/tools/deploy/` (e.g., `deployContractManager`, `deploySkaleManager`). Do not call `ethers.deployContract` directly for managed contracts.
- After deploying, register contracts in ContractManager with the exact string key expected by `Permissions` modifiers.

**Assertions**
- Use `revertedWithCustomError(contract, "ErrorName")` for expected reverts — not `.rejectedWith("string")`.
- Use `chai-as-promised` patterns: `await expect(tx).to.be...`.

**Coverage expectations**
- Every new public/external Solidity function needs at least: a happy-path test, a revert test for each access-control guard, and edge-case tests for boundary values.
- If tests are missing, comment with the specific test cases that should be added. Identify relevant paths through the code that need coverage.

**Style**
- Use `describe` / `it` blocks. Keep descriptions concise and behavior-focused.
- Use typechain-generated types from `typechain-types/`.
