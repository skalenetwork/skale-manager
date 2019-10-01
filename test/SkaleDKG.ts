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
// import sha256 from "js-sha256";
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
            "53093763158439585430573669375257842641782493446827046677036188158171986127874",
        );

        const secretNumberSecond = new BigNumber(
            "105593860362893162081062161526412274350999897683408181670994844501435786310559",
        );

        const encryptedSecretKeyContributions = [
            "0xf513fab429e187757f544b2b856e7a2bb334405f8065eb5c8889f35bc7c28a4104ae1ab3bea0d2804b71ae03a662c105c2e6b" +
            "496e1ad704a2b0747d1183f390e7d954ef5d9dd04dded46a37a741e3e60d78c61adade19d420f9703ca1ad5160ce000cb4874c0" +
            "61e774b3e11885d2f83e8806027707f89167994128f7b9eb49cbfb045698506e457085e2143b77e47ae7dcece6e380d871b4694" +
            "0c49dcc163362d8e1f5c72533a7e469f3024082747989bd849d28d98d51112d04e616e13e88742607",
            "0x35e5c3d9a36dd07c30433dc6e1ba323cc4ec760e9485d60da81b6dea2806a3c704f8c760286e4b9f8fd65cfe8442957206d3f" +
            "2ac4b2e8d268a38acff33edb0e2d37f5075b8e25dbcf8b36087713e04f287c9d2d13b4337178f0eba9296db6702edaa4715ccaa" +
            "8d8bbffd018b8dd6e27da1cef01a9afb4133b120aef45864537577043da5cc3034806e0b8e3060cc9f689b5fd022a57cd3d1499" +
            "7f3886c281cf8792249d6bd19b5c05ff9716265868fb26dc0b76b34e9ec19a3c44b3beced3e0e7386",
        ];

        const badEncryptedSecretKeyContributions = [
            "0xf513fab429e187757f544b2b856e7a2bb334405f8065eb5c8889f35bc7c28a4104ae1ab3bea0d2804b71ae03a662c105c2e6b" +
            "496e1ad704a2b0747d1183f390e7d954ef5d9dd04dded46a37a741e3e60d78c61adade19d420f9703ca1ad5160ce000cb4874c0" +
            "61e774b3e11885d2f83e8806027707f89167994128f7b9eb49cbfb045698506e457085e2143b77e47ae7dcece6e380d871b4694" +
            "0c49dcc163362d8e1f5c72533a7e469f3024082747989bd849d28d98d51112d04e616e13e88742608",
            "0x35e5c3d9a36dd07c30433dc6e1ba323cc4ec760e9485d60da81b6dea2806a3c704f8c760286e4b9f8fd65cfe8442957206d3f" +
            "2ac4b2e8d268a38acff33edb0e2d37f5075b8e25dbcf8b36087713e04f287c9d2d13b4337178f0eba9296db6702edaa4715ccaa" +
            "8d8bbffd018b8dd6e27da1cef01a9afb4133b120aef45864537577043da5cc3034806e0b8e3060cc9f689b5fd022a57cd3d1499" +
            "7f3886c281cf8792249d6bd19b5c05ff9716265868fb26dc0b76b34e9ec19a3c44b3beced3e0e7387",
        ];

        const num = new BigNumber("1651112515773858856752057606089809662584496568468631658147138072570796411852");
        const secretNum = new BigNumber("1");

        const verificationVectors = [
            "0x0f342e2330656b9da48f80a12b51117a66964cf93f97a7a5a255cc869c1bcae72d81ac62766d122e78200b3d70f7864cc364f" +
            "2ddde72206c86d3c08d6e1caad027d2272e01b8a714e85d7a7f1a41143437af60524700126afccbd430502e76872a1c589d40c3" +
            "c0bb05412eecc20bb8227b9a1f3c1ed4af67c5321a0a0e0f0115",
            "0x19545ba4b4af8d8275ab2b7b94678c9f02f9fdbdca5d36a8becf5b64712df7c00b9db5166a6a5c7ff4395ff4350cd02aa1b80" +
            "c3ca6bb719c48a0624a9b9f8587175a1017b3cd7b4bfa4ae3b5e1537a3a5fac9ce6414a762e45419ca2110961f41dc8a2970910" +
            "23090e14646c8181fe175dd842ad808eecc58b36ef93f3652eb4",
        ];

        const badVerificationVectors = [
            "0x0f342e2330656b9da48f80a12b51117a66964cf93f97a7a5a255cc869c1bcae72d81ac62766d122e78200b3d70f7864cc364f" +
            "2ddde72206c86d3c08d6e1caad027d2272e01b8a714e85d7a7f1a41143437af60524700126afccbd430502e76872a1c589d40c3" +
            "c0bb05412eecc20bb8227b9a1f3c1ed4af67c5321a0a0e0f0116",
            "0x19545ba4b4af8d8275ab2b7b94678c9f02f9fdbdca5d36a8becf5b64712df7c00b9db5166a6a5c7ff4395ff4350cd02aa1b80" +
            "c3ca6bb719c48a0624a9b9f8587175a1017b3cd7b4bfa4ae3b5e1537a3a5fac9ce6414a762e45419ca2110961f41dc8a2970910" +
            "23090e14646c8181fe175dd842ad808eecc58b36ef93f3652eb5",
        ];

        const multipliedShares = [
            "0x2ee1611bcf2158246b5b5e15a1c5e73d3dea8c7a5f8034998cf61a4380e015fe21794c2ba85c57b2dc311efc55f9260dff52b" +
            "0d2fab7ecd86ba64bf85d2b51952b8645fd69f7f2b1efc39c5fcd5fcb41fac3339928a773e174e535d678c316f922ac69d55a65" +
            "f1045f568f17e541136a2e20e6f21c3bad36ca976a9bc7f65c39",
            "0x07bb4f0a9afaf0f1fb539e8ec531a4fb858cf614a9ee0f59e19c0739ae9b23d107413e4157f2e05ac2f5b6b364a28ca032a6f" +
            "7c3ee0af05c834773723d2edce02415ebe8534e6d83449bf39f6dac939b0f619e2a1a4f7d1f887196292328b1402339caa6c106" +
            "730d0f2fb76cf6b1e9295d80b0454cf73448dd13cedfb6a7e5e2",
        ];

        const badMultipliedShares = [
            "0x2ee1611bcf2158246b5b5e15a1c5e73d3dea8c7a5f8034998cf61a4380e015fe21794c2ba85c57b2dc311efc55f9260dff52b" +
            "0d2fab7ecd86ba64bf85d2b51952b8645fd69f7f2b1efc39c5fcd5fcb41fac3339928a773e174e535d678c316f922ac69d55a65" +
            "f1045f568f17e541136a2e20e6f21c3bad36ca976a9bc7f65c3a",
            "0x07bb4f0a9afaf0f1fb539e8ec531a4fb858cf614a9ee0f59e19c0739ae9b23d107413e4157f2e05ac2f5b6b364a28ca032a6f" +
            "7c3ee0af05c834773723d2edce02415ebe8534e6d83449bf39f6dac939b0f619e2a1a4f7d1f887196292328b1402339caa6c106" +
            "730d0f2fb76cf6b1e9295d80b0454cf73448dd13cedfb6a7e5e3",
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
                    const res = await skaleDKG.bytesToPublicKey("0x" + validatorsPublicKey[1]);
                    const resX = new BigNumber(res[0]);
                    const resY = new BigNumber(res[1]);
                    const derivedKey = await ecdh.deriveKey(secretNum.toFixed(), resX.toFixed(), resY.toFixed());
                    const number1 = new BigNumber("1651112515773858856752057606089809662584496568468631658147138072570796411852");
                    // const key = sha256.update((new BigNumber(derivedKey[0])).toString());
                    // console.log(key);
                    // const encrypted = await decryption.encrypt(number1.toFixed(), key);
                    //const inputParams = encryptedSecretKeyContributions[0].slice(0, )
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
                        const result = await skaleDKG.getCommonPublicKey(
                            web3.utils.soliditySha3("d2"),
                            secretNumberFirst.toFixed(),
                        );
                        console.log(result);
                        const result1 = await skaleDKG.hashed("0x3233");
                        console.log(result1);
                        // const result = await skaleDKG.response(
                        //     web3.utils.soliditySha3("d2"),
                        //     0,
                        //     secretNumberFirst.toFixed(),
                        //     multipliedShares[0],
                        //     {from: validatorsAccount[0]},
                        // );
                        // assert.equal(result.logs[0].event, "BadGuy");
                        // // need to debug it!!!
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
