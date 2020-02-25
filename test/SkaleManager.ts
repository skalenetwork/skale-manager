import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ConstantsHolderInstance,
         ContractManagerInstance,
         DelegationServiceInstance,
         MonitorsDataInstance,
         NodesDataInstance,
         SchainsDataInstance,
         SchainsFunctionalityInstance,
         SkaleBalancesInstance,
         SkaleManagerInstance,
         SkaleTokenInstance,
         ValidatorServiceInstance } from "../types/truffle-contracts";

import { deployConstantsHolder } from "./utils/deploy/constantsHolder";
import { deployContractManager } from "./utils/deploy/contractManager";
import { deployDelegationService } from "./utils/deploy/delegation/delegationService";
import { deploySkaleBalances } from "./utils/deploy/delegation/skaleBalances";
import { deployValidatorService } from "./utils/deploy/delegation/validatorService";
import { deployMonitorsData } from "./utils/deploy/monitorsData";
import { deployNodesData } from "./utils/deploy/nodesData";
import { deploySchainsData } from "./utils/deploy/schainsData";
import { deploySchainsFunctionality } from "./utils/deploy/schainsFunctionality";
import { deploySkaleManager } from "./utils/deploy/skaleManager";
import { deploySkaleToken } from "./utils/deploy/skaleToken";
import { skipTime } from "./utils/time";

chai.should();
chai.use(chaiAsPromised);

contract("SkaleManager", ([owner, validator, developer, hacker]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let nodesData: NodesDataInstance;
    let skaleManager: SkaleManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let monitorsData: MonitorsDataInstance;
    let schainsData: SchainsDataInstance;
    let schainsFunctionality: SchainsFunctionalityInstance;
    let delegationService: DelegationServiceInstance;
    let skaleBalances: SkaleBalancesInstance;
    let validatorService: ValidatorServiceInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        skaleToken = await deploySkaleToken(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);
        nodesData = await deployNodesData(contractManager);
        monitorsData = await deployMonitorsData(contractManager);
        schainsData = await deploySchainsData(contractManager);
        schainsFunctionality = await deploySchainsFunctionality(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        delegationService = await deployDelegationService(contractManager);
        skaleBalances = await deploySkaleBalances(contractManager);
        validatorService = await deployValidatorService(contractManager);

        const prefix = "0x000000000000000000000000";
        const premined = "100000000000000000000000000";
        await skaleToken.mint(owner, skaleBalances.address, premined, prefix + skaleManager.address.slice(2), "0x");
        await constantsHolder.setMSR(5);
    });

    it("should fail to process token fallback if sent not from SkaleToken", async () => {
        await skaleManager.tokensReceived(hacker, validator, developer, 5, "0x11", "0x11", {from: validator}).
            should.be.eventually.rejectedWith("Message sender is invalid");
    });

    it("should transfer ownership", async () => {
        await skaleManager.transferOwnership(hacker, {from: hacker})
            .should.be.eventually.rejectedWith("Ownable: caller is not the owner");

        await skaleManager.transferOwnership(hacker, {from: owner});

        await skaleManager.owner().should.be.eventually.equal(hacker);
    });

    describe("when validator has delegated SKALE tokens", async () => {
        const validatorId = 1;
        const month = 60 * 60 * 24 * 31;

        beforeEach(async () => {
            await delegationService.registerValidator("D2", "D2 is even", 150, 0, {from: validator});

            await skaleToken.transfer(validator, "0x410D586A20A4C00000", {from: owner});
            await validatorService.enableValidator(validatorId, {from: owner});
            await delegationService.delegate(validatorId, 100, 12, "Hello from D2", {from: validator});
            const delegationId = 0;
            await delegationService.acceptPendingDelegation(delegationId, {from: validator});

            skipTime(web3, month);
        });

        it("should fail to process token fallback if operation type is wrong", async () => {
            await skaleToken.send(skaleManager.address, "0x1", "0x11", {from: validator}).
                should.be.eventually.rejectedWith("Operation type is not identified");
        });

        it("should create a node", async () => {
            await skaleManager.createNode(
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
            (await nodesData.getNodePort(0)).toNumber().should.be.equal(8545);
            await monitorsData.isGroupActive(web3.utils.soliditySha3(0)).should.be.eventually.true;
        });

        it("should not allow to create node if validator became untrusted", async () => {
            skipTime(web3, 2592000);
            await constantsHolder.setMSR(100);

            await validatorService.disableValidator(validatorId, {from: owner});
            await skaleManager.createNode(
                "0x01" + // create node
                "2161" + // port
                "0000" + // nonce
                "7f000001" + // ip
                "7f000001" + // public ip
                "1122334455667788990011223344556677889900112233445566778899001122" +
                "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                "6432", // name,
                {from: validator})
                .should.be.eventually.rejectedWith("Validator is not authorized to create a node");
            await validatorService.enableValidator(validatorId, {from: owner});
            await skaleManager.createNode(
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

        describe("when node is created", async () => {

            beforeEach(async () => {
                await skaleManager.createNode(
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

            it("should fail to init exiting of someone else's node", async () => {
                await skaleManager.nodeExit(0, {from: hacker})
                    .should.be.eventually.rejectedWith("Validator with such address doesn't exist");
            });

            it("should initiate exiting", async () => {
                await skaleManager.nodeExit(0, {from: validator});

                await nodesData.isNodeLeft(0).should.be.eventually.true;
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
        });

        describe("when two nodes are created", async () => {

            beforeEach(async () => {
                await skaleManager.createNode(
                    "0x01" + // create node
                    "2161" + // port
                    "0000" + // nonce
                    "7f000001" + // ip
                    "7f000001" + // public ip
                    "1122334455667788990011223344556677889900112233445566778899001122" +
                    "1122334455667788990011223344556677889900112233445566778899001122" + // public key
                    "6432", // name,
                    {from: validator});
                await skaleManager.createNode(
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

            it("should fail to initiate exiting of first node from another account", async () => {
                await skaleManager.nodeExit(0, {from: hacker})
                    .should.be.eventually.rejectedWith("Validator with such address doesn't exist");
            });

            it("should fail to initiate exiting of second node from another account", async () => {
                await skaleManager.nodeExit(1, {from: hacker})
                    .should.be.eventually.rejectedWith("Validator with such address doesn't exist");
            });

            it("should initiate exiting of first node", async () => {
                await skaleManager.nodeExit(0, {from: validator});

                await nodesData.isNodeLeft(0).should.be.eventually.true;
            });

            it("should initiate exiting of second node", async () => {
                await skaleManager.nodeExit(1, {from: validator});

                await nodesData.isNodeLeft(1).should.be.eventually.true;
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
                await skaleToken.transfer(validator, "0x3635c9adc5dea00000", {from: owner});

                for (let i = 0; i < 18; ++i) {
                    await skaleManager.createNode(
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

            it("should fail to create schain if validator doesn't meet MSR", async () => {
                await constantsHolder.setMSR(6);
                const newValidatorId = 2;
                await delegationService.registerValidator("D2", "D2 is even", 150, 0, {from: developer});
                await validatorService.enableValidator(newValidatorId, {from: owner});

                await skaleManager.createNode(
                    "0x10" + // create schain
                    "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                    "01" + // type of schain
                    "0000" + // nonce
                    "6432", // name
                    {from: developer}).should.be.eventually.rejectedWith("Validator has to meet Minimum Staking Requirement");
            });

            it("should fail to send monitor verdict from not node owner", async () => {
                await skaleManager.sendVerdict(0, 1, 0, 50, {from: hacker})
                    .should.be.eventually.rejectedWith("Validator with such address doesn't exist");
            });

            it("should fail to send monitor verdict if send it too early", async () => {
                await skaleManager.sendVerdict(0, 1, 0, 50, {from: validator})
                    .should.be.eventually.rejectedWith("The time has not come to send verdict");
            });

            it("should fail to send monitor verdict if sender node does not exist", async () => {
                await skaleManager.sendVerdict(18, 1, 0, 50, {from: validator})
                    .should.be.eventually.rejectedWith("Node does not exist for Message sender");
            });

            it("should send monitor verdict", async () => {
                skipTime(web3, 3400);
                await skaleManager.sendVerdict(0, 1, 0, 50, {from: validator});

                await monitorsData.verdicts(web3.utils.soliditySha3(1), 0, 0)
                    .should.be.eventually.deep.equal(web3.utils.toBN(0));
                await monitorsData.verdicts(web3.utils.soliditySha3(1), 0, 1)
                    .should.be.eventually.deep.equal(web3.utils.toBN(50));
            });

            it("should send monitor verdicts", async () => {
                skipTime(web3, 3400);
                await skaleManager.sendVerdicts(0, [1, 2], [0, 0], [50, 50], {from: validator});

                await monitorsData.verdicts(web3.utils.soliditySha3(1), 0, 0)
                    .should.be.eventually.deep.equal(web3.utils.toBN(0));
                await monitorsData.verdicts(web3.utils.soliditySha3(1), 0, 1)
                    .should.be.eventually.deep.equal(web3.utils.toBN(50));
                await monitorsData.verdicts(web3.utils.soliditySha3(2), 0, 0)
                    .should.be.eventually.deep.equal(web3.utils.toBN(0));
                await monitorsData.verdicts(web3.utils.soliditySha3(2), 0, 1)
                    .should.be.eventually.deep.equal(web3.utils.toBN(50));
            });

            it("should not send incorrect monitor verdicts", async () => {
                skipTime(web3, 3400);
                await skaleManager.sendVerdicts(0, [1], [0, 0], [50, 50], {from: validator})
                    .should.be.eventually.rejectedWith("Incorrect data");
            });

            it("should not send incorrect monitor verdicts part 2", async () => {
                skipTime(web3, 3400);
                await skaleManager.sendVerdicts(0, [1, 2], [0, 0], [50], {from: validator})
                    .should.be.eventually.rejectedWith("Incorrect data");
            });

            describe("when monitor verdict is received", async () => {
                beforeEach(async () => {
                    skipTime(web3, 3400);
                    await skaleManager.sendVerdict(0, 1, 0, 50, {from: validator});
                });

                it("should fail to get bounty if sender is not owner of the node", async () => {
                    await skaleManager.getBounty(1, {from: hacker})
                        .should.be.eventually.rejectedWith("Validator with such address doesn't exist");
                });

                it("should get bounty", async () => {
                    skipTime(web3, 200);
                    const balanceBefore = web3.utils.toBN(await skaleBalances.getBalance(validator));
                    // const bounty = web3.utils.toBN("893061271147690900777");
                    const bounty = web3.utils.toBN("1250285779606767261088");

                    await skaleManager.getBounty(1, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleBalances.getBalance(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });
            });

            describe("when monitor verdict with downtime is received", async () => {
                beforeEach(async () => {
                    skipTime(web3, 3400);
                    await skaleManager.sendVerdict(0, 1, 1, 50, {from: validator});
                });

                it("should fail to get bounty if sender is not owner of the node", async () => {
                    await skaleManager.getBounty(1, {from: hacker})
                        .should.be.eventually.rejectedWith("Validator with such address doesn't exist");
                });

                it("should get bounty", async () => {
                    skipTime(web3, 200);
                    const balanceBefore = web3.utils.toBN(await skaleBalances.getBalance(validator));
                    // const bounty = web3.utils.toBN("893019925718471100273");

                    const bounty = web3.utils.toBN("1250227896005859540382");

                    await skaleManager.getBounty(1, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleBalances.getBalance(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });

                it("should get bounty after break", async () => {
                    skipTime(web3, 500);
                    const balanceBefore = web3.utils.toBN(await skaleBalances.getBalance(validator));
                    // const bounty = web3.utils.toBN("893019925718471100273");
                    const bounty = web3.utils.toBN("1250227896005859540382");

                    await skaleManager.getBounty(1, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleBalances.getBalance(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });

                it("should get bounty after big break", async () => {
                    skipTime(web3, 800);
                    const balanceBefore = web3.utils.toBN(await skaleBalances.getBalance(validator));
                    // const bounty = web3.utils.toBN("892937234860031499264");
                    const bounty = web3.utils.toBN("1250112128804044098969");

                    await skaleManager.getBounty(1, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleBalances.getBalance(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });
            });

            describe("when monitor verdict with latency is received", async () => {
                beforeEach(async () => {
                    skipTime(web3, 3400);
                    await skaleManager.sendVerdict(0, 1, 0, 200000, {from: validator});
                });

                it("should fail to get bounty if sender is not owner of the node", async () => {
                    await skaleManager.getBounty(1, {from: hacker})
                        .should.be.eventually.rejectedWith("Validator with such address doesn't exist");
                });

                it("should get bounty", async () => {
                    skipTime(web3, 200);
                    const balanceBefore = web3.utils.toBN(await skaleBalances.getBalance(validator));
                    const bounty = web3.utils.toBN("937714334705075445816");

                    await skaleManager.getBounty(1, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleBalances.getBalance(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });

                it("should get bounty after break", async () => {
                    skipTime(web3, 500);
                    const balanceBefore = web3.utils.toBN(await skaleBalances.getBalance(validator));
                    const bounty = web3.utils.toBN("937714334705075445816");

                    await skaleManager.getBounty(1, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleBalances.getBalance(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });

                it("should get bounty after big break", async () => {
                    skipTime(web3, 800);
                    const balanceBefore = web3.utils.toBN(await skaleBalances.getBalance(validator));
                    const bounty = web3.utils.toBN("937627509303713864756");

                    await skaleManager.getBounty(1, {from: validator});

                    const balanceAfter = web3.utils.toBN(await skaleBalances.getBalance(validator));

                    expect(balanceAfter.sub(balanceBefore).eq(bounty)).to.be.true;
                });
            });

            describe("when developer has SKALE tokens", async () => {
                beforeEach(async () => {
                    await skaleToken.transfer(developer, "0x3635c9adc5dea00000", {from: owner});
                });

                it("should create schain", async () => {
                    await skaleToken.send(
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
                        await skaleToken.send(
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
                        await skaleToken.send(
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

        describe("when 32 nodes are in the system", async () => {
            beforeEach(async () => {
                await constantsHolder.setMSR(3);
                await skaleToken.transfer(validator, "0x32D26D12E980B600000", {from: owner});

                for (let i = 0; i < 32; ++i) {
                    await skaleManager.createNode(
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
                    await skaleToken.transfer(developer, "0x3635C9ADC5DEA000000", {from: owner});
                });

                it("should create 2 medium schains", async () => {
                    await skaleToken.send(
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

                    await skaleToken.send(
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
                        await skaleToken.send(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            "0x10" + // create schain
                            "0000000000000000000000000000000000000000000000000000000000000005" + // lifetime
                            "03" + // type of schain
                            "0000" + // nonce
                            "6432", // name
                            {from: developer});

                        await skaleToken.send(
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
        describe("when 16 nodes are in the system", async () => {

            it("should create 16 nodes & create & delete all types of schain", async () => {

                await skaleToken.transfer(validator, "0x32D26D12E980B600000", {from: owner});

                for (let i = 0; i < 16; ++i) {
                    await skaleManager.createNode(
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

                await skaleToken.transfer(developer, "0x3635C9ADC5DEA000000", {from: owner});

                let price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(1, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
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
                price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(2, 5));

                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
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
                price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(3, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
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
                price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(4, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
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
                price = web3.utils.toBN(await schainsFunctionality.getSchainPrice(5, 5));
                await skaleToken.send(
                    skaleManager.address,
                    price.toString(),
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
