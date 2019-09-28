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
            "84858972125516121768648219944507512294747453724013462351671429044454800517341",
        );

        const secretNumberSecond = new BigNumber(
            "56620236285624794644791805919749430710840360330199251369338306793965310107331",
        );

        const encryptedSecretKeyContributions = [
            "0x8995f55d56569606643b6e76e4861710b7863978a9f64b2b78a90476009450cb044472f5f2f0a444703beb8be660d683e9a40" +
            "70f919b606481109996b0a93ca1326d4a8abb41b8be62151ad9741dbcf570964cf65585c6cc504983a1ba0125d6733b4d541dea" +
            "2bda52a93d551e49ff6c9ab8ece44e978ae12c597e8c5b5905a83f0438f9d11a34d939ea6ea6ebff78393beee93753c017418ec" +
            "7711c3297a00baa5341d1821ec7345b52eb4665c2b1f0a10eee82f7683f1ece04f57164e7ab59064f",
            "0x7bb970a8f23f0d09869d63f7cb53e0cca49b949debb4b2c96500dcb79ac7b26a048d9919dab4496c0fad9b2fe1cb6fde9d5cb" +
            "574c7e185773f2fe5405611b57fe3be8c7967bb2ed5863965b28cdd9dad9c9edd5a1296f5e6cf89c06eddd1729257bbaf1a2e63" +
            "2e27f6bdf5ea27a094d524f6db71ebaf12a5bec5a9ef9ef2bb9d64046039bc469b6ba0727333922987d45ccf16591af7cd54bd4" +
            "a639ad345feccfed7f60081fcf9388a56d87751218d6e3aea5677889fed7fd2e078c6225f460fabe1",
        ];

        const badEncryptedSecretKeyContributions = [
            "0x8995f55d56569606643b6e76e4861710b7863978a9f64b2b78a90476009450cb044472f5f2f0a444703beb8be660d683e9a40" +
            "70f919b606481109996b0a93ca1326d4a8abb41b8be62151ad9741dbcf570964cf65585c6cc504983a1ba0125d6733b4d541dea" +
            "2bda52a93d551e49ff6c9ab8ece44e978ae12c597e8c5b5905a83f0438f9d11a34d939ea6ea6ebff78393beee93753c017418ec" +
            "7711c3297a00baa5341d1821ec7345b52eb4665c2b1f0a10eee82f7683f1ece04f57164e7ab590650",
            "0x7bb970a8f23f0d09869d63f7cb53e0cca49b949debb4b2c96500dcb79ac7b26a048d9919dab4496c0fad9b2fe1cb6fde9d5cb" +
            "574c7e185773f2fe5405611b57fe3be8c7967bb2ed5863965b28cdd9dad9c9edd5a1296f5e6cf89c06eddd1729257bbaf1a2e63" +
            "2e27f6bdf5ea27a094d524f6db71ebaf12a5bec5a9ef9ef2bb9d64046039bc469b6ba0727333922987d45ccf16591af7cd54bd4" +
            "a639ad345feccfed7f60081fcf9388a56d87751218d6e3aea5677889fed7fd2e078c6225f460fabe2",
        ];

        const verificationVectors = [
            "0x1ab16ad362c3c108b92ea5594ec9c3825882cb0fa65f482d861f7356e35e60e620ef95a0900e0c4a1bf9f4f8ab04b34dc1b85" +
            "d103e04978ad398fe29c51342561ef2ae24f185cd9d8c454dddbce8acaa886ff910d9cd9d15a04db1de2697f0d91a1006da8738" +
            "29d5869f479018912eae62f20bb203094742611f697e4033719e",
            "0x21c95684a7f1812ddcf0bb24a0fed4e1c869a17ad3a36c9c4902bfabf9f8cf0d114e3afbcad3f72876bc77676220100e50aa1" +
            "0c0417c5e6feb22b53c2d8efa982c94910af1da7578f3972870ee815fd26a25539ed914f79b269bc0b232269e9019e923e3c5af" +
            "c04318dc224f42623c6a1461d22f69d0d7eac4adfcc78fec22a8",
        ];

        const badVerificationVectors = [
            "0x1ab16ad362c3c108b92ea5594ec9c3825882cb0fa65f482d861f7356e35e60e620ef95a0900e0c4a1bf9f4f8ab04b34dc1b85" +
            "d103e04978ad398fe29c51342561ef2ae24f185cd9d8c454dddbce8acaa886ff910d9cd9d15a04db1de2697f0d91a1006da8738" +
            "29d5869f479018912eae62f20bb203094742611f697e4033719f",
            "0x21c95684a7f1812ddcf0bb24a0fed4e1c869a17ad3a36c9c4902bfabf9f8cf0d114e3afbcad3f72876bc77676220100e50aa1" +
            "0c0417c5e6feb22b53c2d8efa982c94910af1da7578f3972870ee815fd26a25539ed914f79b269bc0b232269e9019e923e3c5af" +
            "c04318dc224f42623c6a1461d22f69d0d7eac4adfcc78fec22a9",
        ];

        const multipliedShares = [
            "0x2c7d2dfd6fd5f49f2519a205f5bfdf0feadbe2d54f287557261246f1defd019d221c1a3e1abb24209ea59f084d3ecb938fdcd" +
            "e3676fef6fd98999333c9d1377f2d5da875556d3ad1fec368454c551b618374456ce38e4dcd575d8ea7c22dd58a2efe61196e82" +
            "b5508f63bfff1af15432df001dc7b11a8f97e009890b335c47c2",
            "0x0c87bdb03d79f0af66c50a9c5bfc05205da4fe195bb1b1a38062184e238e836d25bee3b295cabe49cb1b9a06d517e8e320dd2" +
            "4fbcfdbcbddccb2670e1f3368bc14b2d842b38921d9c11dcb815856370fff67509079a78be9b20b0d631e4d79010d7c48834da5" +
            "b3a7f3ab852ef012b01d0a1fe7829b643de1076ab07eed44f6f6",
        ];

        const badMultipliedShares = [
            "0x2c7d2dfd6fd5f49f2519a205f5bfdf0feadbe2d54f287557261246f1defd019d221c1a3e1abb24209ea59f084d3ecb938fdcd" +
            "e3676fef6fd98999333c9d1377f2d5da875556d3ad1fec368454c551b618374456ce38e4dcd575d8ea7c22dd58a2efe61196e82" +
            "b5508f63bfff1af15432df001dc7b11a8f97e009890b335c47c3",
            "0x0c87bdb03d79f0af66c50a9c5bfc05205da4fe195bb1b1a38062184e238e836d25bee3b295cabe49cb1b9a06d517e8e320dd2" +
            "4fbcfdbcbddccb2670e1f3368bc14b2d842b38921d9c11dcb815856370fff67509079a78be9b20b0d631e4d79010d7c48834da5" +
            "b3a7f3ab852ef012b01d0a1fe7829b643de1076ab07eed44f6f7",
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

                describe("when 2 node sent incorrect complaint", async () => {
                    beforeEach(async () => {
                        await skaleDKG.complaint(
                            web3.utils.soliditySha3("d2"),
                            1,
                            0,
                            {from: validatorsAccount[1]},
                        );
                    });

                    it("should send correct response", async () => {
                        const result = await skaleDKG.response(
                            web3.utils.soliditySha3("d2"),
                            0,
                            secretNumberFirst.toFixed(),
                            multipliedShares[0],
                            {from: validatorsAccount[0]},
                        );
                        assert.equal(result.logs[0].event, "BadGuy");
                        // need to debug it!!!
                        // assert.equal(result.logs[0].args.nodeIndex.toString(), "1");
                    });
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

                    it("accused node should send correct response", async () => {
                        const result = await skaleDKG.response(
                            web3.utils.soliditySha3("d2"),
                            0,
                            secretNumberFirst.toFixed(),
                            multipliedShares[0],
                            {from: validatorsAccount[0]},
                        );
                        assert.equal(result.logs[0].event, "BadGuy");
                        assert.equal(result.logs[0].args.nodeIndex.toString(), "0");
                    });

                    it("accused node should send incorrect response", async () => {
                        const result = await skaleDKG.response(
                            web3.utils.soliditySha3("d2"),
                            0,
                            secretNumberFirst.toFixed(),
                            badMultipliedShares[0],
                            {from: validatorsAccount[0]},
                        );
                        assert.equal(result.logs[0].event, "BadGuy");
                        assert.equal(result.logs[0].args.nodeIndex.toString(), "0");
                    });
                });
            });
        });
    });
});
