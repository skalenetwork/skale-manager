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

    it("should transfer ownership", async () => {
        await skaleManager.transferOwnership(hacker, {from: hacker})
            .should.be.eventually.rejectedWith("Sender is not owner");

        await skaleManager.transferOwnership(hacker, {from: owner});

        await skaleManager.owner().should.be.eventually.equal(hacker);
    });

    describe("when validator has SKALE tokens", async () => {
        beforeEach(async () => {
            skaleToken.transfer(validator, "0x410D586A20A4C00000", {from: owner});
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
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.deleteNode(0, {from: validator});

                await nodesData.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the node by root", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.deleteNodeByRoot(0, {from: owner});

                await nodesData.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
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

                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    await skaleManager.completeWithdrawdeposit(0, {from: validator});

                    await nodesData.isNodeLeft(0).should.be.eventually.true;

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("100000000000000000000"))).to.be.true;
                });
            });
        });

        describe("when two nodes are created", async () => {

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
                await skaleToken.transferWithData(
                    skaleManager.address,
                    "0x56bc75e2d63100000",
                    "0x01" + // create node
                    "2161" + // port
                    "0000" + // nonce
                    "7f000002" + // ip
                    "7f000002" + // public ip
                    "1122334455667788990011223344556677889900112233445566778899001122" +
                    "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                    "6433", // name,
                    {from: validator});
            });

            it("should fail to init withdrawing of deposit of first node from another account", async () => {
                await skaleManager.initWithdrawDeposit(0, {from: hacker})
                    .should.be.eventually.rejectedWith("Node does not exist for message sender");
            });

            it("should fail to init withdrawing of deposit of second node from another account", async () => {
                await skaleManager.initWithdrawDeposit(1, {from: hacker})
                    .should.be.eventually.rejectedWith("Node does not exist for message sender");
            });

            it("should init withdrawing of deposit of first node", async () => {
                await skaleManager.initWithdrawDeposit(0, {from: validator});

                await nodesData.isNodeLeaving(0).should.be.eventually.true;
            });

            it("should init withdrawing of deposit of second node", async () => {
                await skaleManager.initWithdrawDeposit(1, {from: validator});

                await nodesData.isNodeLeaving(1).should.be.eventually.true;
            });

            it("should remove the first node", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.deleteNode(0, {from: validator});

                await nodesData.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the second node", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.deleteNode(1, {from: validator});

                await nodesData.isNodeLeft(1).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the first node by root", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.deleteNodeByRoot(0, {from: owner});

                await nodesData.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });

            it("should remove the second node by root", async () => {
                const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));

                await skaleManager.deleteNodeByRoot(1, {from: owner});

                await nodesData.isNodeLeft(1).should.be.eventually.true;

                const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                expect(balanceAfter.sub(balanceBefore).eq(web3.utils.toBN("0"))).to.be.true;
            });
        });

        describe("when 18 nodes are in the system", async () => {
            beforeEach(async () => {
                skaleToken.transfer(validator, "0x3635c9adc5dea00000", {from: owner});

                for (let i = 0; i < 18; ++i) {
                    await skaleToken.transferWithData(
                        skaleManager.address,
                        "0x56bc75e2d63100000",
                        "0x01" + // create node
                        "2161" + // port
                        "0000" + // nonce
                        "7f0000" + ("0" + (i + 1).toString(16)).slice(-2) + // ip
                        "7f000001" + // public ip
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                        "64322d" + (48 + i + 1).toString(16), // name,
                        {from: validator});
                }
            });

            it("should fail to create schain if not enough SKALE tokens", async () => {
                await skaleToken.transferWithData(
                    skaleManager.address,
                    "0x1cc2d6d04a2ca",
                    "0x10" + // create schain
                    "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                    "01" + // type of schain
                    "0000" + // nonce
                    "6432", // name
                    {from: developer}).should.be.eventually.rejectedWith("Not enough money");
            });

            it("should fail to send validator verdict from not node owner", async () => {
                await skaleManager.sendVerdict(0, 1, 0, 50, {from: hacker})
                    .should.be.eventually.rejectedWith("Node does not exist for Message sender");
            });

            it("should fail to send validator verdict if send it too early", async () => {
                await skaleManager.sendVerdict(0, 1, 0, 50, {from: validator})
                    .should.be.eventually.rejectedWith("The time has not come to send verdict");
            });

            it("should fail to send validator verdict if sender node does not exist", async () => {
                await skaleManager.sendVerdict(18, 1, 0, 50, {from: validator})
                    .should.be.eventually.rejectedWith("Node does not exist for Message sender");
            });

            it("should send validator verdict", async () => {
                skipTime(web3, 3400);
                await skaleManager.sendVerdict(0, 1, 0, 50, {from: validator});

                await validatorsData.verdicts(web3.utils.soliditySha3(1), 0, 0)
                    .should.be.eventually.deep.equal(web3.utils.toBN(0));
                await validatorsData.verdicts(web3.utils.soliditySha3(1), 0, 1)
                    .should.be.eventually.deep.equal(web3.utils.toBN(50));
            });

            describe("when validator verdict is received", async () => {
                beforeEach(async () => {
                    skipTime(web3, 3400);
                    await skaleManager.sendVerdict(0, 1, 0, 50, {from: validator});
                });

                it("should fail to get bounty if sender is not owner of the node", async () => {
                    await skaleManager.getBounty(1, {from: hacker})
                        .should.be.eventually.rejectedWith("Node does not exist for Message sender");
                });

                it("should get bounty", async () => {
                    skipTime(web3, 200);
                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                    const bounty = web3.utils.toBN("893061271147690900777");

                    await skaleManager.getBounty(1, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });
            });

            describe("when validator verdict with downtime is received", async () => {
                beforeEach(async () => {
                    skipTime(web3, 3400);
                    await skaleManager.sendVerdict(0, 1, 1, 50, {from: validator});
                });

                it("should fail to get bounty if sender is not owner of the node", async () => {
                    await skaleManager.getBounty(1, {from: hacker})
                        .should.be.eventually.rejectedWith("Node does not exist for Message sender");
                });

                it("should get bounty", async () => {
                    skipTime(web3, 200);
                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                    const bounty = web3.utils.toBN("893019925718471100273");

                    await skaleManager.getBounty(1, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });

                it("should get bounty after break", async () => {
                    skipTime(web3, 600);
                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                    const bounty = web3.utils.toBN("893019925718471100273");

                    await skaleManager.getBounty(1, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });

                it("should get bounty after big break", async () => {
                    skipTime(web3, 800);
                    const balanceBefore = web3.utils.toBN(await skaleToken.balanceOf(validator));
                    const bounty = web3.utils.toBN("892937234860031499264");

                    await skaleManager.getBounty(1, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleToken.balanceOf(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });
            });

            describe("when developer has SKALE tokens", async () => {
                beforeEach(async () => {
                    skaleToken.transfer(developer, "0x3635c9adc5dea00000", {from: owner});
                });

                it("should create schain", async () => {
                    await skaleToken.transferWithData(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        "0x10" + // create schain
                        "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                        "03" + // type of schain
                        "0000" + // nonce
                        "6432", // name
                        {from: developer});

                    const schain = await schainsData.schains(web3.utils.soliditySha3("d2"));
                    schain[0].should.be.equal("d2");
                });

                describe("when schain is created", async () => {
                    beforeEach(async () => {
                        await skaleToken.transferWithData(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            "0x10" + // create schain
                            "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                            "03" + // type of schain
                            "0000" + // nonce
                            "6432", // name
                            {from: developer});
                    });

                    it("should fail to delete schain if sender is not owner of it", async () => {
                        await skaleManager.deleteSchain("d2", {from: hacker})
                            .should.be.eventually.rejectedWith("Message sender is not an owner of Schain");
                    });

                    it("should delete schain", async () => {
                        await skaleManager.deleteSchain("d2", {from: developer});

                        await schainsData.getSchains().should.be.eventually.empty;
                    });
                });

                describe("when another schain is created", async () => {
                    beforeEach(async () => {
                        await skaleToken.transferWithData(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            "0x10" + // create schain
                            "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                            "03" + // type of schain
                            "0000" + // nonce
                            "6433", // name
                            {from: developer});
                    });

                    it("should fail to delete schain if sender is not owner of it", async () => {
                        await skaleManager.deleteSchain("d3", {from: hacker})
                            .should.be.eventually.rejectedWith("Message sender is not an owner of Schain");
                    });

                    it("should delete schain by root", async () => {
                        await skaleManager.deleteSchainByRoot("d3", {from: owner});

                        await schainsData.getSchains().should.be.eventually.empty;
                    });
                });
            });
        });

        describe("when 50 nodes are in the system", async () => {
            beforeEach(async () => {
                skaleToken.transfer(validator, "0x32D26D12E980B600000", {from: owner});

                for (let i = 0; i < 50; ++i) {
                    await skaleToken.transferWithData(
                        skaleManager.address,
                        "0x56bc75e2d63100000",
                        "0x01" + // create node
                        "2161" + // port
                        "0000" + // nonce
                        "7f0000" + ("0" + (i + 1).toString(16)).slice(-2) + // ip
                        "7f000001" + // public ip
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                        "64322d" + (48 + i + 1).toString(16), // name,
                        {from: validator});
                }
            });

            describe("when developer has SKALE tokens", async () => {
                beforeEach(async () => {
                    skaleToken.transfer(developer, "0x3635C9ADC5DEA000000", {from: owner});
                });

                it("should create 2 medium schains", async () => {
                    await skaleToken.transferWithData(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        "0x10" + // create schain
                        "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                        "03" + // type of schain
                        "0000" + // nonce
                        "6432", // name
                        {from: developer});

                    const schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
                    schain1[0].should.be.equal("d2");

                    await skaleToken.transferWithData(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        "0x10" + // create schain
                        "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                        "03" + // type of schain
                        "0000" + // nonce
                        "6433", // name
                        {from: developer});

                    const schain2 = await schainsData.schains(web3.utils.soliditySha3("d3"));
                    schain2[0].should.be.equal("d3");
                });

                describe("when schains are created", async () => {
                    beforeEach(async () => {
                        await skaleToken.transferWithData(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            "0x10" + // create schain
                            "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                            "03" + // type of schain
                            "0000" + // nonce
                            "6432", // name
                            {from: developer});

                        await skaleToken.transferWithData(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            "0x10" + // create schain
                            "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                            "03" + // type of schain
                            "0000" + // nonce
                            "6433", // name
                            {from: developer});
                    });

                    it("should delete first schain", async () => {
                        await skaleManager.deleteSchain("d2", {from: developer});

                        await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(1));
                    });

                    it("should delete second schain", async () => {
                        await skaleManager.deleteSchain("d3", {from: developer});

                        await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(1));
                    });
                });
            });
        });
        describe("when 150 nodes are in the system", async () => {

            it("should create 150 nodes & create & delete all types of schain", async () => {

                skaleToken.transfer(validator, "0x32D26D12E980B600000", {from: owner});

                for (let i = 0; i < 150; ++i) {
                    await skaleToken.transferWithData(
                        skaleManager.address,
                        "0x56bc75e2d63100000",
                        "0x01" + // create node
                        "2161" + // port
                        "0000" + // nonce
                        "7f0000" + ("0" + (i + 1).toString(16)).slice(-2) + // ip
                        "7f000001" + // public ip
                        "1122334455667788990011223344556677889900112233445566778899001122" +
                        "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                        "64322d" + (48 + i + 1).toString(16), // name,
                        {from: validator});
                    }

                skaleToken.transfer(developer, "0x3635C9ADC5DEA000000", {from: owner});

                await skaleToken.transferWithData(
                    skaleManager.address,
                    "0x1cc2d6d04a2ca",
                    "0x10" + // create schain
                    "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                    "01" + // type of schain
                    "0000" + // nonce
                    "6432", // name
                    {from: developer});

                let schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
                schain1[0].should.be.equal("d2");

                await skaleManager.deleteSchain("d2", {from: developer});

                await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));

                await skaleToken.transferWithData(
                    skaleManager.address,
                    "0x1cc2d6d04a2ca",
                    "0x10" + // create schain
                    "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                    "02" + // type of schain
                    "0000" + // nonce
                    "6432", // name
                    {from: developer});

                schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
                schain1[0].should.be.equal("d2");

                await skaleManager.deleteSchain("d2", {from: developer});

                await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));

                await skaleToken.transferWithData(
                    skaleManager.address,
                    "0x1cc2d6d04a2ca",
                    "0x10" + // create schain
                    "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                    "03" + // type of schain
                    "0000" + // nonce
                    "6432", // name
                    {from: developer});

                schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
                schain1[0].should.be.equal("d2");

                await skaleManager.deleteSchain("d2", {from: developer});

                await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));

                await skaleToken.transferWithData(
                    skaleManager.address,
                    "0xDE0B6B3A7640000",
                    "0x10" + // create schain
                    "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                    "04" + // type of schain
                    "0000" + // nonce
                    "6432", // name
                    {from: developer});

                schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
                schain1[0].should.be.equal("d2");

                await skaleManager.deleteSchain("d2", {from: developer});

                await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));

                await skaleToken.transferWithData(
                    skaleManager.address,
                    "0x1cc2d6d04a2ca",
                    "0x10" + // create schain
                    "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                    "05" + // type of schain
                    "0000" + // nonce
                    "6432", // name
                    {from: developer});

                schain1 = await schainsData.schains(web3.utils.soliditySha3("d2"));
                schain1[0].should.be.equal("d2");

                await skaleManager.deleteSchain("d2", {from: developer});

                await schainsData.numberOfSchains().should.be.eventually.deep.equal(web3.utils.toBN(0));
            });
        });
    });
});
