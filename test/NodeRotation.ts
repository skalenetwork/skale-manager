import {ethers} from "hardhat";
import {fastBeforeEach} from "./tools/mocha";
import {ConstantsHolder, NodeRotation, Nodes, Schains, SchainsInternal, SkaleDKGTester, SkaleManager, ValidatorService, Wallets} from "../typechain-types";
import {deployNodes} from "./tools/deploy/nodes";
import {deployContractManager} from "./tools/deploy/contractManager";
import {Wallet} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {deploySkaleManager} from "./tools/deploy/skaleManager";
import {deployValidatorService} from "./tools/deploy/delegation/validatorService";
import {deployConstantsHolder} from "./tools/deploy/constantsHolder";
import {getPublicKey, getValidatorIdSignature} from "./tools/signatures";
import {deploySchains} from "./tools/deploy/schains";
import {SchainType, schainParametersType} from "./tools/types";
import {deploySchainsInternal} from "./tools/deploy/schainsInternal";
import {stringKeccak256} from "./tools/hashes";
import _ from "underscore";
import {deploySkaleDKGTester} from "./tools/deploy/test/skaleDKGTester";
import {skipTime} from "./tools/time";
import {deployWallets} from "./tools/deploy/wallets";
import {deployNodeRotation} from "./tools/deploy/nodeRotation";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

chai.should();
chai.use(chaiAsPromised);

describe("NodeRotation", () => {
    let owner: SignerWithAddress;
    let validator: SignerWithAddress;

    let validatorId: number;

    let constantsHolder: ConstantsHolder;
    let nodeRotation: NodeRotation;
    let nodes: Nodes;
    let schains: Schains;
    let schainsInternal: SchainsInternal;
    let skaleDKG: SkaleDKGTester;
    let skaleManager: SkaleManager;
    let validatorService: ValidatorService;
    let wallets: Wallets;

    fastBeforeEach(async () => {
        [owner, validator] = await ethers.getSigners();
        const contractManager = await deployContractManager();
        validatorService = await deployValidatorService(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);
        nodeRotation = await deployNodeRotation(contractManager);
        nodes = await deployNodes(contractManager);
        skaleDKG = await deploySkaleDKGTester(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);
        skaleManager = await deploySkaleManager(contractManager);
        schains = await deploySchains(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        wallets = await deployWallets(contractManager);

        const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
        const CONSTANTS_HOLDER_MANAGER_ROLE = await constantsHolder.CONSTANTS_HOLDER_MANAGER_ROLE();
        await constantsHolder.grantRole(CONSTANTS_HOLDER_MANAGER_ROLE, owner.address);
        const NODE_MANAGER_ROLE = await nodes.NODE_MANAGER_ROLE();
        await nodes.grantRole(NODE_MANAGER_ROLE, owner.address);

        await validatorService.connect(validator).registerValidator("D2", "D2 is even", 0, 0);
        validatorId = (await validatorService.getValidatorId(validator.address)).toNumber();
        await validatorService.enableValidator(validatorId);
        await constantsHolder.setMSR(0);
    })

    describe("when nodes are registered", () => {
        type RegisteredNode = {
            id: number;
            wallet: Wallet;
        }

        const totalNumberOfNodes = 20;
        const registeredNodes: RegisteredNode[] = [];
        const nodeBalance = ethers.utils.parseEther("10000");

        fastBeforeEach(async () => {
            for (const index of Array.from(Array(totalNumberOfNodes).keys())) {
                const nodeWallet = Wallet.createRandom().connect(ethers.provider);
                await owner.sendTransaction({to: nodeWallet.address, value: nodeBalance});

                const signature = await getValidatorIdSignature(validatorId, nodeWallet);
                await validatorService.connect(validator).linkNodeAddress(nodeWallet.address, signature);

                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await skaleManager.connect(nodeWallet).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f0000" + hexIndex, // ip
                    "0x7f0000" + hexIndex, // public ip
                    getPublicKey(nodeWallet), // public key
                    "D2-" + hexIndex, // name
                    "some.domain.name");
                registeredNodes.push({id: index, wallet: nodeWallet})
            }
        })

        describe("when an schain is created", () => {
            const schainName = "d2";
            const schainHash = stringKeccak256(schainName);
            let chainNodes: RegisteredNode[];

            fastBeforeEach(async () => {
                const schainType = SchainType.LARGE;
                const deposit = await schains.getSchainPrice(schainType, 5);

                await schains.addSchain(
                    owner.address,
                    deposit,
                    ethers.utils.defaultAbiCoder.encode(
                        [schainParametersType],
                        [{
                            lifetime: 5,
                            typeOfSchain: schainType,
                            nonce: 0,
                            name: schainName,
                            originator: ethers.constants.AddressZero,
                            options: []
                        }]
                    )
                );
                await skaleDKG.setSuccessfulDKGPublic(schainHash);
                await wallets.connect(owner).rechargeSchainWallet(schainHash, {value: ethers.utils.parseEther("1")});

                chainNodes = (await schainsInternal.getNodesInGroup(schainHash)).map(id => {
                    const node = registeredNodes.find(registeredNode => registeredNode.id == id.toNumber())
                    if (node === undefined) {
                        throw new Error(`Can't find a node with id ${id.toString()}`)
                    }
                    return node;
                });
            });

            describe("when a node requested for an exit", () => {
                let exitingNode: RegisteredNode;
                let enteringNode: RegisteredNode;

                fastBeforeEach(async () => {
                    let node = _.sample(chainNodes);
                    if (node === undefined) {
                        throw new Error("Can't pick a node");
                    }
                    exitingNode = node;

                    await nodes.initExit(exitingNode.id);
                    await skaleManager.nodeExit(exitingNode.id);

                    const newChainNodesIds = (await schainsInternal.getNodesInGroup(schainHash)).map(id => id.toNumber());
                    const enteringNodeId = newChainNodesIds.filter(id => chainNodes.find(chainNode => chainNode.id == id) === undefined)[0];

                    node = registeredNodes.find(registeredNode => registeredNode.id == enteringNodeId);
                    if (node === undefined) {
                        throw Error("Can't determine entering node");
                    }
                    enteringNode = node;

                    chainNodes.should.not.contain(enteringNode);
                })

                describe("when not entering node fails DKG", () => {
                    let failingNode: RegisteredNode;

                    fastBeforeEach(async () => {
                        let node = _.sample(chainNodes.filter(chainNode => chainNode !== exitingNode))
                        if (node === undefined) {
                            throw new Error("Can't pick a node");
                        }
                        failingNode = node;

                        node = _.sample(chainNodes.filter(chainNode => ![exitingNode, failingNode].includes(chainNode)));
                        if (node === undefined) {
                            throw new Error("Can't pick a node");
                        }
                        const goodNode = node;

                        // farther keys are not valid
                        const verificationVector = Array(11).fill(
                            {
                                x: {
                                    a: "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d",
                                    b: "0x2695832627b9081e77da7a3fc4d574363bf051700055822f3d394dc3d9ff7417",
                                },
                                y: {
                                    a: "0x24727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d",
                                    b: "0x03a7a3e6f3b539dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99"
                                }
                            }
                        ) as {x: {a: string, b: string}, y: {a: string, b: string}}[];

                        const encryptedSecretKeyContribution =
                            Array(chainNodes.length).fill(
                            {
                                share: "0x937c9c846a6fa7fd1984fe82e739ae37fcaa555c1dc0e8597c9f81b6a12f232f",
                                publicKey: [
                                    "0xfdf8101e91bd658fa1cea6fdd75adb8542951ce3d251cdaa78f43493dad730b5",
                                    "0x9d32d2e872b36aa70cdce544b550ebe96994de860b6f6ebb7d0b4d4e6724b4bf"
                                ]
                            }) as {share: string, publicKey: [string, string]}[];

                        const rotation = await nodeRotation.getRotation(schainHash);
                        await skaleDKG.connect(goodNode.wallet).broadcast(
                            schainHash,
                            goodNode.id,
                            verificationVector,
                            encryptedSecretKeyContribution,
                            rotation.rotationCounter
                        );

                        await skipTime(await constantsHolder.complaintTimeLimit());

                        await skaleDKG.connect(goodNode.wallet).complaint(schainHash, goodNode.id, failingNode.id);
                    });

                    it("a node that fails DKG after node exit " +
                       "should have finish_ts 1 sec bigger than a leaving node", async () => {
                        const exitingNodeFinishTs = (await nodeRotation.getLeavingHistory(exitingNode.id))[0].finishedRotation.toNumber();
                        const failingNodeFinishTs = (await nodeRotation.getLeavingHistory(failingNode.id))[0].finishedRotation.toNumber();

                        failingNodeFinishTs.should.be.equal(exitingNodeFinishTs + 1);
                    })
                });
            })
        })
    })
});
