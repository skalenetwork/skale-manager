<!-- SPDX-License-Identifier: (AGPL-3.0-only OR CC-BY-4.0) -->

# List of all administrative functions

## OWNER

| Contract                | Function                            |
| ----------------------- | ----------------------------------- |
| ConstantsHolder         | `setPeriods`                        |
| ConstantsHolder         | `setCheckTime`                      |
| ConstantsHolder         | `setLatency`                        |
| ConstantsHolder         | `setMSR`                            |
| ConstantsHolder         | `setLaunchTimestamp`                |
| ConstantsHolder         | `setRotationDelay`                  |
| ConstantsHolder         | `setProofOfUseLockUpPeriod`         |
| ConstantsHolder         | `setProofOfUseDelegationPercentage` |
| ConstantsHolder         | `setLimitValidatorsPerDelegator`    |
| ConstantsHolder         | `setSchainCreationTimeStamp`        |
| ConstantsHolder         | `setMinimalSchainLifetime`          |
| ConstantsHolder         | `setLimitValidatorsPerDelegator`    |
| ContractManager         | `setContractsAddress`               |
| NodeRotation            | `skipRotationDelay`                 |
| SlashingTable           | `setPenalty`                        |
| DelegationPeriodManager | `setDelegationPeriod`               |
| TokenState              | `removeLocker`                      |
| TokenState              | `addLocker`                         |
| ValidatorService        | `disableWhitelist`                  |

## ADMIN

| Contract         | Function             |
| ---------------- | -------------------- |
| SkaleManager     | `deleteSchainByRoot` |
| Punisher         | `forgive`            |
| ValidatorService | `enableValidator`    |
| ValidatorService | `disableValidator`   |

## SELLER ADMIN

| Contract           | Function                  |
| ------------------ | ------------------------- |
| TokenLaunchManager | `approveBatchOfTransfers` |
| TokenLaunchManager | `completeTokenLaunch`     |
| TokenLaunchManager | `changeApprovalAddress`   |
| TokenLaunchManager | `changeApprovalValue`     |
| TokenLaunchManager | `_approveTransfer`        |

## SCHAIN CREATOR ROLE

| Contract | Function                |
| -------- | ----------------------- |
| Schain   | `addSchainByFoundation` |
