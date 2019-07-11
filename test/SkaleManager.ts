import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ConstantsHolderContract,
         ConstantsHolderInstance,
         ContractManagerContract,
         ContractManagerInstance,
         ManagerDataContract,
         ManagerDataInstance,
         NodesDataContract,
         NodesDataInstance,
         NodesFunctionalityContract,
         NodesFunctionalityInstance,
         SchainsDataContract,
         SchainsDataInstance,
         SchainsFunctionality1Contract,
         SchainsFunctionality1Instance,
         SchainsFunctionalityContract,
         SchainsFunctionalityInstance,
         SkaleManagerContract,
         SkaleManagerInstance,
         SkaleTokenContract,
         SkaleTokenInstance,
         ValidatorsDataContract,
         ValidatorsDataInstance,
         ValidatorsFunctionalityContract,
         ValidatorsFunctionalityInstance} from "../types/truffle-contracts";

import { gasMultiplier } from "./utils/command_line";
import { skipTime } from "./utils/time";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const ConstantsHolder: ConstantsHolderContract = artifacts.require("./ConstantsHolder");
const NodesData: NodesDataContract = artifacts.require("./NodesData");
const NodesFunctionality: NodesFunctionalityContract = artifacts.require("./NodesFunctionality");
const SkaleManager: SkaleManagerContract = artifacts.require("./SkaleManager");
const SkaleToken: SkaleTokenContract = artifacts.require("./SkaleToken");
const ValidatorsData: ValidatorsDataContract = artifacts.require("./ValidatorsData");
const ValidatorsFunctionality: ValidatorsFunctionalityContract = artifacts.require("./ValidatorsFunctionality");
const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");
const SchainsFunctionality: SchainsFunctionalityContract = artifacts.require("./SchainsFunctionality");
const SchainsFunctionality1: SchainsFunctionality1Contract = artifacts.require("./SchainsFunctionality1");
const ManagerData: ManagerDataContract = artifacts.require("./ManagerData");

chai.should();
chai.use(chaiAsPromised);

contract("SkaleManager", ([owner, validator, developer, hacker]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let nodesData: NodesDataInstance;
    let nodesFunctionality: NodesFunctionalityInstance;
    let skaleManager: SkaleManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let validatorsData: ValidatorsDataInstance;
    let validatorsFunctionality: ValidatorsFunctionalityInstance;
    let schainsData: SchainsDataInstance;
    let schainsFunctionality: SchainsFunctionalityInstance;
    let schainsFunctionality1: SchainsFunctionality1Instance;
    let managerData: ManagerDataInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: owner});

        skaleToken = await SkaleToken.new(contractManager.address, { from: owner });
        await contractManager.setContractsAddress("SkaleToken", skaleToken.address);

        constantsHolder = await ConstantsHolder.new(
            contractManager.address,
            {from: owner, gas: 8000000});
        await contractManager.setContractsAddress("Constants", constantsHolder.address);

        nodesData = await NodesData.new(
            5,
            contractManager.address,
            {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("NodesData", nodesData.address);

        nodesFunctionality = await NodesFunctionality.new(
            contractManager.address,
            {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("NodesFunctionality", nodesFunctionality.address);

        validatorsData = await ValidatorsData.new(
            "ValidatorsFunctionality", contractManager.address, {gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("ValidatorsData", validatorsData.address);

        validatorsFunctionality = await ValidatorsFunctionality.new(
            "SkaleManager", "ValidatorsData", contractManager.address, {gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("ValidatorsFunctionality", validatorsFunctionality.address);

        schainsData = await SchainsData.new(
            "SchainsFunctionality1",
            contractManager.address,
            {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsData", schainsData.address);

        schainsFunctionality = await SchainsFunctionality.new(
            "SkaleManager",
            "SchainsData",
            contractManager.address,
            {from: owner, gas: 7900000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsFunctionality", schainsFunctionality.address);

        schainsFunctionality1 = await SchainsFunctionality1.new(
            "SchainsFunctionality",
            "SchainsData",
            contractManager.address,
            {from: owner, gas: 7000000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsFunctionality1", schainsFunctionality1.address);

        managerData = await ManagerData.new("SkaleManager", contractManager.address, {gas: 8000000});
        await contractManager.setContractsAddress("ManagerData", managerData.address);

        skaleManager = await SkaleManager.new(contractManager.address, {gas: 8000000});
        contractManager.setContractsAddress("SkaleManager", skaleManager.address);
    });

    it("should fail to process token fallback if sent not from SkaleToken", async () => {
        await skaleManager.tokenFallback(validator, 5, "0x11", {from: validator}).
            should.be.eventually.rejectedWith("sender is invalid");
    });

    describe("when validator has SKALE tokens", async () => {
        beforeEach(async () => {
            skaleToken.transfer(validator, "0x3635c9adc5dea00000", {from: owner});
        });

        it("should fail to process token fallback if operation type is wrong", async () => {
            await skaleToken.transferWithData(skaleManager.address, "0x1", "0x11", {from: validator}).
                should.be.eventually.rejectedWith("Operation type is not identified");
        });

        it("should create a node", async () => {
            await skaleToken.transferWithData(
                skaleManager.address,
                "0x56bc75e2d63100000",
                "0x01" + // create node
                "2161" + // port
                "0000" + // nonce
                "7f000001" + // ip
                "7f000001" + // public ip
                "1122334455667788990011223344556677889900112233445566778899001122" +
                "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                "6432", // name,
                {from: validator});

            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
            await validatorsData.isGroupActive(web3.utils.soliditySha3(0)).should.be.eventually.true;
        });

        describe("when node is created", async () => {

            beforeEach(async () => {
                await skaleToken.transferWithData(
                    skaleManager.address,
                    "0x56bc75e2d63100000",
                    "0x01" + // create node
                    "2161" + // port
                    "0000" + // nonce
                    "7f000001" + // ip
                    "7f000001" + // public ip
                    "1122334455667788990011223344556677889900112233445566778899001122" +
                    "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                    "6432", // name,
                    {from: validator});
            });

            it("should fail to init withdrawing of deposit of someone else's node", async () => {
                await skaleManager.initWithdrawDeposit(0, {from: hacker})
                    .should.be.eventually.rejectedWith("Node does not exist for message sender");
            });

            it("should init withdrawing of deposit", async () => {
                await skaleManager.initWithdrawDeposit(0, {from: validator});

                await nodesData.isNodeLeaving(0).should.be.eventually.true;
            });

            it("should remove the node", async () => {
                await skaleManager.deleteNode(0, {from: validator});

                await nodesData.isNodeLeft(0).should.be.eventually.true;
                await skaleToken.balanceOf(validator)
                    .should.be.eventually.deep.equal(web3.utils.toBN("0x30ca024f987b900000"));
            });

            describe("when withdrawing of deposit is initialized", async () => {
                beforeEach (async () => {
                    await skaleManager.initWithdrawDeposit(0, {from: validator});
                });

                it("should fail if withdrawing completes too early", async () => {
                    await skaleManager.completeWithdrawdeposit(0, {from: validator})
                        .should.be.eventually.rejectedWith("Leaving period is not expired");
                });

                it("should complete deposit withdrawing process", async () => {
                    skipTime(web3, 5);

                    await skaleManager.completeWithdrawdeposit(0, {from: validator});

                    await nodesData.isNodeLeft(0).should.be.eventually.true;
                    await skaleToken.balanceOf(validator)
                        .should.be.eventually.deep.equal(web3.utils.toBN("0x3635c9adc5dea00000"));
                });
            });
        });
    });
});
