import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ConstantsHolderContract,
         ConstantsHolderInstance,
         ContractManagerContract,
         ContractManagerInstance,
         DecryptionContract,
         DecryptionInstance,
         ECDHContract,
         ECDHInstance,
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
         SkaleDKGContract,
         SkaleDKGInstance} from "../types/truffle-contracts";

import { gasMultiplier } from "./utils/command_line";
import { skipTime } from "./utils/time";
// const truffleAssert = require('truffle-assertions');
// const truffleEvent = require('truffle-events');

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const ConstantsHolder: ConstantsHolderContract = artifacts.require("./ConstantsHolder");
const NodesData: NodesDataContract = artifacts.require("./NodesData");
const NodesFunctionality: NodesFunctionalityContract = artifacts.require("./NodesFunctionality");
const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");
const SchainsFunctionality: SchainsFunctionalityContract = artifacts.require("./SchainsFunctionality");
const SchainsFunctionality1: SchainsFunctionality1Contract = artifacts.require("./SchainsFunctionality1");
const SkaleDKG: SkaleDKGContract = artifacts.require("./SkaleDKG");
const Decryption: DecryptionContract = artifacts.require("./Decryption");
const ECDH: ECDHContract = artifacts.require("./ECDH");

import BigNumber from "bignumber.js";
chai.should();
chai.use(chaiAsPromised);

class Channel {
    public active: boolean;
    public dataAddress: string;
    public numberOfBroadcasted: BigNumber;
    public publicKeyx: object;
    public publicKeyy: object;
    public numberOfCompleted: BigNumber;
    public startedBlockNumber: BigNumber;
    public nodeToComplaint: BigNumber;
    public fromNodeToComplaint: BigNumber;
    public startedComplaintBlockNumber: BigNumber;

    constructor(arrayData: [boolean, string, BigNumber, object, object, BigNumber, BigNumber, BigNumber,
        BigNumber, BigNumber]) {
        this.active = arrayData[0];
        this.dataAddress = arrayData[1];
        this.numberOfBroadcasted = new BigNumber(arrayData[2]);
        this.publicKeyx = arrayData[3];
        this.publicKeyy = arrayData[4];
        this.numberOfCompleted = new BigNumber(arrayData[5]);
        this.startedBlockNumber = new BigNumber(arrayData[6]);
        this.nodeToComplaint = new BigNumber(arrayData[7]);
        this.fromNodeToComplaint = new BigNumber(arrayData[8]);
        this.startedComplaintBlockNumber = new BigNumber(arrayData[9]);
    }
}

contract("SkaleDKG", ([validator1, validator2]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let nodesData: NodesDataInstance;
    let nodesFunctionality: NodesFunctionalityInstance;
    let schainsData: SchainsDataInstance;
    let schainsFunctionality: SchainsFunctionalityInstance;
    let schainsFunctionality1: SchainsFunctionality1Instance;
    let skaleDKG: SkaleDKGInstance;
    let decryption: DecryptionInstance;
    let ecdh: ECDHInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: validator1});

        constantsHolder = await ConstantsHolder.new(
            contractManager.address,
            {from: validator1, gas: 8000000});
        await contractManager.setContractsAddress("Constants", constantsHolder.address);

        nodesData = await NodesData.new(
            5,
            contractManager.address,
            {from: validator1, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("NodesData", nodesData.address);

        nodesFunctionality = await NodesFunctionality.new(
            contractManager.address,
            {from: validator1, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("NodesFunctionality", nodesFunctionality.address);

        schainsData = await SchainsData.new(
            "SchainsFunctionality1",
            contractManager.address,
            {from: validator1, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsData", schainsData.address);

        schainsFunctionality = await SchainsFunctionality.new(
            "SkaleManager",
            "SchainsData",
            contractManager.address,
            {from: validator1, gas: 7900000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsFunctionality", schainsFunctionality.address);

        schainsFunctionality1 = await SchainsFunctionality1.new(
            "SchainsFunctionality",
            "SchainsData",
            contractManager.address,
            {from: validator1, gas: 7000000 * gasMultiplier});
        await contractManager.setContractsAddress("SchainsFunctionality1", schainsFunctionality1.address);

        skaleDKG = await SkaleDKG.new(contractManager.address, {from: validator1, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);

        decryption = await Decryption.new({from: validator1, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("Decryption", decryption.address);

        ecdh = await ECDH.new({from: validator1, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("ECDH", ecdh.address);
    });

    describe("when 2 nodes are created", async () => {
        const validatorsAccount = [
            "0x7E6CE355Ca303EAe3a858c172c3cD4CeB23701bc",
            "0xF64ADc0A4462E30381Be09E42EB7DcB816de2803",
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

        const secretNumberFirst = new BigNumber(
            "25441240677047266640346149415019677054524097143521447791017513598832997377212",
        );

        const secretNumberSecond = new BigNumber(
            "14887249085030118974323797161643651263408567951982614081658503939472627769724",
        );

        const encryptedSecretKeyContributions = [
            "0x461d3d6b6a3af0294d2ec641b9c20190bbd2a82188a2fbf5b79e7787a89698a404ac7ef1a4b998702497ccf8392a149129fd4" +
            "b99dbf7f05ee7768160592f3132fbfc6bc64fc3a2d83a80b2f9b11baee32b5bd56c43d0219c88857ba633befb7f0efb955237e7" +
            "1624582d35491012c831047f6b4143fb875dffcd6a8792ee9d168804f9faf9f80de7eeebf238ee5bcfec13d92e9d9410597caa3" +
            "f973a3f463cacb677782029c237ad2a0c98b6e4c07a4202d1701eb9ff5ec992faaa1e79a06f998bfb",
            "0x902532622ea9e20b988582c8e2352fc0afdc3f81d81320d598494671559cfece04f52233178f302d53749fa89896875bc7d78" +
            "bacba2825a691d62ec451b1103f749751cb16f03a8a7d8361523082af61191d7172702d20d59fb36afb363b73d5e1989dd23117" +
            "d68439080d510fa8c0133951f8d492c22ddc9e07fc6de1bfb39d2f04a553d652638af00631ca928d7748c87f23423dfc87d5e1d" +
            "7f6f44bdc70dd3a83694b98caea97dba8c6e9aa0642fc2c1365b30d556301546494528af10a4e4409",
        ];

        const badEncryptedSecretKeyContributions = [
            "0x461d3d6b6a3af0294d2ec641b9c20190bbd2a82188a2fbf5b79e7787a89698a404ac7ef1a4b998702497ccf8392a149129fd4" +
            "b99dbf7f05ee7768160592f3132fbfc6bc64fc3a2d83a80b2f9b11baee32b5bd56c43d0219c88857ba633befb7f0efb955237e7" +
            "1624582d35491012c831047f6b4143fb875dffcd6a8792ee9d168804f9faf9f80de7eeebf238ee5bcfec13d92e9d9410597caa3" +
            "f973a3f463cacb677782029c237ad2a0c98b6e4c07a4202d1701eb9ff5ec992faaa1e79a06f998bfc",
            "0x902532622ea9e20b988582c8e2352fc0afdc3f81d81320d598494671559cfece04f52233178f302d53749fa89896875bc7d78" +
            "bacba2825a691d62ec451b1103f749751cb16f03a8a7d8361523082af61191d7172702d20d59fb36afb363b73d5e1989dd23117" +
            "d68439080d510fa8c0133951f8d492c22ddc9e07fc6de1bfb39d2f04a553d652638af00631ca928d7748c87f23423dfc87d5e1d" +
            "7f6f44bdc70dd3a83694b98caea97dba8c6e9aa0642fc2c1365b30d556301546494528af10a4e440a",
        ];

        const verificationVectors = [
            "0x29ada5b9c88a59919e5d1001888ceedc1efbb1d67277cbfeff132254981f6e6020fafb2739339ff6b843040c536c330307011" +
            "d844285e16e16235980c57d3bd1048b0361f7510070c6ebc818eeebc8787a13f9c2e7d81ad451bac1173022c00c08935372f47c" +
            "0fd2cc06086c20f7741adb14290f528cd1fea1d7bbd112fadaf02dd2e6134c60fd7df8a20d0ab2aa2730da2faa43981ca506ed3" +
            "b9ab713143fdc210b820205740c1270a991a655af4a6e42fcbfe9cf61d5cf442ecb22276ad6a3",
            "0x27f5f72241ae51ef0ac733cd3edb131a32373866aa0c378254a4f82fa2a96a7522df6bbf6529438c11d8a2185c5cd2a70224b" +
            "0977c93ba27288b9bc1d45f60ee039c1ef80fe87761d8890c1c54567386a678ca86d79755ba3f77df36d853ea5604458ce7af8d" +
            "8eb82bb5d3a7a430c03ec4b2965144f01cd4c0bd3f3b9104eb412a7250fc8deae99b3f8a47cf3acbacceaea71f2438a3d6cf23f" +
            "807313f924fcf303cce023126b0818f9ae1cc2e25579e133b0f8bedb95265b7771c60141c2610",
        ];

        const badVerificationVectors = [
            "0x29ada5b9c88a59919e5d1001888ceedc1efbb1d67277cbfeff132254981f6e6020fafb2739339ff6b843040c536c330307011" +
            "d844285e16e16235980c57d3bd1048b0361f7510070c6ebc818eeebc8787a13f9c2e7d81ad451bac1173022c00c08935372f47c" +
            "0fd2cc06086c20f7741adb14290f528cd1fea1d7bbd112fadaf02dd2e6134c60fd7df8a20d0ab2aa2730da2faa43981ca506ed3" +
            "b9ab713143fdc210b820205740c1270a991a655af4a6e42fcbfe9cf61d5cf442ecb22276ad6a4",
            "0x27f5f72241ae51ef0ac733cd3edb131a32373866aa0c378254a4f82fa2a96a7522df6bbf6529438c11d8a2185c5cd2a70224b" +
            "0977c93ba27288b9bc1d45f60ee039c1ef80fe87761d8890c1c54567386a678ca86d79755ba3f77df36d853ea5604458ce7af8d" +
            "8eb82bb5d3a7a430c03ec4b2965144f01cd4c0bd3f3b9104eb412a7250fc8deae99b3f8a47cf3acbacceaea71f2438a3d6cf23f" +
            "807313f924fcf303cce023126b0818f9ae1cc2e25579e133b0f8bedb95265b7771c60141c2611",
        ];

        beforeEach(async () => {
            const nodesCount = 2;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                await nodesFunctionality.createNode(validatorsAccount[index], "100000000000000000000",
                    "0x00" +
                    "2161" +
                    "0000" +
                    "7f0000" + hexIndex +
                    "7f0000" + hexIndex +
                    validatorsPublicKey[index] +
                    "d2" + hexIndex);
            }
        });

        it("should create schain and open a DKG channel", async () => {
            const deposit = await schainsFunctionality.getSchainPrice(4, 5);

            await schainsFunctionality.addSchain(
                validator1,
                deposit,
                "0x10" +
                "0000000000000000000000000000000000000000000000000000000000000005" +
                "04" +
                "0000" +
                "6432",
                {from: validator1});

            const channel: Channel = new Channel(await skaleDKG.channels(web3.utils.soliditySha3("d2")));
            assert(channel.active.should.be.true);
        });

        describe("when 2-node schain is created", async () => {
            beforeEach(async () => {
                const deposit = await schainsFunctionality.getSchainPrice(4, 5);

                await schainsFunctionality.addSchain(
                    validator1,
                    deposit,
                    "0x10" +
                    "0000000000000000000000000000000000000000000000000000000000000005" +
                    "04" +
                    "0000" +
                    "6432",
                    {from: validator1});
            });

            it("should broadcast data from 1 node", async () => {
                const result = await skaleDKG.broadcast(
                    web3.utils.soliditySha3("d2"),
                    0,
                    verificationVectors[0],
                    encryptedSecretKeyContributions[0],
                    {from: validatorsAccount[0]},
                );
                assert.equal(result.logs[0].event, "BroadcastAndKeyShare");
                assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3("d2"));
                assert.equal(result.logs[0].args.fromNode.toString(), "0");
            });

            it("should broadcast data from 2 node", async () => {
                const result = await skaleDKG.broadcast(
                    web3.utils.soliditySha3("d2"),
                    1,
                    verificationVectors[1],
                    encryptedSecretKeyContributions[1],
                    {from: validatorsAccount[1]},
                );
                assert.equal(result.logs[0].event, "BroadcastAndKeyShare");
                assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3("d2"));
                assert.equal(result.logs[0].args.fromNode.toString(), "1");
            });

            it("should rejected broadcast data from 2 node with incorrect sender", async () => {
                await skaleDKG.broadcast(
                    web3.utils.soliditySha3("d2"),
                    1,
                    verificationVectors[1],
                    encryptedSecretKeyContributions[1],
                    {from: validatorsAccount[0]},
                ).should.be.eventually.rejectedWith(" Node does not exist for message sender.");
            });

            describe("when correct broadcasts sent", async () => {
                beforeEach(async () => {
                    await skaleDKG.broadcast(
                        web3.utils.soliditySha3("d2"),
                        0,
                        verificationVectors[0],
                        encryptedSecretKeyContributions[0],
                        {from: validatorsAccount[0]},
                    );

                    await skaleDKG.broadcast(
                        web3.utils.soliditySha3("d2"),
                        1,
                        verificationVectors[1],
                        encryptedSecretKeyContributions[1],
                        {from: validatorsAccount[1]},
                    );
                });

                it("should send alright from 1 node", async () => {
                    const result = await skaleDKG.allright(
                        web3.utils.soliditySha3("d2"),
                        0,
                        {from: validatorsAccount[0]},
                    );
                    assert.equal(result.logs[0].event, "AllDataReceived");
                    assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3("d2"));
                    assert.equal(result.logs[0].args.nodeIndex.toString(), "0");
                });

                it("should send alright from 2 node", async () => {
                    const result = await skaleDKG.allright(
                        web3.utils.soliditySha3("d2"),
                        1,
                        {from: validatorsAccount[1]},
                    );
                    assert.equal(result.logs[0].event, "AllDataReceived");
                    assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3("d2"));
                    assert.equal(result.logs[0].args.nodeIndex.toString(), "1");
                });

                it("should not send alright from 2 node with incorrect sender", async () => {
                    await skaleDKG.allright(
                        web3.utils.soliditySha3("d2"),
                        1,
                        {from: validatorsAccount[0]},
                    ).should.be.eventually.rejectedWith(" Node does not exist for message sender.");
                });

                it("should catch sucessfulDKG event", async () => {
                    await skaleDKG.allright(web3.utils.soliditySha3("d2"), 0, {from: validatorsAccount[0]});
                    const result = await skaleDKG.allright(
                        web3.utils.soliditySha3("d2"),
                        1,
                        {from: validatorsAccount[1]},
                    );
                    assert.equal(result.logs[1].event, "SuccessfulDKG");
                    assert.equal(result.logs[1].args.groupIndex, web3.utils.soliditySha3("d2"));
                });
            });

            describe("when 1 node sent bad data", async () => {
                beforeEach(async () => {
                    await skaleDKG.broadcast(
                        web3.utils.soliditySha3("d2"),
                        0,
                        // the last symbol is spoiled in parameter below
                        badVerificationVectors[0],
                        encryptedSecretKeyContributions[0],
                        {from: validatorsAccount[0]},
                    );

                    await skaleDKG.broadcast(
                        web3.utils.soliditySha3("d2"),
                        1,
                        verificationVectors[1],
                        encryptedSecretKeyContributions[1],
                        {from: validatorsAccount[1]},
                    );
                });

                it("should send complaint from 2 node", async () => {
                    const result = await skaleDKG.complaint(
                        web3.utils.soliditySha3("d2"),
                        1,
                        0,
                        {from: validatorsAccount[1]},
                    );
                    assert.equal(result.logs[0].event, "ComplaintSent");
                    assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3("d2"));
                    assert.equal(result.logs[0].args.fromNodeIndex.toString(), "1");
                    assert.equal(result.logs[0].args.toNodeIndex.toString(), "0");
                });

                it("should not send 2 complaints from 2 node", async () => {
                    const result = await skaleDKG.complaint(
                        web3.utils.soliditySha3("d2"),
                        1,
                        0,
                        {from: validatorsAccount[1]},
                    );
                    await skaleDKG.complaint(
                        web3.utils.soliditySha3("d2"),
                        1,
                        0,
                        {from: validatorsAccount[1]},
                    ).should.be.eventually.rejectedWith("One more complaint rejected");
                });

                describe("when complaint successfully sent", async () => {

                    beforeEach(async () => {
                        const result = await skaleDKG.complaint(
                            web3.utils.soliditySha3("d2"),
                            1,
                            0,
                            {from: validatorsAccount[1]},
                        );
                    });

                    it("accused node should send response", async () => {
                        // console.log(skaleDKG.address);
                        // const result = await skaleDKG.getCommonPublicKey(
                        //     web3.utils.soliditySha3("d2"),
                        //     secretNumberFirst.toFixed(),
                        // );
                        // console.log(result);
                        // const result1 = new BigNumber(await skaleDKG.decryptMessage(
                        //     web3.utils.soliditySha3("d2"),
                        //     secretNumberFirst.toFixed(),
                        // ));
                        // console.log(result1.toFixed());
                        // const result2 = await skaleDKG.loop(0, verificationVectors[0], 0);
                        // console.log(result2);
                        // const result2 = await skaleDKG.verify(0, result1.toFixed(), verificationVectors[0]);
                        // console.log(result2);
                        // const result = await skaleDKG.response(
                        //     web3.utils.soliditySha3("d2"),
                        //     0,
                        //     secretNumberFirst.toFixed(),
                        //     {from: validatorsAccount[0]},
                        // );
                    });
                });
            });
        });
    });
});
