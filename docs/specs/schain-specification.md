<!-- SPDX-License-Identifier: (AGPL-3.0-only OR CC-BY-4.0) -->

# Schain Specification

<!-- vscode-markdown-toc -->

-   1.  [Overview](#Overview)
-   2.  [Smart contracts in SKALE Manager](#SmartcontractsinSKALEManager)
        	_ 2.1. [Schains](#Schains)
        	_ 2.2. [SchainsInternal](#SchainsInternal)
        	_ 2.3. [SkaleManager](#SkaleManager)
-   3.  [Schain functions](#Schainsfunctions)
        	_ 3.1. [Schains.addSchain](#Schains.addSchain)
        	_ 3.2. [Schains.addSchainByFoundation](#Schains.addSchainByFoundation)
        	_ 3.3. [Schains.deleteSchain](#Schains.deleteSchain)
        	_ 3.4. [Schains.deleteSchainByRoot](#Schains.deleteSchainByRoot)
        	_ 3.5. [Schains.restartSchainCreation](#Schains.restartSchainCreation)
        	_ 3.6. [Schains.verifySchainSignature](#Schains.verifySchainSignature)
        	_ 3.7. [SkaleManager.tokenReceived](#SkaleManager.tokenReceived)
        	_ 3.8. [SkaleManager.deleteSchain](#SkaleManager.deleteSchain)
        	\* 3.9. [SkaleManager.deleteSchainByRoot](#SkaleManager.deleteSchainByRoot)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->

<!-- /vscode-markdown-toc -->

## 1. <a name='Overview'></a>Overview

Schain(SKALE-chain) - randomly generated set of nodes.

Schains contract is responsible for managing schains(create or remove)

## 2. <a name='SmartcontractsinSKALEManager'></a>Smart contracts in SKALE Manager

### 2.1. <a name='Schains'></a>Schains

The main contract of the Schains logic

-   Creates and remove Schains
-   Verifies schain signature

### 2.2. <a name='SchainsInternal'></a>SchainsInternal

-   Nodes of Schains management
-   Stores data of Schain
-   Randomly selecting nodes to Schain

### 2.3. <a name='SkaleManager'></a>SkaleManager

-   Initial entry of Schain creation
-   Initial entry of Schain removing

## 3. <a name='Schainsfunctions'></a>Schains functions

### 3.1. <a name='Schains.addSchain'></a>Schains.addSchain

Input params:

-   from - owner of Schain
-   deposit - SKL token amount
-   data - encoded Schains params(lifetime, type of Schain, nonce, name of Schain)

Description:

Create an Schain in Skale-Manager smart contracts system
Could be called from SkaleManager

### 3.2. <a name='Schains.addSchainByFoundation'></a>Schains.addSchainByFoundation

Input params:

-   lifetime - lifetime of Schain
-   typeOfSchain - type of Schain(1, 2, 3, 4 or 5)
-   nonce - random number to emit an event with this number to identify schain
-   name - name of Schain

Description:

Create an Schain in Skale-Manager smart contracts system from SCHAIN_CREATOR_ROLE

### 3.3. <a name='Schains.deleteSchain'></a>Schains.deleteSchain

Input params:

-   from - owner of Schain
-   name - name of Schain

Description:

Delete schain from Skale-Manager smart contract system
Could be called from SkaleManager

### 3.4. <a name='Schains.deleteSchainByRoot'></a>Schains.deleteSchainByRoot

Input params:

-   name - name of Schain

Description:

Delete schain from Skale-Manager smart contract system by Admin role
Could be called from SkaleManager

### 3.5. <a name='Schains.restartSchainCreation'></a>Schains.restartSchainCreation

Input params:

-   name - name of Schain

Description:

Restart Schain creation after DKG fails completely and enough nodes to rotate in

### 3.6. <a name='Schains.verifySchainSignature'></a>Schains.verifySchainSignature

Input params:

-   signatureA, signatureB - Fp2 point
-   hash - hash of message
-   counter - minimal non negative integer n such that (HashToInt(hash) +n)3 + 3 is a quadratic residue in Fp (y2=x3+3 is G1 curve equation)
-   hashA, hashB - G1 point hash of message
-   schainName - name of SKALE-chain

Description:

To verify signature by the already stored BLS master public key of schain

### 3.7. <a name='SkaleManager.tokenReceived'></a>SkaleManager.tokenReceived

Input params:

-   from - sender
-   to - receiver(this contract)
-   value - amount of SKL tokens
-   userData - data of the transfer

Description:

ERC777.Recipient function, allow to directly send SKL tokens to the SkaleManager contract
Could receive only from SkaleToken contract

### 3.8. <a name='SkaleManager.deleteSchain'></a>SkaleManager.deleteSchain

Input params:

-   name - name of Schain

Description:

Delete schain from Skale-Manager smart contract system 

### 3.9. <a name='SkaleManager.deleteSchainByRoot'></a>SkaleManager.deleteSchainByRoot

Input params:

-   name - name of Schain

Description:

Delete schain from Skale-Manager smart contract system by Admin role