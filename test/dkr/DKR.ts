// cspell:words nondealer

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers";

import {
    ConstantsHolder,
    ContractManager,
    DKRTester,
    NodeRotation,
    Nodes,
    Schains,
    SchainsInternal,
    SkaleDKGTester,
    SkaleManager,
    Wallets
} from "../../typechain-types";
import {
    deployDkrIntegrationFixture,
    DkrG2Point,
    DkrKeyShare,
    RegisteredDkrNode
} from "../tools/dkrIntegration";
import {fastBeforeEach} from "../tools/mocha";
import {getBroadcastingNodes} from "../tools/rotation";
import {stringKeccak256} from "../tools/hashes";
import {skipTime} from "../tools/time";
import {SchainType, schainParametersType} from "../tools/types";

chai.should();
chai.use(chaiAsPromised);

describe("DKR integration", () => {
    let schainHash: string;
    let outsider: SignerWithAddress;
    let owner: SignerWithAddress;
    let contractManager: ContractManager;
    let constantsHolder: ConstantsHolder;
    let dkr: DKRTester;
    let nodeRotation: NodeRotation;
    let nodes: Nodes;
    let schains: Schains;
    let schainsInternal: SchainsInternal;
    let skaleDKG: SkaleDKGTester;
    let skaleManager: SkaleManager;
    let wallets: Wallets;
    let receivers: RegisteredDkrNode[];
    let dealers: RegisteredDkrNode[];
    let incomingNode: RegisteredDkrNode;
    let freeNode: RegisteredDkrNode;
    let dkrId: bigint;
    let verificationVector: DkrG2Point[];
    let secretKeyContribution: DkrKeyShare[];

    const currentGroup = async () => [...await schainsInternal.getNodesInGroup(schainHash)].sort();

    const assertActiveRoundUnchanged = async (expectedId: bigint, expectedGroup: bigint[]) => {
        (await nodeRotation.getActiveDkrId(schainHash)).should.equal(expectedId);
        (await dkr.lastDkrId()).should.equal(expectedId);
        (await currentGroup()).should.deep.equal([...expectedGroup].sort());
    };

    const broadcast = async (dealer: RegisteredDkrNode) => dkr.connect(dealer.wallet).broadcast(
        dealer.id,
        dkrId,
        verificationVector,
        secretKeyContribution
    );

    const completeBroadcast = async () => {
        for (const dealer of dealers) {
            await broadcast(dealer);
        }
    };

    fastBeforeEach(async () => {
        const fixture = await deployDkrIntegrationFixture();
        ({
            schainHash,
            owner,
            contractManager,
            outsider,
            constantsHolder,
            dkr,
            nodeRotation,
            nodes,
            schains,
            schainsInternal,
            skaleDKG,
            skaleManager,
            wallets,
            receivers,
            dealers,
            incomingNode,
            freeNode,
            dkrId
        } = fixture);
        verificationVector = fixture.broadcastData.verificationVector;
        secretKeyContribution = fixture.broadcastData.secretKeyContribution;
    });

    const startSecondSchainRotation = async () => {
        const secondSchainName = "dkr-callback-second";
        const secondSchainHash = stringKeccak256(secondSchainName);
        const deposit = await schains.getSchainPrice(SchainType.TEST, 5);
        await schains.addSchain(
            owner,
            deposit,
            ethers.AbiCoder.defaultAbiCoder().encode(
                [schainParametersType],
                [{
                    lifetime: 5,
                    typeOfSchain: SchainType.TEST,
                    nonce: 0,
                    name: secondSchainName,
                    originator: ethers.ZeroAddress,
                    options: []
                }]
            )
        );
        await skaleDKG.setSuccessfulDKGPublic(secondSchainHash);
        await wallets.rechargeSchainWallet(secondSchainHash, {value: ethers.parseEther("1")});
        const secondGroup = await schainsInternal.getNodesInGroup(secondSchainHash);
        await nodes.initExit(secondGroup[0]);
        await skaleManager.nodeExit(secondGroup[0]);
        return {
            schainHash: secondSchainHash,
            dkrId: await nodeRotation.getActiveDkrId(secondSchainHash),
            receivers: await schainsInternal.getNodesInGroup(secondSchainHash)
        };
    };

    const registerCallbackMock = async () => {
        const callback = await ethers.deployContract("DkrNodeRotationCallbackMock");
        await callback.waitForDeployment();
        await contractManager.setContractsAddress("DKR", callback);
        return callback;
    };

    describe("authorization and round integrity", () => {
        it("should reject nodes and arbitrary accounts from starting a production round", async () => {
            const dealerIds = dealers.map(node => node.id);
            const receiverIds = receivers.map(node => node.id);

            await chai.expect(
                dkr.connect(outsider).start(dealerIds, receiverIds, dealers.length, 0)
            ).to.be.revertedWith("Message sender is invalid");
            await chai.expect(
                dkr.connect(dealers[0].wallet).start(dealerIds, receiverIds, dealers.length, 0)
            ).to.be.revertedWith("Message sender is invalid");

            await assertActiveRoundUnchanged(dkrId, await currentGroup());
        });

        it("should reject a protocol message that claims a node not owned by the sender", async () => {
            const groupBefore = await currentGroup();

            await chai.expect(
                dkr.connect(dealers[1].wallet).broadcast(
                    dealers[0].id,
                    dkrId,
                    verificationVector,
                    secretKeyContribution
                )
            ).to.be.revertedWithCustomError(dkr, "NodeDoesNotExist")
                .withArgs(dealers[0].id);

            await assertActiveRoundUnchanged(dkrId, groupBefore);
            await chai.expect(broadcast(dealers[0])).to.emit(dkr, "BroadcastAndKeyShare");
        });

        it("should reject malformed, duplicate, and out-of-phase messages atomically", async () => {
            const groupBefore = await currentGroup();
            const dealer = dealers[0];

            await chai.expect(
                dkr.connect(dealer.wallet).broadcast(
                    dealer.id,
                    dkrId,
                    verificationVector.slice(1),
                    secretKeyContribution
                )
            ).to.be.revertedWithCustomError(dkr, "IncorrectNumberOfVerificationVectors")
                .withArgs(verificationVector.length - 1, verificationVector.length);
            await chai.expect(
                dkr.connect(dealer.wallet).broadcast(
                    dealer.id,
                    dkrId,
                    verificationVector,
                    secretKeyContribution.slice(1)
                )
            ).to.be.revertedWithCustomError(dkr, "IncorrectNumberOfSecretKeyShares")
                .withArgs(secretKeyContribution.length - 1, secretKeyContribution.length);
            await chai.expect(
                dkr.connect(receivers[0].wallet).alright(receivers[0].id, dkrId)
            ).to.be.revertedWithCustomError(dkr, "NotAlrightPhase").withArgs(dkrId);

            await broadcast(dealer);
            await chai.expect(broadcast(dealer))
                .to.be.revertedWithCustomError(dkr, "BroadcastNotNeeded").withArgs(dkrId, dealer.id);
            await assertActiveRoundUnchanged(dkrId, groupBefore);

            for (const remainingDealer of dealers.slice(1)) {
                await broadcast(remainingDealer);
            }
            await chai.expect(broadcast(dealer))
                .to.be.revertedWithCustomError(dkr, "NotBroadcastPhase").withArgs(dkrId);

            const receiver = receivers[0];
            await dkr.connect(receiver.wallet).alright(receiver.id, dkrId);
            await chai.expect(dkr.connect(receiver.wallet).alright(receiver.id, dkrId))
                .to.be.revertedWithCustomError(dkr, "AlrightNotNeeded").withArgs(dkrId, receiver.id);
            await assertActiveRoundUnchanged(dkrId, groupBefore);
        });
    });

    describe("broadcast and alright deadlines", () => {
        it("should replace a dealer that broadcasts after the deadline and start one retry", async () => {
            const lateDealer = dealers[0];
            const failedId = dkrId;
            await skipTime(await dkr.broadcastTimelimit());

            await chai.expect(broadcast(lateDealer)).to.emit(dkr, "BadGuy").withArgs(lateDealer.id);

            const retryId = await nodeRotation.getActiveDkrId(schainHash);
            retryId.should.equal(failedId + 1n);
            (await dkr.lastDkrId()).should.equal(retryId);
            (await schainsInternal.getNodesInGroup(schainHash)).should.not.include(lateDealer.id);
            (await schainsInternal.getNodesInGroup(schainHash)).length.should.equal(receivers.length);
            const retryDealers = await getBroadcastingNodes(
                schainHash,
                schainsInternal,
                nodeRotation
            );
            retryDealers.should.not.include(lateDealer.id);
            retryDealers.length.should.equal(dealers.length);
        });

        it("should replace a receiver that sends alright after the deadline and start one retry", async () => {
            await completeBroadcast();
            const lateReceiver = receivers[0];
            const failedId = dkrId;
            await skipTime(await dkr.alrightTimelimit());

            await chai.expect(
                dkr.connect(lateReceiver.wallet).alright(lateReceiver.id, dkrId)
            ).to.emit(dkr, "BadGuy").withArgs(lateReceiver.id);

            const retryId = await nodeRotation.getActiveDkrId(schainHash);
            retryId.should.equal(failedId + 1n);
            (await schainsInternal.getNodesInGroup(schainHash)).should.not.include(lateReceiver.id);
            (await schainsInternal.getNodesInGroup(schainHash)).length.should.equal(receivers.length);
        });

        it("should not fail a round for late broadcasts from an ineligible or completed sender", async () => {
            const completedDealer = dealers[0];
            await broadcast(completedDealer);
            await skipTime(await dkr.broadcastTimelimit());
            const groupBefore = await currentGroup();

            await chai.expect(broadcast(completedDealer))
                .to.be.revertedWithCustomError(dkr, "BroadcastNotNeeded")
                .withArgs(dkrId, completedDealer.id);
            await chai.expect(
                dkr.connect(incomingNode.wallet).broadcast(
                    incomingNode.id,
                    dkrId,
                    verificationVector,
                    secretKeyContribution
                )
            ).to.be.revertedWithCustomError(dkr, "BroadcastNotNeeded")
                .withArgs(dkrId, incomingNode.id);

            await assertActiveRoundUnchanged(dkrId, groupBefore);
        });

        it("should not fail a round for late alright calls from an ineligible or completed sender", async () => {
            await completeBroadcast();
            const completedReceiver = receivers[0];
            await dkr.connect(completedReceiver.wallet).alright(completedReceiver.id, dkrId);
            await skipTime(await dkr.alrightTimelimit());
            const groupBefore = await currentGroup();

            await chai.expect(
                dkr.connect(completedReceiver.wallet).alright(completedReceiver.id, dkrId)
            ).to.be.revertedWithCustomError(dkr, "AlrightNotNeeded")
                .withArgs(dkrId, completedReceiver.id);
            await chai.expect(
                dkr.connect(freeNode.wallet).alright(freeNode.id, dkrId)
            ).to.be.revertedWithCustomError(dkr, "AlrightNotNeeded")
                .withArgs(dkrId, freeNode.id);

            await assertActiveRoundUnchanged(dkrId, groupBefore);
        });

        it("should let the incoming nondealer receiver report a missing receiver", async () => {
            dealers.map(node => node.id).should.not.include(incomingNode.id);
            await completeBroadcast();
            const missingReceiver = receivers.find(
                node => node.id !== incomingNode.id
            ) as RegisteredDkrNode;
            await skipTime(await dkr.alrightTimelimit());

            await chai.expect(
                dkr.connect(incomingNode.wallet).complaintTimeout(
                    incomingNode.id,
                    dkrId,
                    missingReceiver.id
                )
            ).to.emit(dkr, "BadGuy").withArgs(missingReceiver.id);

            const groupAfter = await schainsInternal.getNodesInGroup(schainHash);
            groupAfter.should.include(incomingNode.id);
            groupAfter.should.not.include(missingReceiver.id);
            (await nodeRotation.getActiveDkrId(schainHash)).should.equal(dkrId + 1n);
        });
    });

    describe("NodeRotation callback integrity", () => {
        it("should reject unknown and stale failure callbacks without changing the active round", async () => {
            const groupBefore = await currentGroup();
            const unknownId = dkrId + 1000n;
            let callback = await registerCallbackMock();
            await chai.expect(
                callback.failDkr(nodeRotation, unknownId, dealers[0].id)
            ).to.be.revertedWithCustomError(nodeRotation, "DkrIsNotActive")
                .withArgs(unknownId, ethers.ZeroHash);
            await assertActiveRoundUnchanged(dkrId, groupBefore);
            await contractManager.setContractsAddress("DKR", dkr);

            const staleId = dkrId;
            await skipTime(await dkr.broadcastTimelimit());
            await broadcast(dealers[0]);
            const retryId = await nodeRotation.getActiveDkrId(schainHash);
            const retryGroup = await currentGroup();
            callback = await registerCallbackMock();

            await chai.expect(
                callback.failDkr(nodeRotation, staleId, retryGroup[0])
            ).to.be.revertedWithCustomError(nodeRotation, "DkrIsNotActive")
                .withArgs(staleId, schainHash);
            await assertActiveRoundUnchanged(retryId, retryGroup);
        });

        it("should reject a cross-schain failure callback without rotating either schain", async () => {
            const second = await startSecondSchainRotation();
            const firstGroupBefore = await currentGroup();
            const secondGroupBefore = [...second.receivers].sort();
            const callback = await registerCallbackMock();

            await chai.expect(
                callback.failDkr(nodeRotation, dkrId, second.receivers[0])
            ).to.be.reverted;

            (await nodeRotation.getActiveDkrId(schainHash)).should.equal(dkrId);
            (await nodeRotation.getActiveDkrId(second.schainHash)).should.equal(second.dkrId);
            (await currentGroup()).should.deep.equal(firstGroupBefore);
            ([...await schainsInternal.getNodesInGroup(second.schainHash)].sort())
                .should.deep.equal(secondGroupBefore);
        });

        it("should ignore an unknown success callback without clearing an active round", async () => {
            const groupBefore = await currentGroup();
            const callback = await registerCallbackMock();

            await callback.finalizeRotation(nodeRotation, stringKeccak256("unknown-schain"));

            await assertActiveRoundUnchanged(dkrId, groupBefore);
        });

        it("should reject a stale success callback without clearing the newer active round", async () => {
            const staleId = dkrId;
            await dkr.setSuccessfulDkrPublic(staleId);
            await skipTime(await constantsHolder.rotationDelay());
            const nextExitingNode = receivers[0];
            await nodes.initExit(nextExitingNode.id);
            await skaleManager.nodeExit(nextExitingNode.id);
            const newerId = await nodeRotation.getActiveDkrId(schainHash);
            newerId.should.not.equal(staleId);

            // Unexpected failure: DKR success currently identifies only the schain, so
            // replaying completion of an old round clears the newer active round.
            await chai.expect(dkr.setSuccessfulDkrPublic(staleId)).to.be.reverted;
            (await nodeRotation.getActiveDkrId(schainHash)).should.equal(newerId);
        });

        it("should reject a cross-schain success callback without clearing the other round", async () => {
            const second = await startSecondSchainRotation();
            const callback = await registerCallbackMock();

            // Unexpected failure: finalizeRotation has no DKR ID with which to prove
            // that this callback belongs to the active round of the supplied schain.
            await chai.expect(
                callback.finalizeRotation(nodeRotation, second.schainHash)
            ).to.be.reverted;
            (await nodeRotation.getActiveDkrId(schainHash)).should.equal(dkrId);
            (await nodeRotation.getActiveDkrId(second.schainHash)).should.equal(second.dkrId);
        });
    });
});
