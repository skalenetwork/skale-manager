// cspell:words nondealer nonreceiver

import {expect} from "chai";
import {BaseWallet, BytesLike, Wallet} from "ethers";
import {ethers} from "hardhat";
import {
    ConstantsHolder,
    ContractManager,
    Decryption,
    DKR,
    ECDH,
    FieldOperationsTester,
    NodeRotation,
    Nodes,
    Schains,
    SchainsInternal,
    SkaleDKGTester,
    SkaleManager,
    ValidatorService,
    Wallets
} from "../../typechain-types";
import {deployConstantsHolder} from "../tools/deploy/constantsHolder";
import {deployContractManager} from "../tools/deploy/contractManager";
import {deployValidatorService} from "../tools/deploy/delegation/validatorService";
import {deployDKR} from "../tools/deploy/dkr";
import {deployNodeRotation} from "../tools/deploy/nodeRotation";
import {deployNodes} from "../tools/deploy/nodes";
import {deploySchains} from "../tools/deploy/schains";
import {deploySchainsInternal} from "../tools/deploy/schainsInternal";
import {deploySkaleManager} from "../tools/deploy/skaleManager";
import {deploySkaleDKGTester} from "../tools/deploy/test/skaleDKGTester";
import {deployWallets} from "../tools/deploy/wallets";
import {stringKeccak256} from "../tools/hashes";
import {fastBeforeEach} from "../tools/mocha";
import {privateKeys} from "../tools/private-keys";
import {getPublicKey, getValidatorIdSignature} from "../tools/signatures";
import {getBroadcastingNodes} from "../tools/rotation";
import {skipTime} from "../tools/time";
import {schainParametersType, SchainType} from "../tools/types";

type G2Point = {
    x: {a: string | bigint, b: string | bigint};
    y: {a: string | bigint, b: string | bigint};
};

type KeyShare = {share: string, publicKey: [string, string]};
type PublishedData = {verificationVector: G2Point[], secretKeyContribution: KeyShare[]};

const g2Generator: G2Point = {
    x: {
        a: "10857046999023057135944570762232829481370756359578518086990519993285655852781",
        b: "11559732032986387107991004021392285783925812861821192530917403151452391805634"
    },
    y: {
        a: "8495653923123431417604973247489272438418190587263600148770280649306958101930",
        b: "4082367875863433681332203403145435568316851327593401208105741076214120093531"
    }
};

const g2Zero: G2Point = {
    x: {a: 0n, b: 0n},
    y: {a: 1n, b: 0n}
};

describe("DKR complaints", () => {
    const schainName = "dkr-complaints";
    const schainHash = stringKeccak256(schainName);

    let owner: Awaited<ReturnType<typeof ethers.getSigners>>[number];
    let validator: Awaited<ReturnType<typeof ethers.getSigners>>[number];
    let outsider: Awaited<ReturnType<typeof ethers.getSigners>>[number];
    let contractManager: ContractManager;
    let constantsHolder: ConstantsHolder;
    let decryption: Decryption;
    let dkr: DKR;
    let ecdh: ECDH;
    let fieldOperations: FieldOperationsTester;
    let nodeRotation: NodeRotation;
    let nodes: Nodes;
    let schains: Schains;
    let schainsInternal: SchainsInternal;
    let skaleDKG: SkaleDKGTester;
    let skaleManager: SkaleManager;
    let validatorService: ValidatorService;
    let wallets: Wallets;
    let nodeWallets: BaseWallet[];
    let dkrId: bigint;
    let dealer: number;
    let exitingNode: number;
    let incomingNode: number;
    let legacyGroup: number[];
    let nonreceiverNode: number;
    let initialRoundData: PublishedData[];
    let validCurrentData: PublishedData;
    let invalidFreeTermData: PublishedData;

    const legacyData = (index: number): PublishedData => initialRoundData[index];

    const makePublishedData = async (
        receiverNodes: number[],
        secret: bigint,
        encryptionSecret: bigint,
        matchingPublicKey: boolean
    ): Promise<PublishedData> => {
        const generatedVector = await fieldOperations.scalarMul(g2Generator, secret);
        const verificationVector: G2Point[] = [{
            x: {a: generatedVector.x.a.toString(), b: generatedVector.x.b.toString()},
            y: {a: generatedVector.y.a.toString(), b: generatedVector.y.b.toString()}
        }, ...Array.from({length: 10}, () => g2Zero)];
        const encryptionPublicKey = await ecdh.publicKey(encryptionSecret);
        const contributionPublicKey: [string, string] = matchingPublicKey
            ? [ethers.toBeHex(encryptionPublicKey[0], 32), ethers.toBeHex(encryptionPublicKey[1], 32)]
            : [ethers.ZeroHash, ethers.ZeroHash];
        const contribution: KeyShare[] = [];
        for (const receiver of receiverNodes) {
            const receiverPublicKey = await nodes.getNodePublicKey(receiver);
            const derivedKey = await ecdh.deriveKey(
                encryptionSecret,
                BigInt(receiverPublicKey[0]),
                BigInt(receiverPublicKey[1])
            );
            const symmetricKey = ethers.sha256(
                ethers.solidityPacked(["bytes32"], [ethers.toBeHex(derivedKey[0], 32)])
            );
            contribution.push({
                share: await decryption.encrypt.staticCall(secret, symmetricKey),
                publicKey: contributionPublicKey
            });
        }
        return {verificationVector, secretKeyContribution: contribution};
    };

    const makeLegacyData = async (receivers: number[], secret: bigint): Promise<PublishedData> => {
        const generatedVector = await fieldOperations.scalarMul(g2Generator, secret);
        const verificationVector: G2Point[] = [{
            x: {a: generatedVector.x.a.toString(), b: generatedVector.x.b.toString()},
            y: {a: generatedVector.y.a.toString(), b: generatedVector.y.b.toString()}
        }, ...Array.from({length: 10}, () => g2Zero)];
        return {
            verificationVector,
            secretKeyContribution: receivers.map(() => ({
                share: ethers.ZeroHash,
                publicKey: [ethers.ZeroHash, ethers.ZeroHash]
            }))
        };
    };

    const makeSecretComplaintTranscript = async (receiverNodes: number[]) => {
        const scalarField =
            21888242871839275222246405745257275088548364400416034343698204186575808495617n;
        const encryptionSecret = 17n;
        const coefficients = Array.from({length: 11}, (_, index) => BigInt(136 + index));
        const normalizePoint = (point: G2Point): G2Point => ({
            x: {a: point.x.a.toString(), b: point.x.b.toString()},
            y: {a: point.y.a.toString(), b: point.y.b.toString()}
        });
        const evaluate = (x: bigint) => {
            let value = 0n;
            let power = 1n;
            for (const coefficient of coefficients) {
                value = (value + coefficient * power) % scalarField;
                power = power * x % scalarField;
            }
            return value;
        };
        const encryptForReceiver = async (receiver: number, secret: bigint): Promise<KeyShare> => {
            const receiverPublicKey = await nodes.getNodePublicKey(receiver);
            const derivedKey = await ecdh.deriveKey(
                encryptionSecret,
                BigInt(receiverPublicKey[0]),
                BigInt(receiverPublicKey[1])
            );
            const symmetricKey = ethers.sha256(
                ethers.solidityPacked(["bytes32"], [ethers.toBeHex(derivedKey[0], 32)])
            );
            return {
                share: await decryption.encrypt.staticCall(secret, symmetricKey),
                publicKey: [ethers.ZeroHash, ethers.ZeroHash]
            };
        };

        const verificationVector: G2Point[] = [];
        for (const coefficient of coefficients) {
            verificationVector.push(normalizePoint(
                await fieldOperations.scalarMul(g2Generator, coefficient)
            ));
        }
        const validContributions: KeyShare[] = [];
        for (let index = 0; index < receiverNodes.length; ++index) {
            validContributions.push(await encryptForReceiver(
                receiverNodes[index],
                evaluate(BigInt(index + 1))
            ));
        }

        const complainantIndex = receiverNodes.indexOf(incomingNode);
        const complainantX = BigInt(complainantIndex + 1);
        const validSecret = evaluate(complainantX);
        const invalidSecret = (validSecret + 1n) % scalarField;
        const multipliedVerificationVector: G2Point[] = [];
        let xPower = 1n;
        for (const coefficient of coefficients) {
            multipliedVerificationVector.push(normalizePoint(
                await fieldOperations.scalarMul(g2Generator, coefficient * xPower % scalarField)
            ));
            xPower = xPower * complainantX % scalarField;
        }
        const invalidContributions = validContributions.map(contribution => ({
            share: contribution.share,
            publicKey: contribution.publicKey
        }));
        invalidContributions[complainantIndex] = await encryptForReceiver(
            incomingNode,
            invalidSecret
        );

        return {
            validData: {
                verificationVector,
                secretKeyContribution: validContributions
            } as PublishedData,
            invalidData: {
                verificationVector,
                secretKeyContribution: invalidContributions
            } as PublishedData,
            multipliedVerificationVector,
            validMultipliedSecret: normalizePoint(
                await fieldOperations.scalarMul(g2Generator, validSecret)
            ),
            invalidMultipliedSecret: normalizePoint(
                await fieldOperations.scalarMul(g2Generator, invalidSecret)
            )
        };
    };

    const createNode = async (index: number, wallet: BaseWallet, publicKey: [BytesLike, BytesLike]) => {
        const hexIndex = index.toString(16).padStart(2, "0");
        await skaleManager.connect(wallet).createNode(
            8545,
            0,
            `0x7f0000${hexIndex}`,
            `0x7f0000${hexIndex}`,
            publicKey,
            `dkr-complaint-${hexIndex}`,
            "some.domain.name"
        );
    };

    const broadcastInitialDkg = async () => {
        const rotation = await nodeRotation.getRotation(schainHash);
        for (const node of legacyGroup) {
            await skaleDKG.connect(nodeWallets[node]).broadcast(
                schainHash,
                node,
                initialRoundData[node].verificationVector,
                initialRoundData[node].secretKeyContribution,
                rotation.rotationCounter
            );
        }
        for (const node of legacyGroup) {
            await skaleDKG.connect(nodeWallets[node]).alright(schainHash, node);
        }
    };

    const startFirstDkr = async () => {
        await nodes.initExit(exitingNode);
        await skaleManager.nodeExit(exitingNode);
        dkrId = await nodeRotation.getActiveDkrId(schainHash);
        expect(dkrId).not.to.equal(0n);
        const currentGroup = await schainsInternal.getNodesInGroup(schainHash);
        incomingNode = Number(currentGroup.find(node => !legacyGroup.includes(Number(node))));
        expect(currentGroup.map(Number)).to.include(dealer);
        expect(currentGroup.map(Number)).to.include(incomingNode);
        expect(currentGroup).to.have.length(legacyGroup.length);
    };

    const broadcastDealerZero = async (
        verificationVector = validCurrentData.verificationVector,
        contribution = validCurrentData.secretKeyContribution,
        roundId = dkrId
    ) => {
        await dkr.connect(nodeWallets[dealer]).broadcast(
            dealer,
            roundId,
            verificationVector,
            contribution
        );
    };

    fastBeforeEach(async () => {
        [owner, validator, outsider] = await ethers.getSigners();
        contractManager = await deployContractManager();
        validatorService = await deployValidatorService(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);
        nodeRotation = await deployNodeRotation(contractManager);
        dkr = await deployDKR(contractManager);
        nodes = await deployNodes(contractManager);
        skaleDKG = await deploySkaleDKGTester(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG);
        skaleManager = await deploySkaleManager(contractManager);
        schains = await deploySchains(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        wallets = await deployWallets(contractManager);
        decryption = await ethers.getContractAt(
            "Decryption",
            await contractManager.getContract("Decryption"),
            owner
        ) as unknown as Decryption;
        ecdh = await ethers.getContractAt(
            "ECDH",
            await contractManager.getContract("ECDH"),
            owner
        ) as unknown as ECDH;
        fieldOperations = await ethers.deployContract("FieldOperationsTester") as unknown as FieldOperationsTester;

        await validatorService.grantRole(await validatorService.VALIDATOR_MANAGER_ROLE(), owner);
        await constantsHolder.grantRole(await constantsHolder.CONSTANTS_HOLDER_MANAGER_ROLE(), owner);
        await nodes.grantRole(await nodes.NODE_MANAGER_ROLE(), owner);
        await validatorService.connect(validator).registerValidator("DKR", "DKR complaint tests", 0, 0);
        const validatorId = await validatorService.getValidatorId(validator);
        await validatorService.enableValidator(validatorId);
        await constantsHolder.setMSR(0);

        const walletOne = new Wallet(String(privateKeys[1])).connect(ethers.provider);
        const walletTwo = new Wallet(String(privateKeys[2])).connect(ethers.provider);
        nodeWallets = [
            walletOne,
            walletTwo
        ];
        while (nodeWallets.length < 24) {
            nodeWallets.push(Wallet.createRandom().connect(ethers.provider));
        }
        for (const wallet of nodeWallets) {
            await owner.sendTransaction({to: wallet, value: ethers.parseEther("10000")});
            const signature = await getValidatorIdSignature(validatorId, wallet);
            await validatorService.connect(validator).linkNodeAddress(wallet, signature);
        }
        for (let index = 0; index < nodeWallets.length; ++index) {
            await createNode(index, nodeWallets[index], getPublicKey(nodeWallets[index]));
        }

        const deposit = await schains.getSchainPrice(SchainType.SMALL, 5);
        await schains.addSchain(
            owner,
            deposit,
            ethers.AbiCoder.defaultAbiCoder().encode(
                [schainParametersType],
                [{
                    lifetime: 5,
                    typeOfSchain: SchainType.SMALL,
                    nonce: 0,
                    name: schainName,
                    originator: ethers.ZeroAddress,
                    options: []
                }]
            )
        );
        legacyGroup = (await schainsInternal.getNodesInGroup(schainHash)).map(Number);
        expect(legacyGroup).to.have.length(16);
        dealer = legacyGroup[0];
        exitingNode = legacyGroup[legacyGroup.length - 1];
        await wallets.connect(owner).rechargeSchainWallet(schainHash, {value: ethers.parseEther("10")});
        initialRoundData = [];
        for (let position = 0; position < legacyGroup.length; ++position) {
            initialRoundData[legacyGroup[position]] = await makeLegacyData(
                legacyGroup,
                BigInt(position + 1)
            );
        }
        await broadcastInitialDkg();
        await startFirstDkr();
        const currentGroup = (await schainsInternal.getNodesInGroup(schainHash)).map(Number);
        nonreceiverNode = nodeWallets.findIndex((_, node) =>
            !currentGroup.includes(node) && !legacyGroup.includes(node)
        );
        validCurrentData = await makePublishedData(currentGroup, 136n, 17n, false);
        invalidFreeTermData = await makePublishedData(currentGroup, 137n, 19n, false);
    });

    describe("secret complaints", () => {
        it("replaces a false complainant after the dealer proves a valid share", async () => {
            const transcript = await makeSecretComplaintTranscript(
                (await schainsInternal.getNodesInGroup(schainHash)).map(Number)
            );
            await broadcastDealerZero(
                transcript.validData.verificationVector,
                transcript.validData.secretKeyContribution
            );
            await dkr.connect(nodeWallets[incomingNode]).complaintSecret(incomingNode, dkrId, dealer);

            await expect(dkr.connect(nodeWallets[dealer]).responseSecret(
                dealer,
                dkrId,
                17,
                {
                    multipliedSecret: transcript.validMultipliedSecret,
                    multipliedVerificationVector: transcript.multipliedVerificationVector,
                    sent: transcript.validData
                }
            )).to.emit(dkr, "BadGuy").withArgs(incomingNode);
            expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId + 1n);
            expect(await schainsInternal.getNodesInGroup(schainHash))
                .not.to.contain(BigInt(incomingNode));
        });

        it("replaces a dealer whose proof exposes an invalid encrypted share", async () => {
            const transcript = await makeSecretComplaintTranscript(
                (await schainsInternal.getNodesInGroup(schainHash)).map(Number)
            );
            await broadcastDealerZero(
                transcript.invalidData.verificationVector,
                transcript.invalidData.secretKeyContribution
            );
            await dkr.connect(nodeWallets[incomingNode]).complaintSecret(incomingNode, dkrId, dealer);

            await expect(dkr.connect(nodeWallets[dealer]).responseSecret(
                dealer,
                dkrId,
                17,
                {
                    multipliedSecret: transcript.invalidMultipliedSecret,
                    multipliedVerificationVector: transcript.multipliedVerificationVector,
                    sent: transcript.invalidData
                }
            )).to.emit(dkr, "BadGuy").withArgs(dealer);
            expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId + 1n);
            expect(await schainsInternal.getNodesInGroup(schainHash)).not.to.contain(BigInt(dealer));
        });

        it("replaces an accused dealer when an eligible receiver reports an unanswered complaint", async () => {
            await broadcastDealerZero();
            await dkr.connect(nodeWallets[incomingNode]).complaintSecret(incomingNode, dkrId, dealer);
            await skipTime(await dkr.complaintTimelimit());

            await expect(dkr.connect(nodeWallets[incomingNode]).complaintTimeout(
                incomingNode, dkrId, dealer
            )).to.emit(dkr, "BadGuy").withArgs(dealer);
            expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId + 1n);
        });

        it("rejects a secret complaint from a nonreceiver", async () => {
            await broadcastDealerZero();

            // Expected invariant: only receivers can adjudicate this DKR transcript.
            await expect(dkr.connect(nodeWallets[nonreceiverNode]).complaintSecret(
                nonreceiverNode, dkrId, dealer
            )).to.be.revertedWithCustomError(dkr, "NodeIsNotReceiver").withArgs(nonreceiverNode);
        });

        it("rejects a secret self-complaint", async () => {
            await broadcastDealerZero();

            // Expected invariant: a dealer cannot create a complaint against itself.
            await expect(dkr.connect(nodeWallets[dealer]).complaintSecret(dealer, dkrId, dealer))
                .to.be.revertedWithCustomError(dkr, "NodeIsNotAccused").withArgs(dealer);
        });

        it("rejects a secret response after the complaint deadline", async () => {
            const transcript = await makeSecretComplaintTranscript(
                (await schainsInternal.getNodesInGroup(schainHash)).map(Number)
            );
            await broadcastDealerZero(
                transcript.validData.verificationVector,
                transcript.validData.secretKeyContribution
            );
            await dkr.connect(nodeWallets[incomingNode]).complaintSecret(incomingNode, dkrId, dealer);
            await skipTime(await dkr.complaintTimelimit());

            // A late response must not race timeout adjudication and select a
            // different guilty node.
            await expect(dkr.connect(nodeWallets[dealer]).responseSecret(
                dealer,
                dkrId,
                17,
                {
                    multipliedSecret: transcript.validMultipliedSecret,
                    multipliedVerificationVector: transcript.multipliedVerificationVector,
                    sent: transcript.validData
                }
            )).to.be.revertedWithCustomError(dkr, "IncorrectPhase").withArgs(dkrId);
            expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId);
        });
    });

    describe("free-term complaints", () => {
        const previousRoundData = () => legacyGroup.map(node => legacyData(node));

        const currentData = (valid: boolean): PublishedData => valid
            ? validCurrentData
            : invalidFreeTermData;

        it("uses legacy DKG commitments to replace a false complainant in the first DKR", async () => {
            const current = currentData(true);
            await broadcastDealerZero(current.verificationVector, current.secretKeyContribution);
            await dkr.connect(nodeWallets[incomingNode]).complaintFreeTerm(
                incomingNode, dkrId, dealer
            );

            await expect(dkr.connect(nodeWallets[dealer]).responseFreeTerm(
                dealer, dkrId, previousRoundData(), current
            )).to.emit(dkr, "BadGuy").withArgs(incomingNode);
            expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId + 1n);
        });

        it("uses legacy DKG commitments to replace a dealer with an invalid free term", async () => {
            const current = currentData(false);
            await broadcastDealerZero(current.verificationVector, current.secretKeyContribution);
            await dkr.connect(nodeWallets[incomingNode]).complaintFreeTerm(
                incomingNode, dkrId, dealer
            );

            await expect(dkr.connect(nodeWallets[dealer]).responseFreeTerm(
                dealer, dkrId, previousRoundData(), current
            )).to.emit(dkr, "BadGuy").withArgs(dealer);
            expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId + 1n);
        });

        it("continues using legacy commitments when the first DKR retries", async () => {
            const firstDealers = await getBroadcastingNodes(
                schainHash,
                schainsInternal,
                nodeRotation
            );
            for (const currentDealer of firstDealers) {
                await dkr.connect(nodeWallets[Number(currentDealer)]).broadcast(
                    currentDealer,
                    dkrId,
                    validCurrentData.verificationVector,
                    validCurrentData.secretKeyContribution
                );
            }
            await skipTime(await dkr.alrightTimelimit());
            await dkr.connect(nodeWallets[dealer]).complaintTimeout(
                dealer,
                dkrId,
                incomingNode
            );

            const retryId = await nodeRotation.getActiveDkrId(schainHash);
            expect(retryId).to.equal(dkrId + 1n);
            const retryDealers = await getBroadcastingNodes(
                schainHash,
                schainsInternal,
                nodeRotation
            );
            expect(retryDealers).to.include(BigInt(dealer));
            const retryReceivers = (await schainsInternal.getNodesInGroup(schainHash)).map(Number);
            const complainant = retryReceivers.find(receiver =>
                !retryDealers.includes(BigInt(receiver))
            );
            if (complainant === undefined) {
                throw new Error("Retry did not include a nondealer receiver");
            }

            await broadcastDealerZero(
                validCurrentData.verificationVector,
                validCurrentData.secretKeyContribution,
                retryId
            );
            await dkr.connect(nodeWallets[complainant]).complaintFreeTerm(
                complainant,
                retryId,
                dealer
            );
            await expect(dkr.connect(nodeWallets[dealer]).responseFreeTerm(
                dealer,
                retryId,
                previousRoundData(),
                validCurrentData
            )).to.emit(dkr, "BadGuy").withArgs(complainant);
        });

        it("rejects reordered legacy data without changing the complaint", async () => {
            const current = currentData(true);
            await broadcastDealerZero(current.verificationVector, current.secretKeyContribution);
            await dkr.connect(nodeWallets[incomingNode]).complaintFreeTerm(
                incomingNode, dkrId, dealer
            );

            const reordered = previousRoundData();
            [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
            await expect(dkr.connect(nodeWallets[dealer]).responseFreeTerm(
                dealer, dkrId, reordered, current
            )).to.be.revertedWithCustomError(dkr, "InvalidVerificationData");
            expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId);
        });

        it("rejects duplicated and extra legacy data without changing the complaint", async () => {
            const current = currentData(true);
            await broadcastDealerZero(current.verificationVector, current.secretKeyContribution);
            await dkr.connect(nodeWallets[incomingNode]).complaintFreeTerm(
                incomingNode, dkrId, dealer
            );

            const duplicated = previousRoundData();
            duplicated[1] = duplicated[0];
            await expect(dkr.connect(nodeWallets[dealer]).responseFreeTerm(
                dealer, dkrId, duplicated, current
            )).to.be.revertedWithCustomError(dkr, "InvalidVerificationData");

            const extra = previousRoundData();
            extra.push(extra[0]);
            await expect(dkr.connect(nodeWallets[dealer]).responseFreeTerm(
                dealer, dkrId, extra, current
            )).to.be.revertedWithCustomError(dkr, "InvalidVerificationData");
            expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId);
        });

        it("rejects omitted legacy data without changing the complaint", async () => {
            const current = currentData(true);
            await broadcastDealerZero(current.verificationVector, current.secretKeyContribution);
            await dkr.connect(nodeWallets[incomingNode]).complaintFreeTerm(
                incomingNode, dkrId, dealer
            );

            // Expected invariant: the first DKR must authenticate every legacy dealer.
            await expect(dkr.connect(nodeWallets[dealer]).responseFreeTerm(
                dealer, dkrId, previousRoundData().slice(0, -1), current
            )).to.be.revertedWithCustomError(dkr, "InvalidVerificationData");
            expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId);
        });

        it("replaces an accused dealer after an unanswered free-term complaint", async () => {
            const current = currentData(true);
            await broadcastDealerZero(current.verificationVector, current.secretKeyContribution);
            await dkr.connect(nodeWallets[incomingNode]).complaintFreeTerm(
                incomingNode, dkrId, dealer
            );
            await skipTime(await dkr.complaintTimelimit());

            await expect(dkr.connect(nodeWallets[incomingNode]).complaintTimeout(
                incomingNode, dkrId, dealer
            )).to.emit(dkr, "BadGuy").withArgs(dealer);
            expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId + 1n);
        });

        it("rejects a free-term complaint from a nonreceiver", async () => {
            const current = currentData(true);
            await broadcastDealerZero(current.verificationVector, current.secretKeyContribution);

            // Expected invariant: only receivers can adjudicate this DKR transcript.
            await expect(dkr.connect(nodeWallets[nonreceiverNode]).complaintFreeTerm(
                nonreceiverNode, dkrId, dealer
            )).to.be.revertedWithCustomError(dkr, "NodeIsNotReceiver").withArgs(nonreceiverNode);
        });

        it("rejects a free-term self-complaint", async () => {
            const current = currentData(true);
            await broadcastDealerZero(current.verificationVector, current.secretKeyContribution);

            // Expected invariant: a dealer cannot create a complaint against itself.
            await expect(dkr.connect(nodeWallets[dealer]).complaintFreeTerm(dealer, dkrId, dealer))
                .to.be.revertedWithCustomError(dkr, "NodeIsNotAccused").withArgs(dealer);
        });

        it("rejects a free-term response after the complaint deadline", async () => {
            const current = currentData(true);
            await broadcastDealerZero(current.verificationVector, current.secretKeyContribution);
            await dkr.connect(nodeWallets[incomingNode]).complaintFreeTerm(
                incomingNode, dkrId, dealer
            );
            await skipTime(await dkr.complaintTimelimit());

            // A late response must not race timeout adjudication and select a different guilty node.
            await expect(dkr.connect(nodeWallets[dealer]).responseFreeTerm(
                dealer, dkrId, previousRoundData(), current
            )).to.be.revertedWithCustomError(dkr, "IncorrectPhase").withArgs(dkrId);
            expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId);
        });
    });

    it("does not let an arbitrary account claim ownership of a complaint participant", async () => {
        await broadcastDealerZero();
        await expect(dkr.connect(outsider).complaintSecret(incomingNode, dkrId, dealer))
            .to.be.revertedWithCustomError(dkr, "NodeDoesNotExist").withArgs(incomingNode);
        expect(await nodeRotation.getActiveDkrId(schainHash)).to.equal(dkrId);
    });
});
