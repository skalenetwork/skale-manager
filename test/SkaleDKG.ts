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
        await contractManager.setContractsAddress("ECDH", skaleDKG.address);
    });

    describe("when 2 nodes are created", async () => {
        const validatorsAccount = ["0x7E6CE355Ca303EAe3a858c172c3cD4CeB23701bc", "0xF64ADc0A4462E30381Be09E42EB7DcB816de2803"];
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
                    "0x273e5f3885bcab159ac16c92b8ba2201b4ddd70b0018934c7eb05bb4ee220b51292c3984fe1064ca5cc294d57d6" +
                    "59678e59bd2793c46896ca4eefd4859ad54e22b74c02db4c36dd38aa7055f203d2606ef5717d223daf19261f733bfb6" +
                    "284fed23119e351c8311026741ce8f76706ca8549b1315d593b0c12279610ebb8c883b296d1c41d64b3af10f4fcc526" +
                    "64fa6569d633de79dde8e444006f9dc79f0cd7a0e2622572d5ee49dc43b482bf4677b8240d84cbf90ad8f9bf3ba0772" +
                    "d0d6d125",
                    "0x3b3887c8dcf791e60ef9059cdfd995bf51d94539e12ba6b6db74fa2dfffd9b3e04676f95ebb7c791327e76d9fd459" +
                    "3a58168e4d70575765098daa7ef718a267f4c40818b692b699dccbf367955b8768a4d83aadccbadceb13fa8935ff6ea" +
                    "69a77d6f444d34ee21889387cee43e677cf14f7b794c147fddf768b56bfe0199db02f304349cbe975933148beff2514" +
                    "cbe74c6b18bd7c4c06ad8a16d8fd929fd3c97915e8e50afe7f7e17e2d8c21b51ed0c4d20d5034c90b0dd503ae2e24d3" +
                    "43e07798cb",
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
                    "0x0e818c679fe3466268cdb28bb733d2fbe3e621afcd82b1ddf9917d982d98f28c162e1f3aea12108ebb2454ee87703" +
                    "5f302dfd9fe0ae9c136889e0344980a5ff31a3de20595414d229643c863f8965f0eb10e318ab72264cb990fa697b33e" +
                    "81612f7f03208a80e0d372382d573980fc93b0476ca18fd2a1a8fb7fddc2415a90c710992d958391f4751e2e83b9c5c" +
                    "94dc167569adeb103a8763e0bd48d7ee7e96a1782f5c97671cf87596e1b268d02e53953e88f12ee3065a6640542fc83" +
                    "683a07",
                    "0x4b4b4a92c3ac8bd145b6db7f79a42dbec968357c770231c711a5a76b726ceda6042be5a23ec05019b072aa624b939" +
                    "2e4345df4674a1f5e585979ea0b766dc163f4d200228a5d5e20f991b84416be191cd4a293ab86cf6ba84d40148736b4" +
                    "961a4fcbaa2f58cc65a5e2ca444e7a07d53feb88bfb64a6d75b7efe3b5bb554c6352f90408a2932c63fa446ce49b691" +
                    "f105b86ce2c3ff0700073ceb2f534d28bb1229e9a15836e7abfaeed3917062c7a59efd57714cba33ebc3789ff12e3eb" +
                    "07b22e329d",
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
                    "0x0e818c679fe3466268cdb28bb733d2fbe3e621afcd82b1ddf9917d982d98f28c162e1f3aea12108ebb2454ee87703" +
                    "5f302dfd9fe0ae9c136889e0344980a5ff31a3de20595414d229643c863f8965f0eb10e318ab72264cb990fa697b33e" +
                    "81612f7f03208a80e0d372382d573980fc93b0476ca18fd2a1a8fb7fddc2415a90c710992d958391f4751e2e83b9c5c" +
                    "94dc167569adeb103a8763e0bd48d7ee7e96a1782f5c97671cf87596e1b268d02e53953e88f12ee3065a6640542fc83" +
                    "683a07",
                    "0x4b4b4a92c3ac8bd145b6db7f79a42dbec968357c770231c711a5a76b726ceda6042be5a23ec05019b072aa624b939" +
                    "2e4345df4674a1f5e585979ea0b766dc163f4d200228a5d5e20f991b84416be191cd4a293ab86cf6ba84d40148736b4" +
                    "961a4fcbaa2f58cc65a5e2ca444e7a07d53feb88bfb64a6d75b7efe3b5bb554c6352f90408a2932c63fa446ce49b691" +
                    "f105b86ce2c3ff0700073ceb2f534d28bb1229e9a15836e7abfaeed3917062c7a59efd57714cba33ebc3789ff12e3eb" +
                    "07b22e329d",
                    {from: validatorsAccount[0]},
                ).should.be.eventually.rejectedWith(" Node does not exist for message sender.");
            });

            describe("when correct broadcasts sent", async () => {
                beforeEach(async () => {
                    await skaleDKG.broadcast(
                        web3.utils.soliditySha3("d2"),
                        0,
                        "0x273e5f3885bcab159ac16c92b8ba2201b4ddd70b0018934c7eb05bb4ee220b51292c3984fe1064ca5cc294d57" +
                        "d659678e59bd2793c46896ca4eefd4859ad54e22b74c02db4c36dd38aa7055f203d2606ef5717d223daf19261f7" +
                        "33bfb6284fed23119e351c8311026741ce8f76706ca8549b1315d593b0c12279610ebb8c883b296d1c41d64b3af" +
                        "10f4fcc52664fa6569d633de79dde8e444006f9dc79f0cd7a0e2622572d5ee49dc43b482bf4677b8240d84cbf90" +
                        "ad8f9bf3ba0772d0d6d125",
                        "0x3b3887c8dcf791e60ef9059cdfd995bf51d94539e12ba6b6db74fa2dfffd9b3e04676f95ebb7c791327e76d9f" +
                        "d4593a58168e4d70575765098daa7ef718a267f4c40818b692b699dccbf367955b8768a4d83aadccbadceb13fa8" +
                        "935ff6ea69a77d6f444d34ee21889387cee43e677cf14f7b794c147fddf768b56bfe0199db02f304349cbe97593" +
                        "3148beff2514cbe74c6b18bd7c4c06ad8a16d8fd929fd3c97915e8e50afe7f7e17e2d8c21b51ed0c4d20d5034c9" +
                        "0b0dd503ae2e24d343e07798cb",
                        {from: validatorsAccount[0]},
                    );

                    await skaleDKG.broadcast(
                        web3.utils.soliditySha3("d2"),
                        1,
                        "0x0e818c679fe3466268cdb28bb733d2fbe3e621afcd82b1ddf9917d982d98f28c162e1f3aea12108ebb2454ee8" +
                        "77035f302dfd9fe0ae9c136889e0344980a5ff31a3de20595414d229643c863f8965f0eb10e318ab72264cb990f" +
                        "a697b33e81612f7f03208a80e0d372382d573980fc93b0476ca18fd2a1a8fb7fddc2415a90c710992d958391f47" +
                        "51e2e83b9c5c94dc167569adeb103a8763e0bd48d7ee7e96a1782f5c97671cf87596e1b268d02e53953e88f12ee" +
                        "3065a6640542fc83683a07",
                        "0x4b4b4a92c3ac8bd145b6db7f79a42dbec968357c770231c711a5a76b726ceda6042be5a23ec05019b072aa624" +
                        "b9392e4345df4674a1f5e585979ea0b766dc163f4d200228a5d5e20f991b84416be191cd4a293ab86cf6ba84d40" +
                        "148736b4961a4fcbaa2f58cc65a5e2ca444e7a07d53feb88bfb64a6d75b7efe3b5bb554c6352f90408a2932c63f" +
                        "a446ce49b691f105b86ce2c3ff0700073ceb2f534d28bb1229e9a15836e7abfaeed3917062c7a59efd57714cba3" +
                        "3ebc3789ff12e3eb07b22e329d",
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

                it("should send alright from 1 node", async () => {
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
        });
    });
});
