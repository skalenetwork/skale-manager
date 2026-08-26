import * as chai from "chai";
// cspell:words nondealer
import chaiAsPromised from "chai-as-promised";
import {Wallet} from "ethers";
import {ethers} from "hardhat";

import {
    DkrIntegrationFixture,
    RegisteredDkrNode,
    buildDkrBroadcastData,
    deployDkrIntegrationFixture
} from "../tools/dkrIntegration";
import {stringKeccak256} from "../tools/hashes";
import {fastBeforeEach} from "../tools/mocha";
import {getBroadcastingNodes} from "../tools/rotation";
import {getPublicKey, getValidatorIdSignature} from "../tools/signatures";
import {skipTime} from "../tools/time";
import {SchainType, schainParametersType} from "../tools/types";

chai.should();
chai.use(chaiAsPromised);

const completeActiveDkr = async (fixture: DkrIntegrationFixture, schainHash: string) => {
    const dkrId = await fixture.nodeRotation.getActiveDkrId(schainHash);
    dkrId.should.not.equal(0n);
    const receiverIds = await fixture.schainsInternal.getNodesInGroup(schainHash);
    const dealerIds = await getBroadcastingNodes(
        schainHash,
        fixture.schainsInternal,
        fixture.nodeRotation
    );
    const data = buildDkrBroadcastData(dealerIds.length, receiverIds.length);

    for (const dealer of dealerIds) {
        await fixture.dkr.connect(fixture.nodeById(dealer).wallet).broadcast(
            dealer,
            dkrId,
            data.verificationVector,
            data.secretKeyContribution
        );
    }
    for (const receiver of receiverIds) {
        await fixture.dkr.connect(fixture.nodeById(receiver).wallet).alright(receiver, dkrId);
    }

    (await fixture.nodeRotation.getActiveDkrId(schainHash)).should.equal(0n);
    (await fixture.nodeRotation.getLastSuccessfulDkrId(schainHash)).should.equal(dkrId);
    return dkrId;
};

const registerNode = async (
    fixture: DkrIntegrationFixture,
    suffix: string
): Promise<RegisteredDkrNode> => {
    const id = await fixture.nodes.getNumberOfNodes();
    const wallet = Wallet.createRandom().connect(ethers.provider);
    await fixture.owner.sendTransaction({to: wallet, value: ethers.parseEther("10000")});
    const validatorId = await fixture.validatorService.getValidatorId(fixture.validator);
    await fixture.validatorService.connect(fixture.validator).linkNodeAddress(
        wallet,
        await getValidatorIdSignature(validatorId, wallet)
    );
    await fixture.skaleManager.connect(wallet).createNode(
        8545,
        0,
        `0x7f00${suffix}`,
        `0x7f00${suffix}`,
        getPublicKey(wallet),
        `DKR-${suffix}`,
        "dkr.example"
    );
    const node = {id, wallet};
    fixture.registeredNodes.push(node);
    return node;
};

describe("DKR lifecycle integration", () => {
    describe("successive rotations", () => {
        let fixture: DkrIntegrationFixture;

        fastBeforeEach(async () => {
            fixture = await deployDkrIntegrationFixture();
        });

        it("should complete three successive DKR rounds without reopening legacy DKG", async () => {
            const successfulIds: bigint[] = [];
            let outgoingNode = fixture.exitingNode;
            const groupSize = fixture.receivers.length;

            for (let round = 0; round < 3; ++round) {
                const groupAfterReplacement = await fixture.schainsInternal.getNodesInGroup(
                    fixture.schainHash
                );
                groupAfterReplacement.length.should.equal(groupSize);
                groupAfterReplacement.should.not.include(outgoingNode.id);
                (await fixture.skaleDKG.isChannelOpened(fixture.schainHash)).should.be.false;

                const dkrId = await completeActiveDkr(fixture, fixture.schainHash);
                if (successfulIds.length > 0) {
                    dkrId.should.equal(successfulIds[successfulIds.length - 1] + 1n);
                }
                successfulIds.push(dkrId);
                (await fixture.nodes.isNodeLeft(outgoingNode.id)).should.be.true;

                if (round < 2) {
                    await skipTime(await fixture.constantsHolder.rotationDelay() + 1n);
                    const nextGroup = await fixture.schainsInternal.getNodesInGroup(fixture.schainHash);
                    outgoingNode = fixture.nodeById(nextGroup[0]);
                    await fixture.nodes.initExit(outgoingNode.id);
                    await fixture.skaleManager.nodeExit(outgoingNode.id);
                    (await fixture.nodeRotation.getActiveDkrId(fixture.schainHash)).should.not.equal(0n);
                }
            }

            successfulIds.length.should.equal(3);
            (await fixture.nodeRotation.getLastSuccessfulDkrId(fixture.schainHash))
                .should.equal(successfulIds[2]);
        });

        it("should serialize exits and keep node registration outside the active round", async () => {
            const activeDkrId = await fixture.nodeRotation.getActiveDkrId(fixture.schainHash);
            const originalReceivers = await fixture.schainsInternal.getNodesInGroup(fixture.schainHash);
            const secondLeavingNode = fixture.nodeById(originalReceivers[0]);

            await chai.expect(fixture.nodes.initExit(secondLeavingNode.id))
                .to.be.revertedWithCustomError(fixture.nodeRotation, "DKRDidNotFinish")
                .withArgs(fixture.schainHash);
            (await fixture.nodeRotation.getActiveDkrId(fixture.schainHash)).should.equal(activeDkrId);
            (await fixture.schainsInternal.getNodesInGroup(fixture.schainHash))
                .should.deep.equal(originalReceivers);

            const registeredDuringDkr = await registerNode(fixture, "00fe");
            (await fixture.nodeRotation.getActiveDkrId(fixture.schainHash)).should.equal(activeDkrId);
            (await fixture.schainsInternal.getNodesInGroup(fixture.schainHash))
                .should.deep.equal(originalReceivers);
            (await fixture.nodeRotation.shouldSendBroadcast(
                fixture.schainHash,
                registeredDuringDkr.id
            )).should.be.false;

            const firstSuccessfulId = await completeActiveDkr(fixture, fixture.schainHash);
            (await fixture.nodes.spaceOfNodes(registeredDuringDkr.id)).freeSpace.should.equal(128n);

            await chai.expect(fixture.nodes.initExit(secondLeavingNode.id))
                .to.be.revertedWithCustomError(fixture.nodeRotation, "OccupiedByRotation")
                .withArgs(fixture.schainHash, secondLeavingNode.id);

            await skipTime(await fixture.constantsHolder.rotationDelay() + 1n);
            await fixture.nodes.initExit(secondLeavingNode.id);
            await fixture.skaleManager.nodeExit(secondLeavingNode.id);
            const secondDkrId = await fixture.nodeRotation.getActiveDkrId(fixture.schainHash);
            secondDkrId.should.equal(firstSuccessfulId + 1n);
            await completeActiveDkr(fixture, fixture.schainHash);
        });

        it("should retain the last success when a later round fails and ignore stale messages", async () => {
            const firstSuccessfulId = await completeActiveDkr(fixture, fixture.schainHash);
            await skipTime(await fixture.constantsHolder.rotationDelay() + 1n);

            const groupBeforeSecondRotation = await fixture.schainsInternal.getNodesInGroup(
                fixture.schainHash
            );
            const outgoingNode = fixture.nodeById(groupBeforeSecondRotation[0]);
            await fixture.nodes.initExit(outgoingNode.id);
            await fixture.skaleManager.nodeExit(outgoingNode.id);

            const failedId = await fixture.nodeRotation.getActiveDkrId(fixture.schainHash);
            const receivers = await fixture.schainsInternal.getNodesInGroup(fixture.schainHash);
            const incomingNode = receivers.find(node => !groupBeforeSecondRotation.includes(node));
            if (incomingNode === undefined) {
                throw new Error("Second rotation did not install a new receiver");
            }
            const dealers = await getBroadcastingNodes(
                fixture.schainHash,
                fixture.schainsInternal,
                fixture.nodeRotation
            );
            const data = buildDkrBroadcastData(dealers.length, receivers.length);
            for (const dealer of dealers) {
                await fixture.dkr.connect(fixture.nodeById(dealer).wallet).broadcast(
                    dealer,
                    failedId,
                    data.verificationVector,
                    data.secretKeyContribution
                );
            }
            await skipTime(await fixture.dkr.alrightTimelimit());
            const reporter = fixture.nodeById(dealers[0]);
            await fixture.dkr.connect(reporter.wallet).complaintTimeout(
                reporter.id,
                failedId,
                incomingNode
            );

            const retryId = await fixture.nodeRotation.getActiveDkrId(fixture.schainHash);
            retryId.should.equal(failedId + 1n);
            (await fixture.nodeRotation.getLastSuccessfulDkrId(fixture.schainHash))
                .should.equal(firstSuccessfulId);

            await chai.expect(fixture.dkr.connect(reporter.wallet).alright(reporter.id, failedId))
                .to.be.revertedWithCustomError(fixture.dkr, "NotAlrightPhase")
                .withArgs(failedId);
            (await fixture.nodeRotation.getActiveDkrId(fixture.schainHash)).should.equal(retryId);

            await completeActiveDkr(fixture, fixture.schainHash);
            (await fixture.nodeRotation.getLastSuccessfulDkrId(fixture.schainHash))
                .should.equal(retryId);
        });
    });

    describe("replacement availability", () => {
        let fixture: DkrIntegrationFixture;

        fastBeforeEach(async () => {
            fixture = await deployDkrIntegrationFixture({
                schainName: "dkr-no-free-node",
                nodesCount: 6,
                schainType: SchainType.MEDIUM_TEST
            });
            // Leave no eligible replacement without changing the active DKR.
            await fixture.nodes.setNodeInMaintenance(fixture.freeNode.id);
        });

        it("should preserve the active round when failure has no replacement and recover later", async () => {
            const groupBeforeFailure = await fixture.schainsInternal.getNodesInGroup(fixture.schainHash);
            const data = buildDkrBroadcastData(fixture.dealers.length, fixture.receivers.length);
            for (const dealer of fixture.dealers) {
                await fixture.dkr.connect(dealer.wallet).broadcast(
                    dealer.id,
                    fixture.dkrId,
                    data.verificationVector,
                    data.secretKeyContribution
                );
            }
            await skipTime(await fixture.dkr.alrightTimelimit());

            const reporter = fixture.dealers[0];
            await chai.expect(fixture.dkr.connect(reporter.wallet).complaintTimeout(
                reporter.id,
                fixture.dkrId,
                fixture.incomingNode.id
            )).to.be.reverted;

            (await fixture.nodeRotation.getActiveDkrId(fixture.schainHash)).should.equal(fixture.dkrId);
            (await fixture.dkr.lastDkrId()).should.equal(fixture.dkrId);
            (await fixture.schainsInternal.getNodesInGroup(fixture.schainHash))
                .should.deep.equal(groupBeforeFailure);

            await registerNode(fixture, "00fd");
            await fixture.dkr.connect(reporter.wallet).complaintTimeout(
                reporter.id,
                fixture.dkrId,
                fixture.incomingNode.id
            );
            const retryDkrId = await fixture.nodeRotation.getActiveDkrId(fixture.schainHash);
            retryDkrId.should.equal(fixture.dkrId + 1n);
            await completeActiveDkr(fixture, fixture.schainHash);
        });
    });

    describe("previous successful transcript", () => {
        let fixture: DkrIntegrationFixture;

        fastBeforeEach(async () => {
            fixture = await deployDkrIntegrationFixture({
                schainName: "dkr-previous-transcript",
                nodesCount: 6,
                schainType: SchainType.TEST
            });
        });

        it("should adjudicate a later free-term complaint from the previous DKR", async () => {
            fixture.dealers.length.should.equal(1);
            const firstDealer = fixture.dealers[0];
            const firstDealerPosition = fixture.receivers.findIndex(
                receiver => receiver.id === firstDealer.id
            );
            // The single prior dealer is deliberately at x = 2. With one
            // dealer its Lagrange coefficient is still exactly one.
            firstDealerPosition.should.equal(1);
            const firstData = buildDkrBroadcastData(1, fixture.receivers.length);
            const firstSuccessfulId = await completeActiveDkr(fixture, fixture.schainHash);

            await skipTime(await fixture.constantsHolder.rotationDelay() + 1n);
            await fixture.nodes.initExit(firstDealer.id);
            await fixture.skaleManager.nodeExit(firstDealer.id);
            const secondId = await fixture.nodeRotation.getActiveDkrId(fixture.schainHash);
            secondId.should.equal(firstSuccessfulId + 1n);

            const secondReceivers = await fixture.schainsInternal.getNodesInGroup(
                fixture.schainHash
            );
            const secondDealers = await getBroadcastingNodes(
                fixture.schainHash,
                fixture.schainsInternal,
                fixture.nodeRotation
            );
            secondDealers.length.should.equal(1);
            const accused = fixture.nodeById(secondDealers[0]);
            const complainantId = secondReceivers.find(receiver => receiver !== accused.id);
            if (complainantId === undefined) {
                throw new Error("Later DKR did not include a complaint reporter");
            }
            const complainant = fixture.nodeById(complainantId);
            const currentData = buildDkrBroadcastData(1, secondReceivers.length);
            await fixture.dkr.connect(accused.wallet).broadcast(
                accused.id,
                secondId,
                currentData.verificationVector,
                currentData.secretKeyContribution
            );
            await fixture.dkr.connect(complainant.wallet).complaintFreeTerm(
                complainant.id,
                secondId,
                accused.id
            );

            const wrongPreviousData = {
                verificationVector: firstData.verificationVector,
                secretKeyContribution: firstData.secretKeyContribution.map((share, index) =>
                    index === 0 ? {...share, share: ethers.ZeroHash} : share
                )
            };
            await chai.expect(fixture.dkr.connect(accused.wallet).responseFreeTerm(
                accused.id,
                secondId,
                [wrongPreviousData, wrongPreviousData],
                currentData
            )).to.be.revertedWithCustomError(fixture.dkr, "InvalidVerificationData");

            // Expected invariant: with one previous dealer, its stored x value
            // cannot change the coefficient from one. The current implementation
            // uses the set position instead and assigns guilt to the dealer.
            await chai.expect(fixture.dkr.connect(accused.wallet).responseFreeTerm(
                accused.id,
                secondId,
                [firstData],
                currentData
            )).to.emit(fixture.dkr, "BadGuy").withArgs(complainant.id);
        });
    });

    describe("multiple schains", () => {
        let fixture: DkrIntegrationFixture;

        const createSecondSchainAndStartRotation = async () => {
            const firstGroup = await fixture.schainsInternal.getNodesInGroup(fixture.schainHash);
            for (const node of firstGroup) {
                await fixture.nodes.setNodeInMaintenance(node);
            }

            const secondName = "dkr-isolation-b";
            const secondHash = stringKeccak256(secondName);
            const deposit = await fixture.schains.getSchainPrice(SchainType.MEDIUM_TEST, 5);
            await fixture.schains.addSchain(
                fixture.owner,
                deposit,
                ethers.AbiCoder.defaultAbiCoder().encode(
                    [schainParametersType],
                    [{
                        lifetime: 5,
                        typeOfSchain: SchainType.MEDIUM_TEST,
                        nonce: 0,
                        name: secondName,
                        originator: ethers.ZeroAddress,
                        options: []
                    }]
                )
            );
            await fixture.skaleDKG.setSuccessfulDKGPublic(secondHash);
            await fixture.wallets.rechargeSchainWallet(secondHash, {value: ethers.parseEther("1")});
            for (const node of firstGroup) {
                await fixture.nodes.removeNodeFromInMaintenance(node);
            }

            const secondOriginalGroup = await fixture.schainsInternal.getNodesInGroup(secondHash);
            firstGroup.some(node => secondOriginalGroup.includes(node)).should.be.false;
            const secondOutgoing = fixture.nodeById(secondOriginalGroup[0]);
            await fixture.nodes.initExit(secondOutgoing.id);
            await fixture.skaleManager.nodeExit(secondOutgoing.id);
            return secondHash;
        };

        fastBeforeEach(async () => {
            fixture = await deployDkrIntegrationFixture({
                schainName: "dkr-isolation-a",
                nodesCount: 14,
                schainType: SchainType.MEDIUM_TEST
            });
        });

        it("should isolate concurrent rounds and their successful histories", async () => {
            const secondHash = await createSecondSchainAndStartRotation();

            const firstDkrId = await fixture.nodeRotation.getActiveDkrId(fixture.schainHash);
            const secondDkrId = await fixture.nodeRotation.getActiveDkrId(secondHash);
            firstDkrId.should.not.equal(0n);
            secondDkrId.should.not.equal(0n);
            secondDkrId.should.not.equal(firstDkrId);
            const secondGroupDuringFirstCompletion = await fixture.schainsInternal.getNodesInGroup(secondHash);
            const firstGroupDuringSecondFailure = await fixture.schainsInternal.getNodesInGroup(
                fixture.schainHash
            );

            await completeActiveDkr(fixture, fixture.schainHash);
            (await fixture.nodeRotation.getActiveDkrId(secondHash)).should.equal(secondDkrId);
            (await fixture.schainsInternal.getNodesInGroup(secondHash))
                .should.deep.equal(secondGroupDuringFirstCompletion);
            (await fixture.nodeRotation.getLastSuccessfulDkrId(secondHash)).should.equal(0n);

            const secondDealers = await getBroadcastingNodes(
                secondHash,
                fixture.schainsInternal,
                fixture.nodeRotation
            );
            const secondData = buildDkrBroadcastData(
                secondDealers.length,
                secondGroupDuringFirstCompletion.length
            );
            for (const currentDealer of secondDealers) {
                await fixture.dkr.connect(fixture.nodeById(currentDealer).wallet).broadcast(
                    currentDealer,
                    secondDkrId,
                    secondData.verificationVector,
                    secondData.secretKeyContribution
                );
            }
            const missingReceiver = secondGroupDuringFirstCompletion.find(receiver =>
                !secondDealers.includes(receiver)
            );
            if (missingReceiver === undefined) {
                throw new Error("Second schain did not include a nondealer receiver");
            }
            await skipTime(await fixture.dkr.alrightTimelimit());
            const reporter = fixture.nodeById(secondDealers[0]);
            await fixture.dkr.connect(reporter.wallet).complaintTimeout(
                reporter.id,
                secondDkrId,
                missingReceiver
            );
            const secondRetryId = await fixture.nodeRotation.getActiveDkrId(secondHash);
            secondRetryId.should.equal(secondDkrId + 1n);
            (await fixture.schainsInternal.getNodesInGroup(fixture.schainHash))
                .should.deep.equal(firstGroupDuringSecondFailure);
            (await fixture.nodeRotation.getLastSuccessfulDkrId(fixture.schainHash))
                .should.equal(firstDkrId);
            await completeActiveDkr(fixture, secondHash);
            (await fixture.nodeRotation.getLastSuccessfulDkrId(secondHash)).should.equal(secondRetryId);
        });

        it("should interleave successful rounds without cross-linking schain histories", async () => {
            const secondHash = await createSecondSchainAndStartRotation();
            const firstInitialId = await fixture.nodeRotation.getActiveDkrId(fixture.schainHash);
            const secondInitialId = await fixture.nodeRotation.getActiveDkrId(secondHash);

            firstInitialId.should.not.equal(secondInitialId);
            (await fixture.dkr.getPreviousDkrId(firstInitialId)).should.equal(0n);
            (await fixture.dkr.getPreviousDkrId(secondInitialId)).should.equal(0n);

            // Complete in the opposite order from round creation.
            await completeActiveDkr(fixture, secondHash);
            await completeActiveDkr(fixture, fixture.schainHash);
            await skipTime(await fixture.constantsHolder.rotationDelay() + 1n);

            const firstGroupBeforeExit = await fixture.schainsInternal.getNodesInGroup(
                fixture.schainHash
            );
            const secondGroupBeforeExit = await fixture.schainsInternal.getNodesInGroup(secondHash);
            const firstOutgoing = firstGroupBeforeExit.find(
                node => !secondGroupBeforeExit.includes(node)
            );
            if (firstOutgoing === undefined) {
                throw new Error("Interleaving fixture did not leave schain-exclusive exit nodes");
            }

            await fixture.nodes.initExit(firstOutgoing);
            await fixture.skaleManager.nodeExit(firstOutgoing);
            const firstNextId = await fixture.nodeRotation.getActiveDkrId(fixture.schainHash);

            // Re-evaluate memberships after the first exit, because replacement
            // selection is pseudo-random and can alter cross-schain overlap.
            const firstGroupAfterFirstExit = await fixture.schainsInternal.getNodesInGroup(
                fixture.schainHash
            );
            const secondGroupAfterFirstExit = await fixture.schainsInternal.getNodesInGroup(secondHash);
            const secondOutgoing = secondGroupAfterFirstExit.find(
                node => !firstGroupAfterFirstExit.includes(node)
            );
            if (secondOutgoing === undefined) {
                throw new Error("Interleaving fixture did not preserve a second exclusive exit node");
            }

            await fixture.nodes.initExit(secondOutgoing);
            await fixture.skaleManager.nodeExit(secondOutgoing);
            const secondNextId = await fixture.nodeRotation.getActiveDkrId(secondHash);

            new Set([firstInitialId, secondInitialId, firstNextId, secondNextId]).size
                .should.equal(4);
            (await fixture.dkr.getPreviousDkrId(firstNextId)).should.equal(firstInitialId);
            (await fixture.dkr.getPreviousDkrId(secondNextId)).should.equal(secondInitialId);
            (await fixture.dkr.getPreviousDkrId(firstNextId)).should.not.equal(secondInitialId);
            (await fixture.dkr.getPreviousDkrId(secondNextId)).should.not.equal(firstInitialId);

            // Complete in the opposite order again and retain independent heads.
            await completeActiveDkr(fixture, secondHash);
            await completeActiveDkr(fixture, fixture.schainHash);
            (await fixture.nodeRotation.getLastSuccessfulDkrId(fixture.schainHash))
                .should.equal(firstNextId);
            (await fixture.nodeRotation.getLastSuccessfulDkrId(secondHash))
                .should.equal(secondNextId);
        });
    });
});
