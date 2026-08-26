// cspell:words nonreceiver

import {HDNodeWallet, Wallet} from "ethers";
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
    ValidatorService,
    Wallets
} from "../../typechain-types";
import {deployConstantsHolder} from "./deploy/constantsHolder";
import {deployContractManager} from "./deploy/contractManager";
import {deployDKR} from "./deploy/dkr";
import {deployNodeRotation} from "./deploy/nodeRotation";
import {deployNodes} from "./deploy/nodes";
import {deploySchains} from "./deploy/schains";
import {deploySchainsInternal} from "./deploy/schainsInternal";
import {deploySkaleManager} from "./deploy/skaleManager";
import {deploySkaleDKGTester} from "./deploy/test/skaleDKGTester";
import {deployDKRTester} from "./deploy/test/dkrTester";
import {deployValidatorService} from "./deploy/delegation/validatorService";
import {deployWallets} from "./deploy/wallets";
import {stringKeccak256} from "./hashes";
import {getBroadcastingNodes} from "./rotation";
import {getPublicKey, getValidatorIdSignature} from "./signatures";
import {SchainType, schainParametersType} from "./types";

export type RegisteredDkrNode = {
    id: bigint;
    wallet: HDNodeWallet;
};

export type DkrG2Point = {
    x: {a: string; b: string};
    y: {a: string; b: string};
};

export type DkrKeyShare = {
    share: string;
    publicKey: [string, string];
};

export type DkrBroadcastData = {
    verificationVector: DkrG2Point[];
    secretKeyContribution: DkrKeyShare[];
};

export type DkrIntegrationFixture = {
    owner: SignerWithAddress;
    validator: SignerWithAddress;
    outsider: SignerWithAddress;
    contractManager: ContractManager;
    constantsHolder: ConstantsHolder;
    dkr: DKRTester;
    nodeRotation: NodeRotation;
    nodes: Nodes;
    schains: Schains;
    schainsInternal: SchainsInternal;
    skaleDKG: SkaleDKGTester;
    skaleManager: SkaleManager;
    validatorService: ValidatorService;
    wallets: Wallets;
    registeredNodes: RegisteredDkrNode[];
    schainName: string;
    schainHash: string;
    originalGroup: bigint[];
    receivers: RegisteredDkrNode[];
    dealers: RegisteredDkrNode[];
    exitingNode: RegisteredDkrNode;
    incomingNode: RegisteredDkrNode;
    freeNode: RegisteredDkrNode;
    dkrId: bigint;
    broadcastData: DkrBroadcastData;
    nodeById(id: bigint): RegisteredDkrNode;
};

export type DkrFixtureOptions = {
    schainName?: string;
    nodesCount?: number;
    schainType?: SchainType;
};

export const buildDkrBroadcastData = (threshold: number, receivers: number): DkrBroadcastData => {
    // Ordinary DKR broadcast authenticates dimensions and stores a hash. Curve
    // validation is intentionally exercised by complaint-response scenarios.
    const point: DkrG2Point = {
        x: {
            a: "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d",
            b: "0x2695832627b9081e77da7a3fc4d574363bf051700055822f3d394dc3d9ff7417"
        },
        y: {
            a: "0x24727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d",
            b: "0x03a7a3e6f3b539dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99"
        }
    };
    const keyShare: DkrKeyShare = {
        share: "0x937c9c846a6fa7fd1984fe82e739ae37fcaa555c1dc0e8597c9f81b6a12f232f",
        publicKey: [
            "0xfdf8101e91bd658fa1cea6fdd75adb8542951ce3d251cdaa78f43493dad730b5",
            "0x9d32d2e872b36aa70cdce544b550ebe96994de860b6f6ebb7d0b4d4e6724b4bf"
        ]
    };
    return {
        verificationVector: Array.from({length: threshold}, () => point),
        secretKeyContribution: Array.from({length: receivers}, () => keyShare)
    };
};

export const deployDkrIntegrationFixture = async (
    options: DkrFixtureOptions = {}
): Promise<DkrIntegrationFixture> => {
    const schainName = options.schainName ?? "dkr-integration";
    const nodesCount = options.nodesCount ?? 20;
    const schainType = options.schainType ?? SchainType.LARGE;
    const schainHash = stringKeccak256(schainName);
    const [owner, validator, outsider] = await ethers.getSigners();
    const contractManager = await deployContractManager();
    const validatorService = await deployValidatorService(contractManager);
    const constantsHolder = await deployConstantsHolder(contractManager);
    const nodeRotation = await deployNodeRotation(contractManager);
    await deployDKR(contractManager);
    const dkr = await deployDKRTester(contractManager);
    const nodes = await deployNodes(contractManager);
    const skaleDKG = await deploySkaleDKGTester(contractManager);
    await contractManager.setContractsAddress("SkaleDKG", skaleDKG);
    const skaleManager = await deploySkaleManager(contractManager);
    const schains = await deploySchains(contractManager);
    const schainsInternal = await deploySchainsInternal(contractManager);
    const wallets = await deployWallets(contractManager);

    await validatorService.grantRole(await validatorService.VALIDATOR_MANAGER_ROLE(), owner);
    await constantsHolder.grantRole(await constantsHolder.CONSTANTS_HOLDER_MANAGER_ROLE(), owner);
    await nodes.grantRole(await nodes.NODE_MANAGER_ROLE(), owner);
    await validatorService.connect(validator).registerValidator("DKR", "DKR integration", 0, 0);
    const validatorId = await validatorService.getValidatorId(validator);
    await validatorService.enableValidator(validatorId);
    await constantsHolder.setMSR(0);

    const registeredNodes: RegisteredDkrNode[] = [];
    for (let index = 0; index < nodesCount; ++index) {
        const wallet = Wallet.createRandom().connect(ethers.provider);
        await owner.sendTransaction({to: wallet, value: ethers.parseEther("10000")});
        await validatorService.connect(validator).linkNodeAddress(
            wallet,
            await getValidatorIdSignature(validatorId, wallet)
        );
        const hexIndex = index.toString(16).padStart(2, "0");
        await skaleManager.connect(wallet).createNode(
            8545,
            0,
            `0x7f0000${hexIndex}`,
            `0x7f0000${hexIndex}`,
            getPublicKey(wallet),
            `DKR-${hexIndex}`,
            "dkr.example"
        );
        registeredNodes.push({id: BigInt(index), wallet});
    }
    const nodeById = (id: bigint) => {
        const node = registeredNodes.find(candidate => candidate.id === id);
        if (node === undefined) {
            throw new Error(`Node ${id.toString()} was not registered by the fixture`);
        }
        return node;
    };

    const deposit = await schains.getSchainPrice(schainType, 5);
    await schains.addSchain(
        owner,
        deposit,
        ethers.AbiCoder.defaultAbiCoder().encode(
            [schainParametersType],
            [{
                lifetime: 5,
                typeOfSchain: schainType,
                nonce: 0,
                name: schainName,
                originator: ethers.ZeroAddress,
                options: []
            }]
        )
    );
    await skaleDKG.setSuccessfulDKGPublic(schainHash);
    await wallets.rechargeSchainWallet(schainHash, {value: ethers.parseEther("1")});

    const originalGroup = await schainsInternal.getNodesInGroup(schainHash);
    const exitingNode = nodeById(originalGroup[0]);
    await nodes.initExit(exitingNode.id);
    await skaleManager.nodeExit(exitingNode.id);

    const receiverIds = await schainsInternal.getNodesInGroup(schainHash);
    const receivers = receiverIds.map(nodeById);
    const incomingNode = receivers.find(node => !originalGroup.includes(node.id));
    if (incomingNode === undefined) {
        throw new Error("Rotation did not select an incoming receiver");
    }
    const freeNode = registeredNodes.find(node =>
        node.id !== exitingNode.id && !receiverIds.includes(node.id)
    );
    if (freeNode === undefined) {
        throw new Error("Fixture did not leave a registered nonreceiver");
    }
    const dealerIds = await getBroadcastingNodes(schainHash, schainsInternal, nodeRotation);
    const dealers = dealerIds.map(nodeById);
    const dkrId = await nodeRotation.getActiveDkrId(schainHash);

    return {
        owner,
        validator,
        outsider,
        contractManager,
        constantsHolder,
        dkr,
        nodeRotation,
        nodes,
        schains,
        schainsInternal,
        skaleDKG,
        skaleManager,
        validatorService,
        wallets,
        registeredNodes,
        schainName,
        schainHash,
        originalGroup,
        receivers,
        dealers,
        exitingNode,
        incomingNode,
        freeNode,
        dkrId,
        broadcastData: buildDkrBroadcastData(dealers.length, receivers.length),
        nodeById
    };
};
