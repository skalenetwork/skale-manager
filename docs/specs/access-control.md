<!-- SPDX-License-Identifier: (AGPL-3.0-only OR CC-BY-4.0) -->

# List of all administrative functions

## OWNER (DEFAULT ADMIN ROLE)

| Contract        	| Function                  	|
|-----------------	|---------------------------	|
| ContractManager 	| `setContractsAddress`     	|
| Nodes           	| `changeIP`                	|
| SkaleManager    	| `setVersion` ; `nodeExit` 	|


## ADMIN ROLE

| Contract 	| Function   	|
|----------	|------------	|
| Nodes    	| `changeIP` 	|

## SCHAIN CREATOR ROLE

| Contract 	| Function                	|
|----------	|-------------------------	|
| Schains  	| `addSchainByFoundation` 	|


## SCHAIN REMOVAL ROLE

| Contract     	| Function             	|
|--------------	|----------------------	|
| SkaleManager 	| `deleteSchainByRoot` 	|


## BOUNTY REDUCTION MANAGER ROLE

| Contract 	| Function                                           	|
|----------	|----------------------------------------------------	|
| BountyV2 	| `enableBountyReduction`;  `disableBountyReduction` 	|

## LOCKER MANAGER ROLE

| Contract   	| Function                     	|
|------------	|------------------------------	|
| TokenState 	| `addLocker`;  `removeLocker` 	|

## SCHAIN TYPE MANAGER ROLE

| Contract        	| Function                                                        	|
|-----------------	|-----------------------------------------------------------------	|
| SchainsInternal 	| `addSchainType`;  `removeSchainType`;  `setNumberOfSchainTypes` 	|

## VALIDATOR MANAGER ROLE

| Contract         	| Function                                                    	|
|------------------	|-------------------------------------------------------------	|
| ValidatorService 	| `enableValidator`;  `disableValidator`;  `disableWhitelist` 	|

## NODE MANAGER ROLE

| Contract 	| Function                                                                              	|
|----------	|---------------------------------------------------------------------------------------	|
| Nodes    	| `setNodeInMaintenance`;  `removeNodeFromInMaintenance`;  `setDomainName`;  `initExit` 	|

## COMPLIANCE ROLE

| Contract 	| Function                                  	|
|----------	|-------------------------------------------	|
| Nodes    	| `setNodeIncompliant`;  `setNodeCompliant` 	|

## CONSTANTS HOLDER MANAGER ROLE

| Contract        	| Function                                                                                                                                                                                                                                                                                          	|
|-----------------	|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------	|
| ConstantsHolder 	| `setPeriods`;  `setCheckTime`;  `setLatency`;  `setMSR`;  `setLaunchTimestamp`;  `setRotationDelay`;  `setProofOfUseLockUpPeriod`;  `setProofOfUseDelegationPercentage`;  `setLimitValidatorsPerDelegator`;  `setSchainCreationTimeStamp`;  `setMinimalSchainLifetime`;  `setComplaintTimelimit`  	|

## DEBUGGER ROLE

| Contract     	| Function            	|
|--------------	|---------------------	|
| NodeRotation 	| `skipRotationDelay` 	|

## FORGIVER ROLE

| Contract 	| Function  	|
|----------	|-----------	|
| Punisher 	| `forgive` 	|

## DELEGATION PERIOD SETTER ROLE

| Contract                	| Function              	|
|-------------------------	|-----------------------	|
| DelegationPeriodManager 	| `setDelegationPeriod` 	|

## PENALTY SETTER ROLE

| Contract      	| Function     	|
|---------------	|--------------	|
| SlashingTable 	| `setPenalty` 	|

## GENERATION MANAGER ROLE

| Contract        	| Function        	|
|-----------------	|-----------------	|
| SchainsInternal 	| `newGeneration` 	|

## SYNC MANAGER ROLE

| Contract    	| Function                       	|
|-------------	|--------------------------------	|
| SyncManager 	| `addIPRange`;  `removeIPRange` 	|
