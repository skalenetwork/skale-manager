import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {ConstantsHolder,
         ContractManager,
         Nodes,
         SchainsInternalMock,
         Schains,
         SkaleDKGTester,
         SkaleManager,
         ValidatorService,
         PaymasterController} from "../typechain-types";
import {Wallet} from "ethers";
import {privateKeys} from "./tools/private-keys";
import {deployConstantsHolder} from "./tools/deploy/constantsHolder";
import {deployContractManager} from "./tools/deploy/contractManager";
import {deployNodes} from "./tools/deploy/nodes";
import {deploySchainsInternalMock} from "./tools/deploy/test/schainsInternalMock";
import {deploySchains} from "./tools/deploy/schains";
import {deploySkaleDKGTester} from "./tools/deploy/test/skaleDKGTester";
import {deploySkaleManager} from "./tools/deploy/skaleManager";
import {deployNodeRotation} from "./tools/deploy/nodeRotation";
import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers";
import {deployWallets} from "./tools/deploy/wallets";
import {fastBeforeEach} from "./tools/mocha";
import {getPublicKey, getValidatorIdSignature} from "./tools/signatures";
import {schainParametersType, SchainType} from "./tools/types";
import {deployDelegationController} from "./tools/deploy/delegation/delegationController";
import {deployPaymasterControllerNoInit, setupPaymasterController} from "./tools/deploy/paymasterController";
import {deployFunctionFactory} from "./tools/deploy/factory";

chai.should();
chai.use(chaiAsPromised);

describe("Schains", () => {
    let owner: SignerWithAddress;
    let validator: SignerWithAddress;
    let richGuy1: SignerWithAddress;
    let richGuy2: SignerWithAddress;
    let richGuy3: SignerWithAddress;
    let richGuy4: SignerWithAddress;
    let nodeAddress1: Wallet;
    let nodeAddress2: Wallet;
    let nodeAddress3: Wallet;
    let nodeAddress4: Wallet;

    let constantsHolder: ConstantsHolder;
    let contractManager: ContractManager;
    let schains: Schains;
    let schainsInternal: SchainsInternalMock;
    let nodes: Nodes;
    let validatorService: ValidatorService;
    let paymasterController: PaymasterController;
    let skaleDKG: SkaleDKGTester;
    let skaleManager: SkaleManager;


    fastBeforeEach(async () => {
        [owner, validator, richGuy1, richGuy2, richGuy3, richGuy4] = await ethers.getSigners();

        nodeAddress1 = new Wallet(String(privateKeys[3])).connect(ethers.provider);
        nodeAddress2 = new Wallet(String(privateKeys[4])).connect(ethers.provider);
        nodeAddress3 = new Wallet(String(privateKeys[5])).connect(ethers.provider);
        nodeAddress4 = new Wallet(String(privateKeys[0])).connect(ethers.provider);

        await richGuy1.sendTransaction({to: nodeAddress1.address, value: ethers.parseEther("10000")});
        await richGuy2.sendTransaction({to: nodeAddress2.address, value: ethers.parseEther("10000")});
        await richGuy3.sendTransaction({to: nodeAddress3.address, value: ethers.parseEther("10000")});
        await richGuy4.sendTransaction({to: nodeAddress4.address, value: ethers.parseEther("10000")});

        contractManager = await deployContractManager();

        constantsHolder = await deployConstantsHolder(contractManager);
        paymasterController = await deployPaymasterControllerNoInit(contractManager);
        const deployValidatorService = deployFunctionFactory("ValidatorService") as (contractManager: ContractManager) => Promise<ValidatorService>;
        validatorService = await deployValidatorService(contractManager);
        nodes = await deployNodes(contractManager);
        // await contractManager.setContractsAddress("Nodes", nodes.address);
        schainsInternal = await deploySchainsInternalMock(contractManager);
        await contractManager.setContractsAddress("SchainsInternal", schainsInternal);
        schains = await deploySchains(contractManager);

        await deployDelegationController(contractManager);
        await deployConstantsHolder(contractManager);


        skaleDKG = await deploySkaleDKGTester(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG);
        skaleManager = await deploySkaleManager(contractManager);
        await deployNodeRotation(contractManager);
        await deployWallets(contractManager);

        const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
        const CONSTANTS_HOLDER_MANAGER_ROLE = await constantsHolder.CONSTANTS_HOLDER_MANAGER_ROLE();
        await constantsHolder.grantRole(CONSTANTS_HOLDER_MANAGER_ROLE, owner.address);
        const NODE_MANAGER_ROLE = await nodes.NODE_MANAGER_ROLE();
        await nodes.grantRole(NODE_MANAGER_ROLE, owner.address);

        await validatorService.connect(validator).registerValidator("D2", "D2 is even", 0, 0);
        const validatorIndex = await validatorService.getValidatorId(validator.address);
        await validatorService.enableValidator(validatorIndex);
        const signature = await getValidatorIdSignature(validatorIndex, nodeAddress1);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress1.address, signature);
        const signature2 = await getValidatorIdSignature(validatorIndex, nodeAddress2);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress2.address, signature2);
        const signature3 = await getValidatorIdSignature(validatorIndex, nodeAddress3);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress3.address, signature3);
        const signature4 = await getValidatorIdSignature(validatorIndex, nodeAddress4);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress4.address, signature4);
        await constantsHolder.setMSR(0);
    });

    describe("should add schain", () => {
        it("should create first Schain without parameters initialized", async () => {
            const nodesCount = 2;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await skaleManager.connect(nodeAddress1).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f0000" + hexIndex, // ip
                    "0x7f0000" + hexIndex, // public ip
                    getPublicKey(nodeAddress1), // public key
                    "D2-" + hexIndex, // name
                    "some.domain.name");
            }

            const deposit = await schains.getSchainPrice(4, 5);

            await schains.addSchain(
                owner.address,
                deposit,
                ethers.AbiCoder.defaultAbiCoder().encode(
                    [schainParametersType],
                    [{
                        lifetime: 5,
                        typeOfSchain: SchainType.TEST,
                        nonce: 0,
                        name: "d2",
                        originator: ethers.ZeroAddress,
                        options: []
                    }]
                )
            );
        });

        it("should fail to create second chain without parameters initialized", async () => {
            const nodesCount = 2;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await skaleManager.connect(nodeAddress1).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f0000" + hexIndex, // ip
                    "0x7f0000" + hexIndex, // public ip
                    getPublicKey(nodeAddress1), // public key
                    "D2-" + hexIndex, // name
                    "some.domain.name");
            }

            const deposit = await schains.getSchainPrice(4, 5);

            await schains.addSchain(
                owner.address,
                deposit,
                ethers.AbiCoder.defaultAbiCoder().encode(
                    [schainParametersType],
                    [{
                        lifetime: 5,
                        typeOfSchain: SchainType.TEST,
                        nonce: 0,
                        name: "d2",
                        originator: ethers.ZeroAddress,
                        options: []
                    }]
                )
            );

            (await paymasterController.ima()).should.be.equal("0x0000000000000000000000000000000000000000");
            await schains.addSchain(
                owner.address,
                deposit,
                ethers.AbiCoder.defaultAbiCoder().encode(
                    [schainParametersType],
                    [{
                        lifetime: 5,
                        typeOfSchain: SchainType.TEST,
                        nonce: 0,
                        name: "d3",
                        originator: ethers.ZeroAddress,
                        options: []
                    }]
                )
            ).should.be.reverted;
        });

        it("should create second chain after parameters initialized", async () => {
            const nodesCount = 2;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await skaleManager.connect(nodeAddress1).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f0000" + hexIndex, // ip
                    "0x7f0000" + hexIndex, // public ip
                    getPublicKey(nodeAddress1), // public key
                    "D2-" + hexIndex, // name
                    "some.domain.name");
            }

            const deposit = await schains.getSchainPrice(4, 5);


            await schains.addSchain(
                owner.address,
                deposit,
                ethers.AbiCoder.defaultAbiCoder().encode(
                    [schainParametersType],
                    [{
                        lifetime: 5,
                        typeOfSchain: SchainType.TEST,
                        nonce: 0,
                        name: "d2",
                        originator: ethers.ZeroAddress,
                        options: []
                    }]
                )
            );

            await setupPaymasterController(contractManager);
            await schains.addSchain(
                owner.address,
                deposit,
                ethers.AbiCoder.defaultAbiCoder().encode(
                    [schainParametersType],
                    [{
                        lifetime: 5,
                        typeOfSchain: SchainType.TEST,
                        nonce: 0,
                        name: "d3",
                        originator: ethers.ZeroAddress,
                        options: []
                    }]
                )
            );
        });
    });
});
