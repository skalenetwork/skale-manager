import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerInstance,
         DelegationControllerInstance,
         NodesInstance,
         SchainsDataInstance,
         SchainsFunctionalityInstance,
         SkaleDKGInstance,
         SkaleTokenInstance,
         SlashingTableInstance,
         ValidatorServiceInstance } from "../types/truffle-contracts";

import { skipTime } from "./tools/time";

import BigNumber from "bignumber.js";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployDelegationController } from "./tools/deploy/delegation/delegationController";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployNodes } from "./tools/deploy/nodes";
import { deploySchainsData } from "./tools/deploy/schainsData";
import { deploySchainsFunctionality } from "./tools/deploy/schainsFunctionality";
import { deploySkaleDKG } from "./tools/deploy/skaleDKG";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { deploySlashingTable } from "./tools/deploy/slashingTable";

chai.should();
chai.use(chaiAsPromised);

class Channel {
    public active: boolean;
    public dataAddress: string;
    public numberOfBroadcasted: BigNumber;
    public publicKeyx: object;
    public publicKeyy: object;
    public numberOfCompleted: BigNumber;
    public startedBlockTimestamp: BigNumber;
    public nodeToComplaint: BigNumber;
    public fromNodeToComplaint: BigNumber;
    public startedComplaintBlockTimestamp: BigNumber;

    constructor(arrayData: [boolean, string, BigNumber, object, object, BigNumber, BigNumber, BigNumber,
        BigNumber, BigNumber]) {
        this.active = arrayData[0];
        this.dataAddress = arrayData[1];
        this.numberOfBroadcasted = new BigNumber(arrayData[2]);
        this.publicKeyx = arrayData[3];
        this.publicKeyy = arrayData[4];
        this.numberOfCompleted = new BigNumber(arrayData[5]);
        this.startedBlockTimestamp = new BigNumber(arrayData[6]);
        this.nodeToComplaint = new BigNumber(arrayData[7]);
        this.fromNodeToComplaint = new BigNumber(arrayData[8]);
        this.startedComplaintBlockTimestamp = new BigNumber(arrayData[9]);
    }
}

contract("SkaleDKG", ([owner, validator1, validator2]) => {
    let contractManager: ContractManagerInstance;
    let schainsData: SchainsDataInstance;
    let schainsFunctionality: SchainsFunctionalityInstance;
    let skaleDKG: SkaleDKGInstance;
    let skaleToken: SkaleTokenInstance;
    let validatorService: ValidatorServiceInstance;
    let slashingTable: SlashingTableInstance;
    let delegationController: DelegationControllerInstance;
    let nodes: NodesInstance;

    const failedDkgPenalty = 5;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        nodes = await deployNodes(contractManager);
        schainsData = await deploySchainsData(contractManager);
        schainsFunctionality = await deploySchainsFunctionality(contractManager);
        skaleDKG = await deploySkaleDKG(contractManager);
        skaleToken = await deploySkaleToken(contractManager);
        validatorService = await deployValidatorService(contractManager);
        slashingTable = await deploySlashingTable(contractManager);
        delegationController = await deployDelegationController(contractManager);

        await slashingTable.setPenalty("FailedDKG", failedDkgPenalty);
    });

    describe("when 2 nodes are created", async () => {
        const validatorsAccount = [
            validator1,
            validator2,
        ];
        const validatorsPrivateKey = [
            "0xa15c19da241e5b1db20d8dd8ca4b5eeaee01c709b49ec57aa78c2133d3c1b3c9",
            "0xe7af72d241d4dd77bc080ce9234d742f6b22e35b3a660e8c197517b909f63ca8",
        ];
        const validatorsPublicKey = [
            "8f163316925bf2e12a30832dee812f6ff60bf872171a84d9091672dd3848be9fc0b7bd257fbb038019c41f055e81736d8116b83" +
            "e9ac59a1407aa6ea804ec88a8",
            "307654b2716eb09f01f33115173867611d403424586357226515ae6a92774b10d168ab741e8f7650116d0677fddc1aea8dc86a0" +
            "0747e7224d2bf36e0ea3dd62c",
        ];

        const secretNumbers = [
            "58625848706037406511582962295430965185674934704233043314647478422698817926283",
            "111405529669975789441427095287571197384937932095062249739044064944770017976403",
        ];

        const secretNumberSecond = new BigNumber(
            "111405529669975789441427095287571197384937932095062249739044064944770017976403",
        );

        const encryptedSecretKeyContributions = [
            "0x937c9c846a6fa7fd1984fe82e739ae37fcaa555c1dc0e8597c9f81b6a12f232f04fdf8101e91bd658fa1cea6fdd75adb85429" +
            "51ce3d251cdaa78f43493dad730b59d32d2e872b36aa70cdce544b550ebe96994de860b6f6ebb7d0b4d4e6724b4bf7232f27fdf" +
            "e521f3c7997dbb1c15452b7f196bd119d915ce76af3d1a008e181004086ff076abe442563ae9b8938d483ae581f4de2ee54298b" +
            "3078289bbd85250c8df956450d32f671e4a8ec1e584119753ff171e80a61465246bfd291e8dac3d77",
            "0xe371b8589b56d29e43ad703fa42666c02d0fb6144ec12962d2532560af3cc72e046b0a8bce07bd18f50e4c5b7ebe2f9e17a31" +
            "7b91c64926bf2d46a8f1ff58acbeba17652e16f18345856a148a2730a83760a181eb129e0c6059091ab11aa3fc5b899b9787530" +
            "3f76ad5dcf51d300d152958e063d4099e564bcc9e33bd6d351b1bf04e081fec066435a30e875ced147985c35ecba48407c550ba" +
            "d42fc652366d9731c707f24d4865584868154798d727237aea2ad3c086c5f41b85d7eb697bb8fec5e",
        ];

        const badEncryptedSecretKeyContributions = [
            "0x937c9c846a6fa7fd1984fe82e739ae37f444444444444444444441b6a12f232f04fdf8101e91bd658fa1cea6fdd75adb85429" +
            "51ce3d251cdaa78f43493dad730b59d32d24444444444444444444450ebe96994de860b6f6ebb7d0b4d4e6724b4c07232f27fdf" +
            "e521f3c7997dbb1c15452b7f196bd119d91444444444444444444444086ff076abe442563ae9b8938d483ae581f4de2ee54298b" +
            "3078289bbd85250c8df956450d32f671e4a4444444444444444444480a61465246bfd291e8dac3d78",
            "0xe371b8589b56d29e43ad703fa42666c0244444444444444444444560af3cc72e046b0a8bce07bd18f50e4c5b7ebe2f9e17a31" +
            "7b91c64926bf2d46a8f1ff58acbeba17652444444444444444444440a83760a181eb129e0c6059091ab11aa3fc5b999b9787530" +
            "3f76ad5dcf51d300d152958e063d4099e56444444444444444444444e081fec066435a30e875ced147985c35ecba48407c550ba" +
            "d42fc652366d9731c707f24d4865584868144444444444444444444086c5f41b85d7eb697bb8fec5f",
        ];

        const verificationVectors = [
            "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d2695832627b9081e77da7a3fc4d574363bf05" +
            "1700055822f3d394dc3d9ff741724727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d03a7a3e6f3b5" +
            "39dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99",
            "0x2b61d71274e46235006128f6383539fa58ccf40c832fb1e81f3554c20efecbe4019708db3cb154aed20b0dba21505fac4e065" +
            "93f353a8339fddaa21d2a43a5d91fed922c1955704caa85cdbcc7f33d24046362c635163e0e08bda8446c46699424d9e95c8cfa" +
            "056db786176b84f9f8657a9cc8044855d43f1f088a515ed02af7",
        ];

        const badVerificationVectors = [
            "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d2695832627b9081e77da7a3fc4d574363bf05" +
            "1700055822f3d394dc3d9ff741724727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d03a7a3e6f3b5" +
            "39dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a9a",
            "0x2b61d71274e46235006128f6383539fa58ccf40c832fb1e81f3554c20efecbe4019708db3cb154aed20b0dba21505fac4e065" +
            "93f353a8339fddaa21d2a43a5d91fed922c1955704caa85cdbcc7f33d24046362c635163e0e08bda8446c46699424d9e95c8cfa" +
            "056db786176b84f9f8657a9cc8044855d43f1f088a515ed02af8",
        ];

        const multipliedShares = [
            "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d2695832627b9081e77da7a3fc4d574363bf05" +
            "1700055822f3d394dc3d9ff741724727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d03a7a3e6f3b5" +
            "39dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99",
            "0x2b61d71274e46235006128f6383539fa58ccf40c832fb1e81f3554c20efecbe4019708db3cb154aed20b0dba21505fac4e065" +
            "93f353a8339fddaa21d2a43a5d91fed922c1955704caa85cdbcc7f33d24046362c635163e0e08bda8446c46699424d9e95c8cfa" +
            "056db786176b84f9f8657a9cc8044855d43f1f088a515ed02af7",
        ];

        const badMultipliedShares = [
            "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d2695832627b9081e77da7a3fc4d574363bf05" +
            "1700055822f3d394dc3d9ff741824727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d03a7a3e6f3b5" +
            "39dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a9b",
            "0x2b61d71274e46235006128f6383539fa58ccf40c832fb1e81f3554c20efecbe4019708db3cb154aed20b0dba21505fac4e065" +
            "93f353a8339fddaa21d2a43a5da1fed922c1955704caa85cdbcc7f33d24046362c635163e0e08bda8446c46699424d9e95c8cfa" +
            "056db786176b84f9f8657a9cc8044855d43f1f088a515ed02af9",
        ];

        const indexes = [0, 1];
        let schainName = "";
        const delegatedAmount = 1e7;

        beforeEach(async () => {
            await validatorService.registerValidator("Validator1", "D2 is even", 0, 0, {from: validator1});
            const validator1Id = await validatorService.getValidatorId(validator1);
            await validatorService.registerValidator("Validator2", "D2 is even more even", 0, 0, {from: validator2});
            const validator2Id = await validatorService.getValidatorId(validator2);
            await skaleToken.mint(validator1, delegatedAmount, "0x", "0x");
            await skaleToken.mint(validator2, delegatedAmount, "0x", "0x");
            await validatorService.enableValidator(validator1Id, {from: owner});
            await validatorService.enableValidator(validator2Id, {from: owner});
            await delegationController.delegate(validator1Id, delegatedAmount, 3, "D2 is even", {from: validator1});
            await delegationController.delegate(validator2Id, delegatedAmount, 3, "D2 is even more even",
                {from: validator2});
            await delegationController.acceptPendingDelegation(0, {from: validator1});
            await delegationController.acceptPendingDelegation(1, {from: validator2});

            skipTime(web3, 60 * 60 * 24 * 31);

            const nodesCount = 2;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await nodes.createNode(validatorsAccount[index],
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: "0x" + validatorsPublicKey[index],
                        name: "d2" + hexIndex
                    });
            }
        });

        it("should create schain and open a DKG channel", async () => {
            const deposit = await schainsFunctionality.getSchainPrice(4, 5);

            await schainsFunctionality.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            const channel: Channel = new Channel(await skaleDKG.channels(web3.utils.soliditySha3("d2")));
            assert(channel.active.should.be.true);
        });

        it("should create schain and reopen a DKG channel", async () => {
            const deposit = await schainsFunctionality.getSchainPrice(4, 5);

            await schainsFunctionality.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            const channel: Channel = new Channel(await skaleDKG.channels(web3.utils.soliditySha3("d2")));
            assert(channel.active.should.be.true);
        });

        it("should create & delete schain and open & close a DKG channel", async () => {
            const deposit = await schainsFunctionality.getSchainPrice(4, 5);

            await schainsFunctionality.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            let channel: Channel = new Channel(await skaleDKG.channels(web3.utils.soliditySha3("d2")));
            assert(channel.active.should.be.true);

            await schainsFunctionality.deleteSchainByRoot("d2");
            channel = new Channel(await skaleDKG.channels(web3.utils.soliditySha3("d2")));
            assert(channel.active.should.be.false);
        });

        describe("when 2-node schain is created", async () => {
            beforeEach(async () => {
                const deposit = await schainsFunctionality.getSchainPrice(4, 5);

                await schainsFunctionality.addSchain(
                    validator1,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

                let nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d2"));
                schainName = "d2";
                while ((new BigNumber(nodesInGroup[0])).toFixed() === "1") {
                    await schainsFunctionality.deleteSchainByRoot(schainName);
                    await schainsFunctionality.addSchain(
                        validator1,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));
                    nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3(schainName));
                }
            });

            it("should broadcast data from 1 node", async () => {
                const result = await skaleDKG.broadcast(
                    web3.utils.soliditySha3(schainName),
                    0,
                    verificationVectors[indexes[0]],
                    encryptedSecretKeyContributions[indexes[0]],
                    {from: validatorsAccount[0]},
                );
                assert.equal(result.logs[0].event, "BroadcastAndKeyShare");
                assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3(schainName));
                assert.equal(result.logs[0].args.fromNode.toString(), "0");
                const res = await skaleDKG.getBroadcastedData(web3.utils.soliditySha3(schainName), 0);
                assert.equal(res[0], encryptedSecretKeyContributions[indexes[0]]);
                assert.equal(res[1], verificationVectors[indexes[0]]);
            });

            it("should broadcast data from 1 node & check", async () => {
                const result = await skaleDKG.broadcast(
                    web3.utils.soliditySha3(schainName),
                    0,
                    verificationVectors[indexes[0]],
                    encryptedSecretKeyContributions[indexes[0]],
                    {from: validatorsAccount[0]},
                );
                assert.equal(result.logs[0].event, "BroadcastAndKeyShare");
                assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3(schainName));
                assert.equal(result.logs[0].args.fromNode.toString(), "0");

                const res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    {from: validatorsAccount[0]},
                );
                assert(res.should.be.false);
            });

            it("should broadcast data from 2 node", async () => {
                const result = await skaleDKG.broadcast(
                    web3.utils.soliditySha3(schainName),
                    1,
                    verificationVectors[indexes[1]],
                    encryptedSecretKeyContributions[indexes[1]],
                    {from: validatorsAccount[1]},
                );
                assert.equal(result.logs[0].event, "BroadcastAndKeyShare");
                assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3(schainName));
                assert.equal(result.logs[0].args.fromNode.toString(), "1");
            });

            it("should rejected broadcast data from 2 node with incorrect sender", async () => {
                await skaleDKG.broadcast(
                    web3.utils.soliditySha3(schainName),
                    1,
                    verificationVectors[indexes[1]],
                    encryptedSecretKeyContributions[indexes[1]],
                    {from: validatorsAccount[0]},
                ).should.be.eventually.rejectedWith(" Node does not exist for message sender");
            });

            describe("when correct broadcasts sent", async () => {
                beforeEach(async () => {
                    await skaleDKG.broadcast(
                        web3.utils.soliditySha3(schainName),
                        0,
                        verificationVectors[indexes[0]],
                        encryptedSecretKeyContributions[indexes[0]],
                        {from: validatorsAccount[0]},
                    );

                    await skaleDKG.broadcast(
                        web3.utils.soliditySha3(schainName),
                        1,
                        verificationVectors[indexes[1]],
                        encryptedSecretKeyContributions[indexes[1]],
                        {from: validatorsAccount[1]},
                    );
                });

                it("should send alright from 1 node", async () => {
                    const result = await skaleDKG.alright(
                        web3.utils.soliditySha3(schainName),
                        0,
                        {from: validatorsAccount[0]},
                    );
                    assert.equal(await skaleDKG.isAllDataReceived(web3.utils.soliditySha3(schainName), 0), true);
                    assert.equal(result.logs[0].event, "AllDataReceived");
                    assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3(schainName));
                    assert.equal(result.logs[0].args.nodeIndex.toString(), "0");
                });

                it("should send alright from 1 node", async () => {
                    const result = await skaleDKG.alright(
                        web3.utils.soliditySha3(schainName),
                        0,
                        {from: validatorsAccount[0]},
                    );
                    assert.equal(result.logs[0].event, "AllDataReceived");
                    assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3(schainName));
                    assert.equal(result.logs[0].args.nodeIndex.toString(), "0");

                    const res = await skaleDKG.isAlrightPossible(
                        web3.utils.soliditySha3(schainName),
                        0,
                        {from: validatorsAccount[0]},
                    );
                    assert(res.should.be.false);
                });

                it("should send alright from 2 node", async () => {
                    const result = await skaleDKG.alright(
                        web3.utils.soliditySha3(schainName),
                        1,
                        {from: validatorsAccount[1]},
                    );
                    assert.equal(result.logs[0].event, "AllDataReceived");
                    assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3(schainName));
                    assert.equal(result.logs[0].args.nodeIndex.toString(), "1");
                });

                it("should not send alright from 2 node with incorrect sender", async () => {
                    await skaleDKG.alright(
                        web3.utils.soliditySha3(schainName),
                        1,
                        {from: validatorsAccount[0]},
                    ).should.be.eventually.rejectedWith(" Node does not exist for message sender");
                });

                it("should catch successful DKG event", async () => {
                    await skaleDKG.alright(web3.utils.soliditySha3(schainName), 0, {from: validatorsAccount[0]});
                    const result = await skaleDKG.alright(
                        web3.utils.soliditySha3(schainName),
                        1,
                        {from: validatorsAccount[1]},
                    );
                    assert.equal(result.logs[1].event, "SuccessfulDKG");
                    assert.equal(result.logs[1].args.groupIndex, web3.utils.soliditySha3(schainName));
                });

                describe("when 2 node sent incorrect complaint", async () => {
                    beforeEach(async () => {
                        await skaleDKG.complaint(
                            web3.utils.soliditySha3(schainName),
                            1,
                            0,
                            {from: validatorsAccount[1]},
                        );
                    });

                    it("should check is possible to send complaint", async () => {
                        const res = await skaleDKG.isComplaintPossible(
                            web3.utils.soliditySha3(schainName),
                            1,
                            0,
                            {from: validatorsAccount[1]},
                        );
                        assert(res.should.be.false);
                    });

                    it("should send correct response", async () => {
                        const res = await skaleDKG.isResponsePossible(
                            web3.utils.soliditySha3(schainName),
                            0,
                            {from: validatorsAccount[0]},
                        );
                        assert(res.should.be.true);

                        const result = await skaleDKG.response(
                            web3.utils.soliditySha3(schainName),
                            0,
                            secretNumbers[indexes[0]],
                            multipliedShares[indexes[0]],
                            {from: validatorsAccount[0]},
                        );
                        assert.equal(result.logs[0].event, "BadGuy");
                        assert.equal(result.logs[0].args.nodeIndex.toString(), "1");

                        (await skaleToken.getAndUpdateLockedAmount.call(validator2)).toNumber()
                            .should.be.equal(delegatedAmount);
                        (await skaleToken.getAndUpdateDelegatedAmount.call(validator2)).toNumber()
                            .should.be.equal(delegatedAmount - failedDkgPenalty);
                        (await skaleToken.getAndUpdateSlashedAmount.call(validator2)).toNumber()
                            .should.be.equal(failedDkgPenalty);
                    });
                });
            });

            describe("when 1 node sent bad data", async () => {
                beforeEach(async () => {
                    await skaleDKG.broadcast(
                        web3.utils.soliditySha3(schainName),
                        0,
                        verificationVectors[indexes[0]],
                        // the last symbol is spoiled in parameter below
                        badEncryptedSecretKeyContributions[indexes[0]],
                        {from: validatorsAccount[0]},
                    );

                    await skaleDKG.broadcast(
                        web3.utils.soliditySha3(schainName),
                        1,
                        verificationVectors[indexes[1]],
                        encryptedSecretKeyContributions[indexes[1]],
                        {from: validatorsAccount[1]},
                    );
                });

                it("should send complaint from 2 node", async () => {
                    const result = await skaleDKG.complaint(
                        web3.utils.soliditySha3(schainName),
                        1,
                        0,
                        {from: validatorsAccount[1]},
                    );
                    const res = await skaleDKG.getComplaintData(web3.utils.soliditySha3(schainName));
                    assert.equal(res[0].toString(), "1");
                    assert.equal(res[1].toString(), "0");
                    assert.equal(result.logs[0].event, "ComplaintSent");
                    assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3(schainName));
                    assert.equal(result.logs[0].args.fromNodeIndex.toString(), "1");
                    assert.equal(result.logs[0].args.toNodeIndex.toString(), "0");
                });

                it("should not send 2 complaints from 2 node", async () => {
                    const result = await skaleDKG.complaint(
                        web3.utils.soliditySha3(schainName),
                        1,
                        0,
                        {from: validatorsAccount[1]},
                    );
                    await skaleDKG.complaint(
                        web3.utils.soliditySha3(schainName),
                        1,
                        0,
                        {from: validatorsAccount[1]},
                    ).should.be.eventually.rejectedWith("One more complaint rejected");
                });

                describe("when complaint successfully sent", async () => {

                    beforeEach(async () => {
                        const result = await skaleDKG.complaint(
                            web3.utils.soliditySha3(schainName),
                            1,
                            0,
                            {from: validatorsAccount[1]},
                        );
                    });

                    it("accused node should send correct response", async () => {
                        const result = await skaleDKG.response(
                            web3.utils.soliditySha3(schainName),
                            0,
                            secretNumbers[indexes[0]],
                            multipliedShares[indexes[0]],
                            {from: validatorsAccount[0]},
                        );
                        assert.equal(result.logs[0].event, "BadGuy");
                        assert.equal(result.logs[0].args.nodeIndex.toString(), "0");

                        (await skaleToken.getAndUpdateLockedAmount.call(validator1)).toNumber()
                            .should.be.equal(delegatedAmount);
                        (await skaleToken.getAndUpdateDelegatedAmount.call(validator1)).toNumber()
                            .should.be.equal(delegatedAmount - failedDkgPenalty);
                        (await skaleToken.getAndUpdateSlashedAmount.call(validator1)).toNumber()
                            .should.be.equal(failedDkgPenalty);
                    });

                    it("accused node should send incorrect response", async () => {
                        const result = await skaleDKG.response(
                            web3.utils.soliditySha3(schainName),
                            0,
                            secretNumbers[indexes[0]],
                            badMultipliedShares[indexes[0]],
                            {from: validatorsAccount[0]},
                        );
                        assert.equal(result.logs[0].event, "BadGuy");
                        assert.equal(result.logs[0].args.nodeIndex.toString(), "0");
                        assert.equal(result.logs.length, 2);

                        (await skaleToken.getAndUpdateLockedAmount.call(validator1)).toNumber()
                            .should.be.equal(delegatedAmount);
                        (await skaleToken.getAndUpdateDelegatedAmount.call(validator1)).toNumber()
                            .should.be.equal(delegatedAmount - failedDkgPenalty);
                        (await skaleToken.getAndUpdateSlashedAmount.call(validator1)).toNumber()
                            .should.be.equal(failedDkgPenalty);
                    });
                });
            });
        });

        it("should reopen channel correctly", async () => {
            const deposit = await schainsFunctionality.getSchainPrice(4, 5);

            await schainsFunctionality.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            let nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3("d2"));
            schainName = "d2";
            while ((new BigNumber(nodesInGroup[0])).toFixed() === "1") {
                await schainsFunctionality.deleteSchainByRoot(schainName);
                await schainsFunctionality.addSchain(
                    validator1,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));
                nodesInGroup = await schainsData.getNodesInGroup(web3.utils.soliditySha3(schainName));
            }

            await nodes.createNode(validatorsAccount[0],
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000003",
                    publicIp: "0x7f000003",
                    publicKey: "0x" + validatorsPublicKey[0],
                    name: "d203"
                });

            await skaleDKG.broadcast(
                web3.utils.soliditySha3(schainName),
                0,
                verificationVectors[indexes[0]],
                // the last symbol is spoiled in parameter below
                badEncryptedSecretKeyContributions[indexes[0]],
                {from: validatorsAccount[0]},
            );

            await skaleDKG.broadcast(
                web3.utils.soliditySha3(schainName),
                1,
                verificationVectors[indexes[1]],
                encryptedSecretKeyContributions[indexes[1]],
                {from: validatorsAccount[1]},
            );

            await skaleDKG.complaint(
                web3.utils.soliditySha3(schainName),
                1,
                0,
                {from: validatorsAccount[1]},
            );

            let channel: Channel = new Channel(await skaleDKG.channels(web3.utils.soliditySha3(schainName)));
            const dataAddress = channel.dataAddress;

            const result = await skaleDKG.response(
                web3.utils.soliditySha3(schainName),
                0,
                secretNumbers[indexes[0]],
                badMultipliedShares[indexes[0]],
                {from: validatorsAccount[0]},
            );
            assert.equal(result.logs[0].event, "BadGuy");
            assert.equal(result.logs[0].args.nodeIndex.toString(), "0");

            assert.equal(result.logs[3].event, "ChannelOpened");
            assert.equal(result.logs[3].args.groupIndex, web3.utils.soliditySha3(schainName));
            const blockNumber = result.receipt.blockNumber;
            const timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

            channel = new Channel(await skaleDKG.channels(web3.utils.soliditySha3(schainName)));
            assert.equal(channel.numberOfBroadcasted.toString(), "0");
            assert.equal(channel.startedBlockTimestamp.toString(), timestamp.toString());
            assert.equal(channel.dataAddress, dataAddress);
        });
    });
});
