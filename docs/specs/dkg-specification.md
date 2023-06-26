<!-- SPDX-License-Identifier: (AGPL-3.0-only OR CC-BY-4.0) -->

# DKG Specification

<!-- vscode-markdown-toc -->

- 1.  [Overview](#Overview)
- 2.  [Smart contracts in SKALE Manager](#SmartContractsInSKALEManager)
         _2.1. [SkaleDKG](#SkaleDKG)
         _ 2.2. [ECDH (Elliptic Curve Diffie-Hellman)](#ECDHEllipticCurveDiffie-Hellman)
         _2.3. [Decryption](#Decryption)
         _ 2.4. [KeyStorage](#KeyStorage)
         _2.5. [SkaleVerifier](#SkaleVerifier)
         _ 2.6. [Schains](#Schains)
         _2.7. [utils/FieldOperations](#utilsFieldOperations)
         _ 2.8. [utils/Precompiled](#utilsPrecompiled)
- 3.  [DKG functions](#DKGfunctions)
         _3.1. [SkaleDKG.broadcast](#SkaleDKG.broadcast)
         _ 3.2. [SkaleDKG.alight](#SkaleDKG.alight)
         _3.3. [SkaleDKG.complaint](#SkaleDKG.complaint)
         _ 3.4. [SkaleDKG.response](#SkaleDKG.response)
         _3.5. [ECDH.deriveKey](#ECDH.deriveKey)
         _ 3.6. [Decryption.decrypt](#Decryption.decrypt)
         _3.7. [KeyStorage.adding](#KeyStorage.adding)
         _ 3.8. [SkaleVerifier.verify](#SkaleVerifier.verify)
         \* 3.9. [Schains.verifySchainSignature](#Schains.verifySchainSignature)
- 4.  [DKG procedure](#DKGprocedure)
         _4.1. [Definitions:](#Definitions:)
         _ 4.2. [Complaint types](#ComplaintTypes)
         _4.3. [Successful scenario](#SuccessfulScenario)
          _ 4.3.1. [Broadcast and Reading phase](#BroadcastAndReadingPhase)
          _4.3.2. [Alright phase](#AlrightPhase)
          _ 4.3.3. [Finish](#Finish)
         _4.4. [Alternative scenario (complaint type 1)](#AlternativeScenarioComplaintType1)
          _ 4.4.1. [Broadcast and Reading phase](#BroadcastAndReadingPhase-1)
          _4.4.2. [Complaint phase](#ComplaintPhase)
          _ 4.4.3. [Finish](#Finish-1)
         _4.5. [Alternative scenario (complaint type 2)](#AlternativeScenarioComplaintType2)
          _ 4.5.1. [Broadcast and Reading phase](#BroadcastAndReadingPhase-1)
          _4.5.2. [Alright phase](#AlrightPhase-1)
          _ 4.5.3. [Complaint phase](#ComplaintPhase-1)
          _4.5.4. [Finish](#Finish-1)
         _ 4.6. [Alternative scenario (complaint type 3)](#AlternativeScenarioComplaintType3)
          _4.6.1. [Broadcast and Reading phase](#BroadcastAndReadingPhase-1)
          _ 4.6.2. [Complaint phase](#ComplaintPhase-1)
          _4.6.3. [Complaint phase](#ComplaintPhase-1)
          _ 4.6.4. [Finish](#Finish-1)
         _4.7. [Alternative scenario (complaint type 4)](#AlternativeScenarioComplaintType4)
          _ 4.7.1. [Broadcast and Reading phase](#BroadcastAndReadingPhase-1)
          _4.7.2. [Complaint phase](#ComplaintPhase-1)
          _ 4.7.3. [Response phase](#ResponsePhase)
          \* 4.7.4. [Finish](#Finish-1)

<!-- vscode-markdown-toc-config
	numbering=true
	autoSave=true
	/vscode-markdown-toc-config -->

<!-- /vscode-markdown-toc -->

## 1. <a name='Overview'></a>Overview

DKG (Distributed Key Generation) is a method to generate secret keys across several parties.

In SKALE protocol we use DKG to distribute BLS keys across nodes which are connected to one SKALE-chain. Connected nodes should send generated data (by off-chain source) to SkaleDKG smart contract. Also each node should get data from every other node by reading events with data. If a node forgets to send data or additional required transactions, other nodes have responsibility to send a transaction to SkaleDKG smart contract and inform about malicious node(s).

## 2. <a name='SmartContractsInSKALEManager'></a>Smart contracts in SKALE Manager

### 2.1. <a name='SkaleDKG'></a>SkaleDKG

The main contract of the whole DKG procedure

- Initiate DKG procedure
- Receive crypto data
- Find malicious part if Exist

### 2.2. <a name='ECDHEllipticCurveDiffie-Hellman'></a>ECDH (Elliptic Curve Diffie-Hellman)

- Derives key
- Used to find malicious part

### 2.3. <a name='Decryption'></a>Decryption

- provides encrypt and decrypt function
- Current method - XOR decryption
- Every time DKG proceeds - parts use different keys

### 2.4. <a name='KeyStorage'></a>KeyStorage

- Calculate and store BLS master public keys

### 2.5. <a name='SkaleVerifier'></a>SkaleVerifier

- Verify BLS signature by BLS master public key

### 2.6. <a name='Schains'></a>Schains

- Verify BLS signature by stored BLS master public key and use SkaleVerifier.verify

### 2.7. <a name='utilsFieldOperations'></a>utils/FieldOperations

- All use Fp2 and G2 operations also some G1 functions
- All details about field Fp2 and groups G1 and G2 can be found in the Ethereum Yellow Paper (Appendix E.1 zkSNARK Related Precompiled Contracts)

### 2.8. <a name='utilsPrecompiled'></a>utils/Precompiled

- Provides precompiled contracts usage
- All details about precompiled contracts can be  found in the Ethereum Yellow Paper (Appendix E.1 zkSNARK Related Precompiled Contracts)

## 3. <a name='DKGfunctions'></a>DKG functions

### 3.1. <a name='SkaleDKG.broadcast'></a>SkaleDKG.broadcast

Input params:

- groupIndex - group identifier
- nodeIndex - node ID
- verificationVector - list of G2 points, used for for DKG verification and calculating BLS master public key on Solidity (add first elements of verificationVector by each participant)
- secretKeyContribution - list of objects(encrypted key share(number) concatenated with public key for ECDH decryption)

Description:

To store and add first element of verificationVector and emit BroadcastAndKeyShare event with all input params to share it with other participants

### 3.2. <a name='SkaleDKG.alight'></a>SkaleDKG.alight

Input params:

- groupIndex - group identifier
- nodeIndex - node ID

Description:

To store info about Node with nodeIndex identifier receive all data and completed BLS secret key calculation on the machine

### 3.3. <a name='SkaleDKG.complaint'></a>SkaleDKG.complaint

Input params:

- groupIndex - group identifier
- fromNodeIndex - accuser node ID
- toNodeIndex - accused node ID

Description:

To slash if accused node miss some time limits or initiate a dispute - store accuser and accused nodes

### 3.4. <a name='SkaleDKG.response'></a>SkaleDKG.response

Input params:

- groupIndex - group identifier
- fromNodeIndex - accused node ID
- secretNumber - secret key(number) for encrypt key share for accuser
- multipliedShare - G2 point equals to secretNumber _g2, where g2- generator of G2. It is verified in smart contract that multipliedShare=secretNumber_ g2 using bilinear mappings.
- verificationVector - list of G2 points, used for DKG verification and calculating BLS master public key on Solidity(add first elements of verificationVector by each participant)
- secretKeyContribution - list of objects(encrypted key share(number) and public key for ECDH decryption)

Description:

To prove that accused node sends correct data and slash accuser nodes, otherwise if accused node sent incorrect data then slash accused node.

### 3.5. <a name='ECDH.deriveKey'></a>ECDH.deriveKey

Input params:

- privKey - secret key(number)
- pubX and pubY - public key(point)

Description:

To derive common key for encrypting/decrypting

### 3.6. <a name='Decryption.decrypt'></a>Decryption.decrypt

Input params:

- cypherText - encrypted data(bytes32)
- Key - common key(number)

Description:

To decrypt cipher text, XOR decryption

### 3.7. <a name='KeyStorage.adding'></a>KeyStorage.adding

Input params:

- groupIndex - group identifier
- value - G2 point

Description:

To calculate and store BLS master public key. After each broadcast we add the first element of verificationVector to the already stored variable after the previous broadcast to calculate BLS master public key at the end. If there are no broadcasts before current add to “0” G2 point. So after all broadcasts are executed by every node - BLS master public key is calculated.

### 3.8. <a name='SkaleVerifier.verify'></a>SkaleVerifier.verify

Input params:

- signature - Fp2 point
- hash - hash of message
- counter - minimal non negative integer n such that (HashToInt(hash) +n)3 + 3 is a quadratic residue in Fp (y2=x3+3 is G1 curve equation)
- hashA, hashB - G1 point hash of message
- publicKey - G2 point

Description:

To verify that hash is correct and verify that signature of the message is correct

### 3.9. <a name='Schains.verifySchainSignature'></a>Schains.verifySchainSignature

Input params:

- signatureA, signatureB - Fp2 point
- hash - hash of message
- counter - minimal non negative integer n such that (HashToInt(hash) +n)3 + 3 is a quadratic residue in Fp (y2=x3+3 is G1 curve equation)
- hashA, hashB - G1 point hash of message
- schainName - name of SKALE-chain

Description:

To verify signature by the already stored BLS master public key of schain

## 4. <a name='DKGprocedure'></a>DKG procedure

Goal: Each node should have its own BLS private key and BLS master public key should be stored in KeyStorage

Precondition:

All parts register their public keys before (during node registration)

Group of 16 nodes created

### 4.1. <a name='Definitions:'></a>Definitions

Channel - public channel to share all information(private and public). All parties send transactions with a unique identifier for the channel and all parties catch(Events) or get information by the unique identifier for the channel.

Broadcast by node - node A generates key shares and verification vector off-chain. Encrypt each generated key share by public key of other nodes accordingly by ECDH method. Run function SkaleDKG.broadcast to send these data to the smart contract. During broadcast transaction secret key contribution and verification vector emits as an event to share the data with other participants and KeyStorage.adding to calculate BLS master public key. All private data(key shares) should be encrypted and it is safe to share encrypted data with other participants, only the owner of the public key can decrypt this data.

Alright by node - when node A received and verified all data from other nodes - Node A sends transaction to SkaleDKG contract to inform smart contact that node A calculated its own BLS private key.

Complaint by node - if node B does  not follow the rules node A can send a complaint on node B.

### 4.2. <a name='ComplaintTypes'></a>Complaint types

1. Node B missing broadcast in 30 minutes.
2. Node B missing alright in 30 minutes.
3. Node B missing response in 30 minutes.
4. Node B send bad data that node A could not verify it.

Response by node - when node A sends complaint of 4th type on node B. Node B should send a response to continue the dispute.

### 4.3. <a name='SuccessfulScenario'></a>Successful scenario

#### 4.3.1. <a name='BroadcastAndReadingPhase'></a>Broadcast and Reading phase

- Starts after group is generated and channel opened
- Every party should send broadcasts and read broadcasts from other parties.
- Duration: 30 min after group generated

#### 4.3.2. <a name='AlrightPhase'></a>Alright phase

- Starts after last(16th) broadcast received
- Every party should send alright
- Duration: 30 min after last (16th) broadcast received

#### 4.3.3. <a name='Finish'></a>Finish

- After last alright(16th) received
- Event SuccessfulDKG emits
- Channel closed

### 4.4. <a name='AlternativeScenarioComplaintType1'></a>Alternative scenario (complaint type 1)

#### 4.4.1. <a name='BroadcastAndReadingPhase-1'></a>Broadcast and Reading phase

- Starts after group generated and channel opened
- Every party should send broadcasts and read broadcasts from other parties.
- Duration: 30 min after group generated
- Node B missed broadcast phase:
  - Node B did not send broadcast in 30 minutes

#### 4.4.2. <a name='ComplaintPhase'></a>Complaint phase

- Starts in 30 minutes after group generated and channel opened
- Node A should send complaint(any node)
- During complaint node B should be rotated for a new node
- When Node C sends the same complaint - event ComplaintError should be emitted
- Every other complaint types would be rejected after executed complaint transaction

#### 4.4.3. <a name='Finish-1'></a>Finish

- Channel reopened
- Event FailedDKG emits
- DKG starts with new group from starting point
- Node B will never include in the new group

### 4.5. <a name='AlternativeScenarioComplaintType2'></a>Alternative scenario (complaint type 2)

#### 4.5.1. <a name='BroadcastAndReadingPhase-1'></a>Broadcast and Reading phase

- Starts after group generated and channel opened
- Every party should send broadcasts and read broadcasts from other parties.
- Duration: 30 min after group generated

#### 4.5.2. <a name='AlrightPhase-1'></a>Alright phase

- Starts after last(16th) broadcast received
- Every party should send alright
- Duration: 30 min after last(16th) broadcast received
- Node B missed alright phase:
  - Node B did not send alright in 30 minutes

#### 4.5.3. <a name='ComplaintPhase-1'></a>Complaint phase

- Starts in 30 minutes after last(16th) broadcast received
- Node A should send complaint(any node)
- During complaint node B should be rotated for a new node
- When Node C sends the same complaint - event ComplaintError should be emitted
- Every other complaint types would be rejected after executed complaint transaction

#### 4.5.4. <a name='Finish-1'></a>Finish

- Channel reopened
- Event FailedDKG emits
- DKG starts with new group from starting point
- Node B will never include in the new group

### 4.6. <a name='AlternativeScenarioComplaintType3'></a>Alternative scenario (complaint type 3)

#### 4.6.1. <a name='BroadcastAndReadingPhase-1'></a>Broadcast and Reading phase

- Starts after group generated and channel opened
- Every party should send broadcasts and read broadcasts from other parties.
- Duration: 30 min after group generated
- Node A received bad data from node B:
  - Node A can not verify data from Event by Node B

#### 4.6.2. <a name='ComplaintPhase-1'></a>Complaint phase

- Node A should send complaint(any node)
- During complaint store accuser and accused node identifiers
- When Node C sends the same complaint - event ComplaintError should be emitted
- Every other complaint types would be rejected after executed complaint transaction
- Node B missed response phase:
  - Node B did not send response in 30 minutes after complaint sent

#### 4.6.3. <a name='ComplaintPhase-1'></a>Complaint phase

- Starts in 30 minutes after complaint sent
- Node A should send complaint(any node)
- During complaint node B should be rotated for a new node
- When Node C sends the same complaint - event ComplaintError should be emitted

#### 4.6.4. <a name='Finish-1'></a>Finish

- Channel reopened
- Event FailedDKG emits
- DKG starts with new group from starting point
- Node B will never include in the new group

### 4.7. <a name='AlternativeScenarioComplaintType4'></a>Alternative scenario (complaint type 4)

#### 4.7.1. <a name='BroadcastAndReadingPhase-1'></a>Broadcast and Reading phase

- Starts after group generated and channel opened
- Every party should send broadcasts and read broadcasts from other parties.
- Duration: 30 min after group generated
- Node A received bad data from node B
  - Node A can not verify data from Event by Node B

#### 4.7.2. <a name='ComplaintPhase-1'></a>Complaint phase

- Node A should send complaint
- During complaint store accuser and accused node identifiers
- When Node C sends the same complaint - event ComplaintError should be emitted
- Every other complaint types would be rejected after executed complaint transaction

#### 4.7.3. <a name='ResponsePhase'></a>Response phase

- Node B should send response
- During response every data should verified by smart contract
- Malicious party would be detected and rotated
- Duration: 30 min after complaint sent

#### 4.7.4. <a name='Finish-1'></a>Finish

- Channel reopened
- Event FailedDKG emits
- DKG starts with new group from starting point
- Node B will never include in the new group
