import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerInstance,
         NodesInstance,
         SchainsInternalInstance,
         SchainsInstance,
         SkaleDKGInstance,
         SkaleManagerInstance,
         ValidatorServiceInstance } from "../types/truffle-contracts";

import BigNumber from "bignumber.js";
import { skipTime } from "./tools/time";

import { deployContractManager } from "./tools/deploy/contractManager";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployNodes } from "./tools/deploy/nodes";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { deploySchains } from "./tools/deploy/schains";
import { deploySkaleDKG } from "./tools/deploy/skaleDKG";
import { deploySkaleManager } from "./tools/deploy/skaleManager";

chai.should();
chai.use(chaiAsPromised);

contract("Schains", ([owner, holder, validator]) => {
    let contractManager: ContractManagerInstance;
    let schains: SchainsInstance;
    let schainsInternal: SchainsInternalInstance;
    let nodes: NodesInstance;
    let validatorService: ValidatorServiceInstance;
    let skaleDKG: SkaleDKGInstance;
    let skaleManager: SkaleManagerInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        nodes = await deployNodes(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        schains = await deploySchains(contractManager);
        validatorService = await deployValidatorService(contractManager);
        skaleDKG = await deploySkaleDKG(contractManager);
        skaleManager = await deploySkaleManager(contractManager);

        validatorService.registerValidator("D2", "D2 is even", 0, 0, {from: validator});
    });

    describe("should add schain", async () => {
        it("should fail when money are not enough", async () => {
            await schains.addSchain(
                holder,
                5,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "d2"]),
                {from: owner})
                .should.be.eventually.rejectedWith("Not enough money to create Schain");
        });

        it("should fail when schain type is wrong", async () => {
            await schains.addSchain(
                holder,
                5,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 6, 0, "d2"]),
                {from: owner})
                .should.be.eventually.rejectedWith("Invalid type of Schain");
        });

        it("should fail when data parameter is too short", async () => {
            await schains.addSchain(
                holder,
                5,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16"], [5, 6, 0]),
                {from: owner}).
                should.be.eventually.rejected;
        });

        it("should fail when nodes count is too low", async () => {
            const price = new BigNumber(await schains.getSchainPrice(1, 5));
            await schains.addSchain(
                holder,
                price.toString(),
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "d2"]),
                {from: owner})
                .should.be.eventually.rejectedWith("Not enough nodes to create Schain");
        });

        describe("when 2 nodes are registered (Ivan test)", async () => {
            it("should create 2 nodes, and play with schains", async () => {
                const nodesCount = 2;
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await nodes.createNode(validator,
                        {
                            port: 8545,
                            nonce: 0,
                            ip: "0x7f0000" + hexIndex,
                            publicIp: "0x7f0000" + hexIndex,
                            publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                        "0x1122334455667788990011223344556677889900112233445566778899001122"],
                            name: "D2-" + hexIndex
                        });
                }

                const deposit = await schains.getSchainPrice(4, 5);

                await schains.addSchain(
                    owner,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]),
                    {from: owner});

                await schains.addSchain(
                    owner,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d3"]),
                    {from: owner});

                await schains.deleteSchain(
                    owner,
                    "d2",
                    {from: owner});

                await schains.deleteSchain(
                    owner,
                    "d3",
                    {from: owner});

                await nodes.removeNodeByRoot(0, {from: owner});
                await nodes.removeNodeByRoot(1, {from: owner});

                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("1" + index.toString(16)).slice(-2);
                    await nodes.createNode(validator,
                        {
                            port: 8545,
                            nonce: 0,
                            ip: "0x7f0000" + hexIndex,
                            publicIp: "0x7f0000" + hexIndex,
                            publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                        "0x1122334455667788990011223344556677889900112233445566778899001122"],
                            name: "D2-" + hexIndex
                        });
                }

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d4"]),
                    {from: owner});
            });
        });

        describe("when 2 nodes are registered (Node rotation test)", async () => {
            it("should create 2 nodes, and play with schains", async () => {
                const nodesCount = 2;
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await nodes.createNode(validator,
                        {
                            port: 8545,
                            nonce: 0,
                            ip: "0x7f0000" + hexIndex,
                            publicIp: "0x7f0000" + hexIndex,
                            publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                        "0x1122334455667788990011223344556677889900112233445566778899001122"],
                            name: "D2-" + hexIndex
                        });
                }

                const deposit = await schains.getSchainPrice(4, 5);

                const verificationVector = [{
                    x: {
                        a: "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d",
                        b: "0x2695832627b9081e77da7a3fc4d574363bf051700055822f3d394dc3d9ff7417",
                    },
                    y: {
                        a: "0x24727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d",
                        b: "0x03a7a3e6f3b539dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99"
                    }
                }];

                const encryptedSecretKeyContribution = [
                    {
                        share: "0x937c9c846a6fa7fd1984fe82e739ae37fcaa555c1dc0e8597c9f81b6a12f232f",
                        publicKey: [
                            "0xfdf8101e91bd658fa1cea6fdd75adb8542951ce3d251cdaa78f43493dad730b5",
                            "0x9d32d2e872b36aa70cdce544b550ebe96994de860b6f6ebb7d0b4d4e6724b4bf"
                        ]
                    },
                    {
                        share: "0x7232f27fdfe521f3c7997dbb1c15452b7f196bd119d915ce76af3d1a008e1810",
                        publicKey: [
                            "0x086ff076abe442563ae9b8938d483ae581f4de2ee54298b3078289bbd85250c8",
                            "0xdf956450d32f671e4a8ec1e584119753ff171e80a61465246bfd291e8dac3d77"
                        ]
                    }
                ];

                await schains.addSchain(
                    owner,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]),
                    {from: owner});
                let res1 = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d2"));
                let res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d2"), res1[0], {from: validator});
                assert.equal(res, true);
                await skaleDKG.broadcast(
                    web3.utils.soliditySha3("d2"),
                    res1[0],
                    verificationVector,
                    // the last symbol is spoiled in parameter below
                    encryptedSecretKeyContribution,
                    {from: validator},
                );
                res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d2"), res1[1], {from: validator});
                assert.equal(res, true);
                await skaleDKG.broadcast(
                    web3.utils.soliditySha3("d2"),
                    res1[1],
                    verificationVector,
                    // the last symbol is spoiled in parameter below
                    encryptedSecretKeyContribution,
                    {from: validator},
                );

                res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d2"));
                assert.equal(res, true);

                res = await skaleDKG.isAlrightPossible(
                    web3.utils.soliditySha3("d2"),
                    res1[0],
                    {from: validator},
                );
                assert.equal(res, true);

                await skaleDKG.alright(
                    web3.utils.soliditySha3("d2"),
                    res1[0],
                    {from: validator},
                );

                res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d2"));
                assert.equal(res, true);

                res = await skaleDKG.isAlrightPossible(
                    web3.utils.soliditySha3("d2"),
                    res1[1],
                    {from: validator},
                );
                assert.equal(res, true);

                await skaleDKG.alright(
                    web3.utils.soliditySha3("d2"),
                    res1[1],
                    {from: validator},
                );

                await nodes.createNode(validator,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f000011",
                        publicIp: "0x7f000011",
                        publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                    "0x1122334455667788990011223344556677889900112233445566778899001122"],
                        name: "D2-11"
                    });

                res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d2"));
                assert.equal(res, false);
                await skaleManager.nodeExit(0, {from: validator});
                res1 = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d2"));
                const nodeRot = res1[1];
                res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d2"), nodeRot, {from: validator});
                assert.equal(res, true);
                res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d2"), res1[0], {from: validator});
                assert.equal(res, true);
                await skaleDKG.broadcast(
                    web3.utils.soliditySha3("d2"),
                    res1[0],
                    verificationVector,
                    // the last symbol is spoiled in parameter below
                    encryptedSecretKeyContribution,
                    {from: validator},
                );
                res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d2"), res1[1], {from: validator});
                assert.equal(res, true);
                await skaleDKG.broadcast(
                    web3.utils.soliditySha3("d2"),
                    res1[1],
                    verificationVector,
                    // the last symbol is spoiled in parameter below
                    encryptedSecretKeyContribution,
                    {from: validator},
                );

                res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d2"));
                assert.equal(res, true);

                res = await skaleDKG.isAlrightPossible(
                    web3.utils.soliditySha3("d2"),
                    res1[0],
                    {from: validator},
                );
                assert.equal(res, true);

                await skaleDKG.alright(
                    web3.utils.soliditySha3("d2"),
                    res1[0],
                    {from: validator},
                );

                res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d2"));
                assert.equal(res, true);

                res = await skaleDKG.isAlrightPossible(
                    web3.utils.soliditySha3("d2"),
                    res1[1],
                    {from: validator},
                );
                assert.equal(res, true);

                await skaleDKG.alright(
                    web3.utils.soliditySha3("d2"),
                    res1[1],
                    {from: validator},
                );
            });
        });

        describe("when 4 nodes are registered", async () => {
            beforeEach(async () => {
                const nodesCount = 4;
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await nodes.createNode(validator,
                        {
                            port: 8545,
                            nonce: 0,
                            ip: "0x7f0000" + hexIndex,
                            publicIp: "0x7f0000" + hexIndex,
                            publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                        "0x1122334455667788990011223344556677889900112233445566778899001122"],
                            name: "D2-" + hexIndex
                        });
                }
            });

            it("should create 4 node schain", async () => {
                const deposit = await schains.getSchainPrice(5, 5);

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
                    {from: owner});

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder, schainId).should.be.eventually.true;
            });

            it("should not create 4 node schain with 1 deleted node", async () => {
                await nodes.removeNodeByRoot(1);

                const deposit = await schains.getSchainPrice(5, 5);

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
                    {from: owner}).should.be.eventually.rejectedWith("Not enough nodes to create Schain");
            });

            it("should not create 4 node schain on deleted node", async () => {
                let data = await nodes.getNodesWithFreeSpace(32);
                const removedNode = 1;
                await nodes.removeNodeByRoot(removedNode);

                data = await nodes.getNodesWithFreeSpace(32);

                await nodes.createNode(validator,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f000028",
                        publicIp: "0x7f000028",
                        publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                    "0x1122334455667788990011223344556677889900112233445566778899001122"],
                        name: "D2-28"
                    });

                const deposit = await schains.getSchainPrice(5, 5);

                data = await nodes.getNodesWithFreeSpace(32);

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
                    {from: owner});

                let nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d2"));

                for (const node of nodesInGroup) {
                    expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
                }

                data = await nodes.getNodesWithFreeSpace(32);

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d3"]),
                    {from: owner});

                nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d3"));

                for (const node of nodesInGroup) {
                    expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
                }

                data = await nodes.getNodesWithFreeSpace(32);

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d4"]),
                    {from: owner});

                nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d4"));

                for (const node of nodesInGroup) {
                    expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
                }

                data = await nodes.getNodesWithFreeSpace(32);

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d5"]),
                    {from: owner});

                nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d5"));

                for (const node of nodesInGroup) {
                    expect(web3.utils.toBN(node).toNumber()).to.be.not.equal(removedNode);
                }
            });

            it("should create & delete 4 node schain", async () => {
                const deposit = await schains.getSchainPrice(5, 5);

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
                    {from: owner});

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder, schainId).should.be.eventually.true;

                await schains.deleteSchain(
                    holder,
                    "d2",
                    {from: owner});

                await schainsInternal.getSchains().should.be.eventually.empty;
            });
        });

        describe("when 20 nodes are registered", async () => {
            beforeEach(async () => {
                const nodesCount = 20;
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await nodes.createNode(validator,
                        {
                            port: 8545,
                            nonce: 0,
                            ip: "0x7f0000" + hexIndex,
                            publicIp: "0x7f0000" + hexIndex,
                            publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                        "0x1122334455667788990011223344556677889900112233445566778899001122"],
                            name: "D2-" + hexIndex
                        });
                }
            });

            it("should create Medium schain", async () => {
                const deposit = await schains.getSchainPrice(3, 5);

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 3, 0, "d2"]),
                    {from: owner});

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
            });

            it("should not create another Medium schain", async () => {
                const deposit = await schains.getSchainPrice(3, 5);

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 3, 0, "d2"]),
                    {from: owner});

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 3, 0, "d3"]),
                    {from: owner},
                ).should.be.eventually.rejectedWith("Not enough nodes to create Schain");
            });
        });

        describe("when nodes are registered", async () => {

            beforeEach(async () => {
                const nodesCount = 16;
                for (const index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ("0" + index.toString(16)).slice(-2);
                    await nodes.createNode(validator,
                        {
                            port: 8545,
                            nonce: 0,
                            ip: "0x7f0000" + hexIndex,
                            publicIp: "0x7f0000" + hexIndex,
                            publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                        "0x1122334455667788990011223344556677889900112233445566778899001122"],
                            name: "D2-" + hexIndex
                        });
                }
            });

            it("successfully", async () => {
                const deposit = await schains.getSchainPrice(1, 5);

                await schains.addSchain(
                    holder,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "d2"]),
                    {from: owner});

                const sChains = await schainsInternal.getSchains();
                sChains.length.should.be.equal(1);
                const schainId = sChains[0];

                await schainsInternal.isOwnerAddress(holder, schainId).should.be.eventually.true;

                const obtainedSchains = await schainsInternal.schains(schainId);
                const schainsArray = Array(8);
                for (const index of Array.from(Array(8).keys())) {
                    schainsArray[index] = obtainedSchains[index];
                }

                const [obtainedSchainName,
                       obtainedSchainOwner,
                       obtainedIndexInOwnerList,
                       obtainedPart,
                       obtainedLifetime,
                       obtainedStartDate,
                       obtainedBlock,
                       obtainedDeposit,
                       obtainedIndex] = schainsArray;

                obtainedSchainName.should.be.equal("d2");
                obtainedSchainOwner.should.be.equal(holder);
                expect(obtainedPart.eq(web3.utils.toBN(1))).be.true;
                expect(obtainedLifetime.eq(web3.utils.toBN(5))).be.true;
                expect(obtainedDeposit.eq(web3.utils.toBN(deposit))).be.true;
            });

            describe("when schain is created", async () => {

                beforeEach(async () => {
                    const deposit = await schains.getSchainPrice(1, 5);
                    await schains.addSchain(
                        holder,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "D2"]),
                        {from: owner});
                });

                it("should failed when create another schain with the same name", async () => {
                    const deposit = await schains.getSchainPrice(1, 5);
                    await schains.addSchain(
                        holder,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "D2"]),
                        {from: owner})
                        .should.be.eventually.rejectedWith("Schain name is not available");
                });

                it("should be able to delete schain", async () => {
                    await schains.deleteSchain(
                        holder,
                        "D2",
                        {from: owner});
                    await schainsInternal.getSchains().should.be.eventually.empty;
                });

                it("should fail on deleting schain if owner is wrong", async () => {
                    await schains.deleteSchain(
                        validator,
                        "D2",
                        {from: owner})
                        .should.be.eventually.rejectedWith("Message sender is not an owner of Schain");
                });

            });

            describe("when test schain is created", async () => {

                beforeEach(async () => {
                    const deposit = await schains.getSchainPrice(4, 5);
                    await schains.addSchain(
                        holder,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "D2"]),
                        {from: owner});
                });

                it("should failed when create another schain with the same name", async () => {
                    const deposit = await schains.getSchainPrice(4, 5);
                    await schains.addSchain(
                        holder,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "D2"]),
                        {from: owner})
                        .should.be.eventually.rejectedWith("Schain name is not available");
                });

                it("should be able to delete schain", async () => {

                    await schains.deleteSchain(
                        holder,
                        "D2",
                        {from: owner});
                    await schainsInternal.getSchains().should.be.eventually.empty;
                });

                it("should fail on deleting schain if owner is wrong", async () => {

                    await schains.deleteSchain(
                        validator,
                        "D2",
                        {from: owner})
                        .should.be.eventually.rejectedWith("Message sender is not an owner of Schain");
                });

            });

        });
    });

    describe("should calculate schain price", async () => {
        it("of tiny schain", async () => {
            const price = web3.utils.toBN(await schains.getSchainPrice(1, 5));
            const correctPrice = web3.utils.toBN(3952894150981);

            expect(price.eq(correctPrice)).to.be.true;
        });

        it("of small schain", async () => {
            const price = web3.utils.toBN(await schains.getSchainPrice(2, 5));
            const correctPrice = web3.utils.toBN(63246306415705);

            expect(price.eq(correctPrice)).to.be.true;
        });

        it("of medium schain", async () => {
            const price = web3.utils.toBN(await schains.getSchainPrice(3, 5));
            const correctPrice = web3.utils.toBN(505970451325642);

            expect(price.eq(correctPrice)).to.be.true;
        });

        it("of test schain", async () => {
            const price = web3.utils.toBN(await schains.getSchainPrice(4, 5));
            const correctPrice = web3.utils.toBN(1000000000000000000);

            expect(price.eq(correctPrice)).to.be.true;
        });

        it("of medium test schain", async () => {
            const price = web3.utils.toBN(await schains.getSchainPrice(5, 5));
            const correctPrice = web3.utils.toBN(31623153207852);

            expect(price.eq(correctPrice)).to.be.true;
        });

        it("should revert on wrong schain type", async () => {
            await schains.getSchainPrice(6, 5).should.be.eventually.rejectedWith("Bad schain type");
        });
    });

    describe("when 4 nodes, 2 schains and 2 additional nodes created", async () => {
        const ACTIVE = 0;
        const LEAVING = 1;
        const LEFT = 2;
        let nodeStatus;
        beforeEach(async () => {
            const deposit = await schains.getSchainPrice(5, 5);
            const nodesCount = 4;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await nodes.createNode(validator,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                    "0x1122334455667788990011223344556677889900112233445566778899001122"],
                        name: "D2-" + hexIndex
                    });
            }
            await schains.addSchain(
                holder,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
                {from: owner});
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d2"),
                0,
                0,
                0,
                0,
            );

            await schains.addSchain(
                holder,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d3"]),
                {from: owner});
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d3"),
                0,
                0,
                0,
                0,
            );
            await nodes.createNode(validator,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000010",
                    publicIp: "0x7f000010",
                    publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                "0x1122334455667788990011223344556677889900112233445566778899001122"],
                    name: "D2-10"
                });
            await nodes.createNode(validator,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000011",
                    publicIp: "0x7f000011",
                    publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                "0x1122334455667788990011223344556677889900112233445566778899001122"],
                    name: "D2-11"
                });

        });

        it("should rotate 2 nodes consistently", async () => {
            await skaleManager.nodeExit(0, {from: validator});
            const res1 = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d2"));
            const res2 = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d3"));
            const nodeRot = res1[3];
            const res = await skaleDKG.isBroadcastPossible(
                web3.utils.soliditySha3("d3"), nodeRot);
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d3"),
                0,
                0,
                0,
                0,
            );
            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("Node cannot rotate on Schain d3, occupied by Node 0");
            await skaleManager.nodeExit(0, {from: validator});
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d2"),
                0,
                0,
                0,
                0,
            );
            nodeStatus = (await nodes.getNodeStatus(0)).toNumber();
            assert.equal(nodeStatus, LEFT);
            await skaleManager.nodeExit(0, {from: validator})
                .should.be.eventually.rejectedWith("Node is not Leaving");

            nodeStatus = (await nodes.getNodeStatus(1)).toNumber();
            assert.equal(nodeStatus, ACTIVE);
            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("Node cannot rotate on Schain d3, occupied by Node 0");
            skipTime(web3, 43260);

            await skaleManager.nodeExit(1, {from: validator});
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d3"),
                0,
                0,
                0,
                0,
            );
            nodeStatus = (await nodes.getNodeStatus(1)).toNumber();
            assert.equal(nodeStatus, LEAVING);
            await skaleManager.nodeExit(1, {from: validator});
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d2"),
                0,
                0,
                0,
                0,
            );
            nodeStatus = (await nodes.getNodeStatus(1)).toNumber();
            assert.equal(nodeStatus, LEFT);
            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("Node is not Leaving");
        });

        it("should allow to rotate if occupied node didn't rotated for 12 hours", async () => {
            await skaleManager.nodeExit(0, {from: validator});
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d3"),
                0,
                0,
                0,
                0,
            );
            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("Node cannot rotate on Schain d3, occupied by Node 0");
            skipTime(web3, 43260);
            await skaleManager.nodeExit(1, {from: validator});
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d3"),
                0,
                0,
                0,
                0,
            );

            await skaleManager.nodeExit(0, {from: validator})
                .should.be.eventually.rejectedWith("Node cannot rotate on Schain d2, occupied by Node 1");

            nodeStatus = (await nodes.getNodeStatus(1)).toNumber();
            assert.equal(nodeStatus, LEAVING);
            await skaleManager.nodeExit(1, {from: validator});
            nodeStatus = (await nodes.getNodeStatus(1)).toNumber();
            assert.equal(nodeStatus, LEFT);
        });

        it("should rotate on schain that previously was deleted", async () => {
            const deposit = await schains.getSchainPrice(5, 5);
            await skaleManager.nodeExit(0, {from: validator});
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d3"),
                0,
                0,
                0,
                0,
            );
            await skaleManager.nodeExit(0, {from: validator});
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d2"),
                0,
                0,
                0,
                0,
            );
            await skaleManager.deleteSchainByRoot("d2", {from: owner});
            await skaleManager.deleteSchainByRoot("d3", {from: owner});
            await schains.addSchain(
                holder,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, "d2"]),
                {from: owner});
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d2"),
                0,
                0,
                0,
                0,
            );
            const nodesInGroupBN = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d2"));
            const nodeInGroup = nodesInGroupBN.map((value: BigNumber) => value.toNumber())[0];
            await skaleManager.nodeExit(nodeInGroup, {from: validator});
        });

        it("should be possible to send broadcast", async () => {
            let res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);
            await skaleManager.nodeExit(0, {from: validator});
            const res1 = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d3"));
            const nodeRot = res1[3];
            res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);
            res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d3"), nodeRot, {from: validator});
            assert.equal(res, true);
        });

        it("should revert if dkg not finished", async () => {
            let res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);
            await skaleManager.nodeExit(0, {from: validator});
            const res1 = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d3"));
            const nodeRot = res1[3];
            res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);
            res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d3"), nodeRot, {from: validator});
            assert.equal(res, true);

            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("DKG proccess did not finish on schain d3");
            await skaleManager.nodeExit(0, {from: validator});

            skipTime(web3, 43260);

            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("DKG proccess did not finish on schain d3");
        });

        it("should be possible to send broadcast", async () => {
            let res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);
            await skaleManager.nodeExit(0, {from: validator});
            const res1 = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d3"));
            const nodeRot = res1[3];
            res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);
            res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d3"), nodeRot, {from: validator});
            assert.equal(res, true);
            skipTime(web3, 43260);
            await skaleManager.nodeExit(0, {from: validator});

            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("DKG proccess did not finish on schain d3");
        });

        it("should be possible to send broadcast", async () => {
            let res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);
            await skaleManager.nodeExit(0, {from: validator});
            const res1 = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d3"));
            const nodeRot = res1[3];
            res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);
            res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d3"), nodeRot, {from: validator});
            assert.equal(res, true);
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d3"),
                0,
                0,
                0,
                0,
            );
            await skaleManager.nodeExit(1, {from: validator})
                .should.be.eventually.rejectedWith("Node cannot rotate on Schain d3, occupied by Node 0");
            await skaleManager.nodeExit(0, {from: validator});
            await schainsInternal.setPublicKey(
                web3.utils.soliditySha3("d2"),
                0,
                0,
                0,
                0,
            );

            skipTime(web3, 43260);

            await skaleManager.nodeExit(1, {from: validator});
        });

        it("should be possible to process dkg after node rotation", async () => {
            let res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);
            await skaleManager.nodeExit(0, {from: validator});
            const res1 = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d3"));
            const nodeRot = res1[3];
            res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d3"), nodeRot, {from: validator});
            assert.equal(res, true);
            const verificationVector = [{
                x: {
                    a: "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d",
                    b: "0x2695832627b9081e77da7a3fc4d574363bf051700055822f3d394dc3d9ff7417",
                },
                y: {
                    a: "0x24727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d",
                    b: "0x03a7a3e6f3b539dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99"
                }
            }];

            const encryptedSecretKeyContribution = [
                {
                    share: "0x937c9c846a6fa7fd1984fe82e739ae37fcaa555c1dc0e8597c9f81b6a12f232f",
                    publicKey: [
                        "0xfdf8101e91bd658fa1cea6fdd75adb8542951ce3d251cdaa78f43493dad730b5",
                        "0x9d32d2e872b36aa70cdce544b550ebe96994de860b6f6ebb7d0b4d4e6724b4bf"
                    ]
                },
                {
                    share: "0x7232f27fdfe521f3c7997dbb1c15452b7f196bd119d915ce76af3d1a008e1810",
                    publicKey: [
                        "0x086ff076abe442563ae9b8938d483ae581f4de2ee54298b3078289bbd85250c8",
                        "0xdf956450d32f671e4a8ec1e584119753ff171e80a61465246bfd291e8dac3d77"
                    ]
                }
            ];

            let res10 = await skaleDKG.getBroadcastedData(web3.utils.soliditySha3("d3"), res1[0]);
            res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d3"), res1[0], {from: validator});
            assert.equal(res, true);
            await skaleDKG.broadcast(
                web3.utils.soliditySha3("d3"),
                res1[0],
                verificationVector,
                // the last symbol is spoiled in parameter below
                encryptedSecretKeyContribution,
                {from: validator},
            );
            res10 = await skaleDKG.getBroadcastedData(web3.utils.soliditySha3("d3"), res1[1]);
            res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d3"), res1[1], {from: validator});
            assert.equal(res, true);
            await skaleDKG.broadcast(
                web3.utils.soliditySha3("d3"),
                res1[1],
                verificationVector,
                // the last symbol is spoiled in parameter below
                encryptedSecretKeyContribution,
                {from: validator},
            );
            res = await skaleDKG.isBroadcastPossible(web3.utils.soliditySha3("d3"), res1[2], {from: validator});
            assert.equal(res, true);
            await skaleDKG.broadcast(
                web3.utils.soliditySha3("d3"),
                res1[2],
                verificationVector,
                // the last symbol is spoiled in parameter below
                encryptedSecretKeyContribution,
                {from: validator},
            );
            await skaleDKG.broadcast(
                web3.utils.soliditySha3("d3"),
                res1[3],
                verificationVector,
                // the last symbol is spoiled in parameter below
                encryptedSecretKeyContribution,
                {from: validator},
            );

            res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);

            res = await skaleDKG.isAlrightPossible(
                web3.utils.soliditySha3("d3"),
                res1[0],
                {from: validator},
            );
            assert.equal(res, true);

            await skaleDKG.alright(
                web3.utils.soliditySha3("d3"),
                res1[0],
                {from: validator},
            );

            res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);

            res = await skaleDKG.isAlrightPossible(
                web3.utils.soliditySha3("d3"),
                res1[1],
                {from: validator},
            );
            assert.equal(res, true);

            await skaleDKG.alright(
                web3.utils.soliditySha3("d3"),
                res1[1],
                {from: validator},
            );

            res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);

            res = await skaleDKG.isAlrightPossible(
                web3.utils.soliditySha3("d3"),
                res1[2],
                {from: validator},
            );
            assert.equal(res, true);

            await skaleDKG.alright(
                web3.utils.soliditySha3("d3"),
                res1[2],
                {from: validator},
            );

            res = await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d3"));
            assert.equal(res, true);

            res = await skaleDKG.isAlrightPossible(
                web3.utils.soliditySha3("d3"),
                res1[3],
                {from: validator},
            );
            assert.equal(res, true);

            await skaleDKG.alright(
                web3.utils.soliditySha3("d3"),
                res1[3],
                {from: validator},
            );
        });
    });

});
