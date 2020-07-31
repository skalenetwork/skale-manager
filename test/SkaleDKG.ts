import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerInstance,
         DelegationControllerInstance,
         KeyStorageInstance,
         NodesInstance,
         NodeRotationInstance,
         SchainsInternalInstance,
         SchainsInstance,
         SkaleDKGInstance,
         SkaleTokenInstance,
         SlashingTableInstance,
         ValidatorServiceInstance} from "../types/truffle-contracts";

import { skipTime, currentTime } from "./tools/time";

import BigNumber from "bignumber.js";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployDelegationController } from "./tools/deploy/delegation/delegationController";
import { deployKeyStorage } from "./tools/deploy/keyStorage";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployNodes } from "./tools/deploy/nodes";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { deploySchains } from "./tools/deploy/schains";
import { deploySkaleDKG } from "./tools/deploy/skaleDKG";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { deploySlashingTable } from "./tools/deploy/slashingTable";
import { deployNodeRotation } from "./tools/deploy/nodeRotation";

chai.should();
chai.use(chaiAsPromised);

contract("SkaleDKG", ([owner, validator1, validator2]) => {
    let contractManager: ContractManagerInstance;
    let keyStorage: KeyStorageInstance
    let schainsInternal: SchainsInternalInstance;
    let schains: SchainsInstance;
    let skaleDKG: SkaleDKGInstance;
    let skaleToken: SkaleTokenInstance;
    let validatorService: ValidatorServiceInstance;
    let slashingTable: SlashingTableInstance;
    let delegationController: DelegationControllerInstance;
    let nodes: NodesInstance;
    let nodeRotation: NodeRotationInstance;

    const failedDkgPenalty = 5;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        nodes = await deployNodes(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        schains = await deploySchains(contractManager);
        skaleDKG = await deploySkaleDKG(contractManager);
        keyStorage = await deployKeyStorage(contractManager);
        skaleToken = await deploySkaleToken(contractManager);
        validatorService = await deployValidatorService(contractManager);
        slashingTable = await deploySlashingTable(contractManager);
        delegationController = await deployDelegationController(contractManager);
        nodeRotation = await deployNodeRotation(contractManager);

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
            ["0x8f163316925bf2e12a30832dee812f6ff60bf872171a84d9091672dd3848be9f",
             "0xc0b7bd257fbb038019c41f055e81736d8116b83e9ac59a1407aa6ea804ec88a8"],
            ["0x307654b2716eb09f01f33115173867611d403424586357226515ae6a92774b10",
             "0xd168ab741e8f7650116d0677fddc1aea8dc86a00747e7224d2bf36e0ea3dd62c"]
        ];

        const secretNumbers = [
            "58625848706037406511582962295430965185674934704233043314647478422698817926283",
            "111405529669975789441427095287571197384937932095062249739044064944770017976403",
        ];

        const encryptedSecretKeyContributions = [
            [
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
            ],
            [
                {
                    share: "0xe371b8589b56d29e43ad703fa42666c02d0fb6144ec12962d2532560af3cc72e",
                    publicKey: [
                        "0x6b0a8bce07bd18f50e4c5b7ebe2f9e17a317b91c64926bf2d46a8f1ff58acbeb",
                        "0xa17652e16f18345856a148a2730a83760a181eb129e0c6059091ab11aa3fc5b8"
                    ]
                },
                {
                    share: "0x99b97875303f76ad5dcf51d300d152958e063d4099e564bcc9e33bd6d351b1bf",
                    publicKey: [
                        "0xe081fec066435a30e875ced147985c35ecba48407c550bad42fc652366d9731c",
                        "0x707f24d4865584868154798d727237aea2ad3c086c5f41b85d7eb697bb8fec5e"
                    ]
                }
            ]
        ];

        const badEncryptedSecretKeyContributions = [
            [
                {
                    share: "0x937c9c846a6fa7fd1984fe82e739ae37f444444444444444444441b6a12f232f",
                    publicKey: [
                        "0xfdf8101e91bd658fa1cea6fdd75adb8542951ce3d251cdaa78f43493dad730b5",
                        "0x9d32d24444444444444444444450ebe96994de860b6f6ebb7d0b4d4e6724b4c0"
                    ]
                },
                {
                    share: "0x7232f27fdfe521f3c7997dbb1c15452b7f196bd119d914444444444444444444",
                    publicKey: [
                        "0x086ff076abe442563ae9b8938d483ae581f4de2ee54298b3078289bbd85250c8",
                        "0xdf956450d32f671e4a4444444444444444444480a61465246bfd291e8dac3d78"
                    ]
                }
            ],
            [
                {
                    share: "0xe371b8589b56d29e43ad703fa42666c0244444444444444444444560af3cc72e",
                    publicKey: [
                        "0x6b0a8bce07bd18f50e4c5b7ebe2f9e17a317b91c64926bf2d46a8f1ff58acbeb",
                        "0xa17652444444444444444444440a83760a181eb129e0c6059091ab11aa3fc5b9"
                    ]
                },
                {
                    share: "0x99b97875303f76ad5dcf51d300d152958e063d4099e564444444444444444444",
                    publicKey: [
                        "0xe081fec066435a30e875ced147985c35ecba48407c550bad42fc652366d9731c",
                        "0x707f24d4865584868144444444444444444444086c5f41b85d7eb697bb8fec5f"
                    ]
                }
            ]
        ];

        const blsPublicKey = {
            x: {
                b: "19575648972062104039156457944800096485192277725771522457821135495599016919475",
                a: "10461414583903273397964170863293307257793164852201073648813106332646797608431"
            },
            y: {
                b: "9987791793343586452762678914063017437446978276276947139413192800155919071920",
                a: "14950268549909528666366175582391711509445871373604198590837458858258893860219"
            }
        }

        const verificationVectors = [
            [
                {
                    x: {
                        a: "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d",
                        b: "0x2695832627b9081e77da7a3fc4d574363bf051700055822f3d394dc3d9ff7417"
                    },
                    y: {
                        a: "0x24727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d",
                        b: "0x03a7a3e6f3b539dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "0x2b61d71274e46235006128f6383539fa58ccf40c832fb1e81f3554c20efecbe4",
                        b: "0x019708db3cb154aed20b0dba21505fac4e06593f353a8339fddaa21d2a43a5d9",
                    },
                    y: {
                        a: "0x1fed922c1955704caa85cdbcc7f33d24046362c635163e0e08bda8446c466994",
                        b: "0x24d9e95c8cfa056db786176b84f9f8657a9cc8044855d43f1f088a515ed02af7"
                    }
                }
            ]
        ];

        const multipliedShares = [
            {
                x: {
                    a: "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d",
                    b: "0x2695832627b9081e77da7a3fc4d574363bf051700055822f3d394dc3d9ff7417"
                },
                y: {
                    a: "0x24727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d",
                    b: "0x03a7a3e6f3b539dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a99"
                }
            },
            {
                x: {
                    a: "0x2b61d71274e46235006128f6383539fa58ccf40c832fb1e81f3554c20efecbe4",
                    b: "0x019708db3cb154aed20b0dba21505fac4e06593f353a8339fddaa21d2a43a5d9"
                },
                y: {
                    a: "0x1fed922c1955704caa85cdbcc7f33d24046362c635163e0e08bda8446c466994",
                    b: "0x24d9e95c8cfa056db786176b84f9f8657a9cc8044855d43f1f088a515ed02af7"
                }
            }
        ];

        const badMultipliedShares = [
            {
                x: {
                    a: "0x02c2b888a23187f22195eadadbc05847a00dc59c913d465dbc4dfac9cfab437d",
                    b: "0x2695832627b9081e77da7a3fc4d574363bf051700055822f3d394dc3d9ff7418"
                },
                y: {
                    a: "0x24727c45f9322be756fbec6514525cbbfa27ef1951d3fed10f483c23f921879d",
                    b: "0x03a7a3e6f3b539dad43c0eca46e3f889b2b2300815ffc4633e26e64406625a9b"
                }
            },
            {
                x: {
                    a: "0x2b61d71274e46235006128f6383539fa58ccf40c832fb1e81f3554c20efecbe4",
                    b: "0x019708db3cb154aed20b0dba21505fac4e06593f353a8339fddaa21d2a43a5da"
                },
                y: {
                    a: "0x1fed922c1955704caa85cdbcc7f33d24046362c635163e0e08bda8446c466994",
                    b: "0x24d9e95c8cfa056db786176b84f9f8657a9cc8044855d43f1f088a515ed02af9"
                }
            }
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
                        publicKey: validatorsPublicKey[index],
                        name: "d2" + hexIndex
                    });
            }
        });

        it("should create schain and open a DKG channel", async () => {
            const deposit = await schains.getSchainPrice(4, 5);

            await schains.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            assert((await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d2"))).should.be.true);
        });

        it("should create schain and reopen a DKG channel", async () => {
            const deposit = await schains.getSchainPrice(4, 5);

            await schains.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            assert((await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d2"))).should.be.true);
        });

        it("should create & delete schain and open & close a DKG channel", async () => {
            const deposit = await schains.getSchainPrice(4, 5);

            await schains.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            assert((await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d2"))).should.be.true);


            await schains.deleteSchainByRoot("d2");
            assert((await skaleDKG.isChannelOpened(web3.utils.soliditySha3("d2"))).should.be.false);
        });

        describe("when 2-node schain is created", async () => {
            beforeEach(async () => {
                const deposit = await schains.getSchainPrice(4, 5);

                await schains.addSchain(
                    validator1,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

                let nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d2"));
                schainName = "d2";
                while ((new BigNumber(nodesInGroup[0])).toFixed() === "1") {
                    await schains.deleteSchainByRoot(schainName);
                    await schains.addSchain(
                        validator1,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));
                    nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3(schainName));
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
                const res = await keyStorage.getBroadcastedData(web3.utils.soliditySha3(schainName), 0);

                encryptedSecretKeyContributions[indexes[0]].forEach( (keyShare, i) => {
                    keyShare.share.should.be.equal(res[0][i].share);
                    keyShare.publicKey[0].should.be.equal(res[0][i].publicKey[0]);
                    keyShare.publicKey[1].should.be.equal(res[0][i].publicKey[1]);
                });

                verificationVectors[indexes[0]].forEach((point, i) => {
                    ("0x" + ("00" + new BigNumber(res[1][i].x.a).toString(16)).slice(-2 * 32))
                        .should.be.equal(point.x.a);
                    ("0x" + ("00" + new BigNumber(res[1][i].x.b).toString(16)).slice(-2 * 32))
                        .should.be.equal(point.x.b);
                    ("0x" + ("00" + new BigNumber(res[1][i].y.a).toString(16)).slice(-2 * 32))
                        .should.be.equal(point.y.a);
                    ("0x" + ("00" + new BigNumber(res[1][i].y.b).toString(16)).slice(-2 * 32))
                        .should.be.equal(point.y.b);
                });
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

            it("should rejected early complaint after missing broadcast", async () => {
                let res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    {from: validatorsAccount[0]},
                );
                assert(res.should.be.true);
                const result = await skaleDKG.broadcast(
                    web3.utils.soliditySha3(schainName),
                    0,
                    verificationVectors[indexes[0]],
                    encryptedSecretKeyContributions[indexes[0]],
                    {from: validatorsAccount[0]},
                );
                res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    {from: validatorsAccount[0]},
                );
                assert(res.should.be.false);
                res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    1,
                    {from: validatorsAccount[1]},
                );
                assert(res.should.be.true);
                skipTime(web3, 1700);
                const resCompl = await skaleDKG.isComplaintPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    1,
                    {from: validatorsAccount[0]},
                );
                assert(resCompl.should.be.false);
                const resComplTx = await skaleDKG.complaint(
                    web3.utils.soliditySha3(schainName),
                    0,
                    1,
                    {from: validatorsAccount[0]},
                );
                assert.equal(resComplTx.logs[0].event, "ComplaintError");
                assert.equal(resComplTx.logs[0].args.error, "Complaint sent too early");
            });

            it("should send complaint after missing broadcast", async () => {
                let res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    {from: validatorsAccount[0]},
                );
                assert(res.should.be.true);
                const result = await skaleDKG.broadcast(
                    web3.utils.soliditySha3(schainName),
                    0,
                    verificationVectors[indexes[0]],
                    encryptedSecretKeyContributions[indexes[0]],
                    {from: validatorsAccount[0]},
                );
                res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    {from: validatorsAccount[0]},
                );
                assert(res.should.be.false);
                res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    1,
                    {from: validatorsAccount[1]},
                );
                assert(res.should.be.true);
                skipTime(web3, 1800);
                let resCompl = await skaleDKG.isComplaintPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    1,
                    {from: validatorsAccount[0]},
                );
                assert(resCompl.should.be.true);
                await skaleDKG.complaint(
                    web3.utils.soliditySha3(schainName),
                    0,
                    1,
                    {from: validatorsAccount[0]},
                );
                res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    1,
                    {from: validatorsAccount[1]},
                );
                assert(res.should.be.false);
                resCompl = await skaleDKG.isComplaintPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    1,
                    {from: validatorsAccount[0]},
                );
                assert(resCompl.should.be.false);
                res = await skaleDKG.isChannelOpened(
                    web3.utils.soliditySha3(schainName),
                    {from: validatorsAccount[1]},
                );
                assert(res.should.be.false);
            });

            it("should send complaint after missing alright", async () => {
                let res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    {from: validatorsAccount[0]},
                );
                assert(res.should.be.true);
                await skaleDKG.broadcast(
                    web3.utils.soliditySha3(schainName),
                    0,
                    verificationVectors[indexes[0]],
                    encryptedSecretKeyContributions[indexes[0]],
                    {from: validatorsAccount[0]},
                );
                res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    {from: validatorsAccount[0]},
                );
                assert(res.should.be.false);
                res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    1,
                    {from: validatorsAccount[1]},
                );
                assert(res.should.be.true);
                await skaleDKG.broadcast(
                    web3.utils.soliditySha3(schainName),
                    1,
                    verificationVectors[indexes[1]],
                    encryptedSecretKeyContributions[indexes[1]],
                    {from: validatorsAccount[1]},
                );
                res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    1,
                    {from: validatorsAccount[1]},
                );
                assert(res.should.be.false);

                let resAlr = await skaleDKG.isAlrightPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    {from: validatorsAccount[0]},
                );
                assert(resAlr.should.be.true);
                const result = await skaleDKG.alright(
                    web3.utils.soliditySha3(schainName),
                    0,
                    {from: validatorsAccount[0]},
                );
                resAlr = await skaleDKG.isAlrightPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    {from: validatorsAccount[0]},
                );
                assert(resAlr.should.be.false);
                resAlr = await skaleDKG.isAlrightPossible(
                    web3.utils.soliditySha3(schainName),
                    1,
                    {from: validatorsAccount[1]},
                );
                assert(resAlr.should.be.true);
                skipTime(web3, 1800);
                let resCompl = await skaleDKG.isComplaintPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    1,
                    {from: validatorsAccount[0]},
                );
                assert(resCompl.should.be.true);
                await skaleDKG.complaint(
                    web3.utils.soliditySha3(schainName),
                    0,
                    1,
                    {from: validatorsAccount[0]},
                );
                res = await skaleDKG.isAlrightPossible(
                    web3.utils.soliditySha3(schainName),
                    1,
                    {from: validatorsAccount[1]},
                );
                assert(res.should.be.false);
                resCompl = await skaleDKG.isComplaintPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    1,
                    {from: validatorsAccount[0]},
                );
                assert(resCompl.should.be.false);
                res = await skaleDKG.isChannelOpened(
                    web3.utils.soliditySha3(schainName),
                    {from: validatorsAccount[1]},
                );
                assert(res.should.be.false);
            });

            describe("after sending complaint after missing broadcast", async () => {
                beforeEach(async () => {
                    await skaleDKG.broadcast(
                        web3.utils.soliditySha3(schainName),
                        0,
                        verificationVectors[indexes[0]],
                        encryptedSecretKeyContributions[indexes[0]],
                        {from: validatorsAccount[0]},
                    );
                    skipTime(web3, 1800);
                    await skaleDKG.complaint(
                        web3.utils.soliditySha3(schainName),
                        0,
                        1,
                        {from: validatorsAccount[0]},
                    );
                });

                it("channel should be closed", async () => {
                    const res = await skaleDKG.isChannelOpened(
                        web3.utils.soliditySha3(schainName),
                        {from: validatorsAccount[1]},
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send broadcast", async () => {
                    const res = await skaleDKG.isBroadcastPossible(
                        web3.utils.soliditySha3(schainName),
                        1,
                        {from: validatorsAccount[1]},
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send complaint", async () => {
                    const res = await skaleDKG.isComplaintPossible(
                        web3.utils.soliditySha3(schainName),
                        0,
                        1,
                        {from: validatorsAccount[0]},
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send another complaint", async () => {
                    const res = await skaleDKG.isComplaintPossible(
                        web3.utils.soliditySha3(schainName),
                        1,
                        0,
                        {from: validatorsAccount[1]},
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send response", async () => {
                    const res = await skaleDKG.isResponsePossible(
                        web3.utils.soliditySha3(schainName),
                        0,
                        {from: validatorsAccount[0]},
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send another response", async () => {
                    const res = await skaleDKG.isResponsePossible(
                        web3.utils.soliditySha3(schainName),
                        1,
                        {from: validatorsAccount[1]},
                    );
                    assert(res.should.be.false);
                });
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

                it("should calculate BLS public key ", async () => {
                    await skaleDKG.alright(web3.utils.soliditySha3(schainName), 0, {from: validatorsAccount[0]});
                    const result = await skaleDKG.alright(
                        web3.utils.soliditySha3(schainName),
                        1,
                        {from: validatorsAccount[1]},
                    );
                    assert.equal(result.logs[1].event, "SuccessfulDKG");
                    assert.equal(result.logs[1].args.groupIndex, web3.utils.soliditySha3(schainName));
                    const key1 = await keyStorage.getBLSPublicKey(web3.utils.soliditySha3(schainName), 0);
                    const key2 = await keyStorage.getBLSPublicKey(web3.utils.soliditySha3(schainName), 1);
                    assert.equal(key1.x.a.toString(), blsPublicKey.x.a);
                    assert.equal(key1.x.b.toString(), blsPublicKey.x.b);
                    assert.equal(key1.y.a.toString(), blsPublicKey.y.a);
                    assert.equal(key1.y.b.toString(), blsPublicKey.y.b);
                    assert.equal(key2.x.a.toString(), blsPublicKey.x.a);
                    assert.equal(key2.x.b.toString(), blsPublicKey.x.b);
                    assert.equal(key2.y.a.toString(), blsPublicKey.y.a);
                    assert.equal(key2.y.b.toString(), blsPublicKey.y.b);
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

                it("should not send 2 complaints from 1 node", async () => {
                    await skaleDKG.complaint(
                        web3.utils.soliditySha3(schainName),
                        1,
                        0,
                        {from: validatorsAccount[1]},
                    );
                    const resCompl = await skaleDKG.isComplaintPossible(
                        web3.utils.soliditySha3(schainName),
                        0,
                        1,
                        {from: validatorsAccount[0]},
                    );
                    assert(resCompl.should.be.false);
                    const res = await skaleDKG.complaint(
                        web3.utils.soliditySha3(schainName),
                        0,
                        1,
                        {from: validatorsAccount[0]},
                    );
                    assert.equal(res.logs[0].event, "ComplaintError");
                    assert.equal(res.logs[0].args.error, "One complaint is already sent");
                });

                it("should not send 2 complaints from 2 node", async () => {
                    await skaleDKG.complaint(
                        web3.utils.soliditySha3(schainName),
                        1,
                        0,
                        {from: validatorsAccount[1]},
                    );
                    const res = await skaleDKG.complaint(
                        web3.utils.soliditySha3(schainName),
                        1,
                        0,
                        {from: validatorsAccount[1]},
                    );
                    assert.equal(res.logs[0].event, "ComplaintError");
                    assert.equal(res.logs[0].args.error, "The same complaint rejected");
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
                        await nodes.createNode(validatorsAccount[0],
                            {
                                port: 8545,
                                nonce: 0,
                                ip: "0x7f000002",
                                publicIp: "0x7f000002",
                                publicKey: validatorsPublicKey[0],
                                name: "d202"
                        });
                        const result = await skaleDKG.response(
                            web3.utils.soliditySha3(schainName),
                            0,
                            secretNumbers[indexes[0]],
                            multipliedShares[indexes[0]],
                            {from: validatorsAccount[0]},
                        );
                        const leavingTimeOfNode = new BigNumber(
                            (await nodeRotation.getLeavingHistory(0))[0].finishedRotation
                        ).toNumber();
                        assert.equal(await currentTime(web3), leavingTimeOfNode);
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
                            multipliedShares[indexes[1]],
                            {from: validatorsAccount[0]},
                        );
                        assert.equal(result.logs[0].event, "BadGuy");
                        assert.equal(result.logs[0].args.nodeIndex.toString(), "0");
                        assert.equal(result.logs.length, 3);

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
            const deposit = await schains.getSchainPrice(4, 5);

            await schains.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            let nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("d2"));
            schainName = "d2";
            while ((new BigNumber(nodesInGroup[0])).toFixed() === "1") {
                await schains.deleteSchainByRoot(schainName);
                await schains.addSchain(
                    validator1,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));
                nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3(schainName));
            }

            let rotCounter = await nodeRotation.getRotation(web3.utils.soliditySha3("d2"));
            assert.equal(rotCounter.rotationCounter.toString(), "0");

            await nodes.createNode(validatorsAccount[0],
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000003",
                    publicIp: "0x7f000003",
                    publicKey: validatorsPublicKey[0],
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

            const result = await skaleDKG.response(
                web3.utils.soliditySha3(schainName),
                0,
                secretNumbers[indexes[0]],
                multipliedShares[indexes[1]],
                {from: validatorsAccount[0]},
            );
            assert.equal(result.logs[0].event, "BadGuy");
            assert.equal(result.logs[0].args.nodeIndex.toString(), "0");

            assert.equal(result.logs[2].event, "ChannelOpened");
            assert.equal(result.logs[2].args.groupIndex, web3.utils.soliditySha3(schainName));
            const blockNumber = result.receipt.blockNumber;
            const timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

            assert.equal((await skaleDKG.getNumberOfBroadcasted(web3.utils.soliditySha3(schainName))).toString(), "0");
            assert.equal((await skaleDKG.getChannelStartedTime(web3.utils.soliditySha3(schainName))).toString(), timestamp.toString());

            rotCounter = await nodeRotation.getRotation(web3.utils.soliditySha3("d2"));
            assert.equal(rotCounter.rotationCounter.toString(), "1");

            let res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    2,
                    {from: validatorsAccount[0]},
                );

            assert.equal(res, true);

            const broadcastedDataFrom2 = await keyStorage.getBroadcastedData(web3.utils.soliditySha3(schainName), 2);
            assert(broadcastedDataFrom2[0].length.toString(), "0");
            assert(broadcastedDataFrom2[1].length.toString(), "0");

            await skaleDKG.broadcast(
                web3.utils.soliditySha3(schainName),
                2,
                verificationVectors[indexes[0]],
                // the last symbol is spoiled in parameter below
                badEncryptedSecretKeyContributions[indexes[0]],
                {from: validatorsAccount[0]},
            );

            res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    1,
                    {from: validatorsAccount[1]},
                );
            assert.equal(res, true);

            const broadcastedDataFrom1 = await keyStorage.getBroadcastedData(web3.utils.soliditySha3(schainName), 1);
            assert(broadcastedDataFrom1[0].length.toString(), "0");
            assert(broadcastedDataFrom1[1].length.toString(), "0");

            await skaleDKG.broadcast(
                web3.utils.soliditySha3(schainName),
                1,
                verificationVectors[indexes[1]],
                encryptedSecretKeyContributions[indexes[1]],
                {from: validatorsAccount[1]},
            );

            res = await skaleDKG.isAlrightPossible(
                        web3.utils.soliditySha3(schainName),
                        2,
                        {from: validatorsAccount[0]},
                    );
            assert.equal(res, true);

            await skaleDKG.alright(
                        web3.utils.soliditySha3(schainName),
                        2,
                        {from: validatorsAccount[0]},
                    );

            res = await skaleDKG.isAlrightPossible(
                        web3.utils.soliditySha3(schainName),
                        1,
                        {from: validatorsAccount[1]},
                    );
            assert.equal(res, true);

            await skaleDKG.alright(
                        web3.utils.soliditySha3(schainName),
                        1,
                        {from: validatorsAccount[1]},
                    );
        });

        it("16 nodes schain test", async () => {

            for (let i = 3; i <= 16; i++) {
                const hexIndex = ("0" + i.toString(16)).slice(-2);
                await nodes.createNode(validatorsAccount[0],
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: validatorsPublicKey[0],
                        name: "d2" + hexIndex
                    });
            }

            const deposit = await schains.getSchainPrice(3, 5);

            await schains.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 3, 0, "New16NodeSchain"]));

            const secretKeyContributions = [];
            for (let i = 0; i < 16; i++) {
                secretKeyContributions[i] = encryptedSecretKeyContributions[0][0];
            }

            const verificationVectorNew = [];
            for (let i = 0; i < 11; i++) {
                verificationVectorNew[i] = verificationVectors[i % 2][0];
            }

            for (let i = 0; i < 16; i++) {
                let broadData = await keyStorage.getBroadcastedData(web3.utils.soliditySha3("New16NodeSchain"), i);
                assert(broadData[0].length.toString(), "0");
                assert(broadData[1].length.toString(), "0");
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                let broadPoss = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3("New16NodeSchain"),
                    i,
                    {from: validatorsAccount[index]},
                );
                assert.equal(broadPoss, true);
                await skaleDKG.broadcast(
                    web3.utils.soliditySha3("New16NodeSchain"),
                    i,
                    verificationVectorNew,
                    secretKeyContributions,
                    {from: validatorsAccount[index]},
                );
                broadData = await keyStorage.getBroadcastedData(web3.utils.soliditySha3("New16NodeSchain"), i);
                // console.log(broadData[0]);
                secretKeyContributions.forEach( (keyShare, j) => {
                    // console.log(keyShare);
                    // console.log(broadData[0][j]);
                    keyShare.share.should.be.equal(broadData[0][j].share);
                    keyShare.publicKey[0].should.be.equal(broadData[0][j].publicKey[0]);
                    keyShare.publicKey[1].should.be.equal(broadData[0][j].publicKey[1]);
                });
                verificationVectorNew.forEach( (verVec, j) => {
                    let data = BigInt(broadData[1][j].x.a).toString(16);
                    if (data.length % 2) {
                        data = "0" + data;
                    }
                    data = "0x" + data;
                    verVec.x.a.should.be.equal(data);
                    data = BigInt(broadData[1][j].x.b).toString(16);
                    if (data.length % 2) {
                        data = "0" + data;
                    }
                    data = "0x" + data;
                    verVec.x.b.should.be.equal(data);
                    data = BigInt(broadData[1][j].y.a).toString(16);
                    if (data.length % 2) {
                        data = "0" + data;
                    }
                    data = "0x" + data;
                    verVec.y.a.should.be.equal(data);
                    data = BigInt(broadData[1][j].y.b).toString(16);
                    if (data.length % 2) {
                        data = "0" + data;
                    }
                    data = "0x" + data;
                    verVec.y.b.should.be.equal(data);
                });
                broadPoss = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3("New16NodeSchain"),
                    i,
                    {from: validatorsAccount[index]},
                );
                assert.equal(broadPoss, false);
            }
            let comPubKey;
            for (let i = 0; i < 16; i++) {
                comPubKey = await keyStorage.getCommonPublicKey(web3.utils.soliditySha3("New16NodeSchain"));
                assert(comPubKey.x.a, "0");
                assert(comPubKey.x.b, "0");
                assert(comPubKey.y.a, "0");
                assert(comPubKey.y.b, "0");
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                let alrightPoss = await skaleDKG.isAlrightPossible(
                    web3.utils.soliditySha3("New16NodeSchain"),
                    i,
                    {from: validatorsAccount[index]},
                );
                assert.equal(alrightPoss, true);
                await skaleDKG.alright(
                    web3.utils.soliditySha3("New16NodeSchain"),
                    i,
                    {from: validatorsAccount[index]},
                );
                alrightPoss = await skaleDKG.isAlrightPossible(
                    web3.utils.soliditySha3("New16NodeSchain"),
                    i,
                    {from: validatorsAccount[index]},
                );
                assert.equal(alrightPoss, false);
            }

            comPubKey = await keyStorage.getCommonPublicKey(web3.utils.soliditySha3("New16NodeSchain"));
            assert.equal(comPubKey.x.a.toString() !== "0", true);
            assert.equal(comPubKey.x.b.toString() !== "0", true);
            assert.equal(comPubKey.y.a.toString() !== "0", true);
            assert.equal(comPubKey.y.b.toString() !== "0", true);

        });

        // it("16 nodes schain test with incorrect complaint and response", async () => {

        //     for (let i = 3; i <= 16; i++) {
        //         const hexIndex = ("0" + i.toString(16)).slice(-2);
        //         await nodes.createNode(validatorsAccount[0],
        //             {
        //                 port: 8545,
        //                 nonce: 0,
        //                 ip: "0x7f0000" + hexIndex,
        //                 publicIp: "0x7f0000" + hexIndex,
        //                 publicKey: validatorsPublicKey[0],
        //                 name: "d2" + hexIndex
        //             });
        //     }

        //     const deposit = await schains.getSchainPrice(3, 5);

        //     await schains.addSchain(
        //         validator1,
        //         deposit,
        //         web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 3, 0, "New16NodeSchain"]));

        //     await nodes.createNode(validatorsAccount[0],
        //         {
        //             port: 8545,
        //             nonce: 0,
        //             ip: "0x7f0000ff",
        //             publicIp: "0x7f0000ff",
        //             publicKey: validatorsPublicKey[0],
        //             name: "d2ff"
        //         });

        //     const secretKeyContributions = [];
        //     for (let i = 0; i < 16; i++) {
        //         secretKeyContributions[i] = encryptedSecretKeyContributions[0][0];
        //     }

        //     const verificationVectorNew = [];
        //     for (let i = 0; i < 11; i++) {
        //         verificationVectorNew[i] = verificationVectors[i % 2][0];
        //     }

        //     // console.log(secretKeyContributions, verificationVectorNew);

        //     for (let i = 0; i < 16; i++) {
        //         const broadData = await keyStorage.getBroadcastedData(web3.utils.soliditySha3("New16NodeSchain"), i);
        //         assert(broadData[0].length.toString(), "0");
        //         assert(broadData[1].length.toString(), "0");
        //         let index = 0;
        //         if (i === 1) {
        //             index = 1;
        //         }
        //         const broadPoss = await skaleDKG.isBroadcastPossible(
        //             web3.utils.soliditySha3("New16NodeSchain"),
        //             i,
        //             {from: validatorsAccount[index]},
        //         );
        //         assert.equal(broadPoss, true);
        //         await skaleDKG.broadcast(
        //             web3.utils.soliditySha3("New16NodeSchain"),
        //             i,
        //             verificationVectorNew,
        //             secretKeyContributions,
        //             {from: validatorsAccount[index]},
        //         );
        //     }
        //     const nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("New16NodeSchain"));
        //     const accusedNode = nodesInGroup[14].toString();
        //     let complaintNode = "7";
        //     let indexToSend = 0;
        //     if (accusedNode === "1") {
        //         indexToSend = 1;
        //     }
        //     if (accusedNode === "7") {
        //         complaintNode = "9";
        //     }
        //     await skaleDKG.complaint(
        //         web3.utils.soliditySha3("New16NodeSchain"),
        //         complaintNode,
        //         accusedNode,
        //         {from: validatorsAccount[0]}
        //     );
        //     const resResp = await skaleDKG.response(
        //         web3.utils.soliditySha3("New16NodeSchain"),
        //         accusedNode,
        //         secretNumbers[indexes[indexToSend]],
        //         multipliedShares[indexes[indexToSend]],
        //         {from: validatorsAccount[indexToSend], gas: 12500000},
        //     );
        //     assert.equal(resResp.logs[0].event, "BadGuy");
        //     assert.equal(resResp.logs[0].args.nodeIndex.toString(), accusedNode);
        //     assert.isAtMost(resResp.receipt.gasUsed, 10000000);
        //     console.log("Response gas usage", resResp.receipt.gasUsed);
        // });

        // describe("should send response from each node in schain without new node", async () => {

        //     beforeEach(async () => {
        //         for (let i = 3; i <= 16; i++) {
        //             const hexIndex = ("0" + i.toString(16)).slice(-2);
        //             await nodes.createNode(validatorsAccount[0],
        //                 {
        //                     port: 8545,
        //                     nonce: 0,
        //                     ip: "0x7f0000" + hexIndex,
        //                     publicIp: "0x7f0000" + hexIndex,
        //                     publicKey: validatorsPublicKey[0],
        //                     name: "d2" + hexIndex
        //                 });
        //         }

        //         const deposit = await schains.getSchainPrice(3, 5);

        //         await schains.addSchain(
        //             validator1,
        //             deposit,
        //             web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 3, 0, "New16NodeSchain"]));

        //         const secretKeyContributions = [];
        //         for (let i = 0; i < 16; i++) {
        //             secretKeyContributions[i] = encryptedSecretKeyContributions[0][0];
        //         }

        //         const verificationVectorNew = [];
        //         for (let i = 0; i < 11; i++) {
        //             verificationVectorNew[i] = verificationVectors[i % 2][0];
        //         }

        //         for (let i = 0; i < 16; i++) {
        //             let index = 0;
        //             if (i === 1) {
        //                 index = 1;
        //             }
        //             await skaleDKG.broadcast(
        //                 web3.utils.soliditySha3("New16NodeSchain"),
        //                 i,
        //                 verificationVectorNew,
        //                 secretKeyContributions,
        //                 {from: validatorsAccount[index]},
        //             );
        //         }
        //     });

        //     for (let index = 0; index <= 15; index++) {
        //         it("should run response for " + index + " node in schain", async () => {
        //             const nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("New16NodeSchain"));
        //             const accusedNode = nodesInGroup[index].toString();
        //             let complaintNode = "7";
        //             let indexToSend = 0;
        //             if (accusedNode === "1") {
        //                 indexToSend = 1;
        //             }
        //             if (accusedNode === "7") {
        //                 complaintNode = "9";
        //             }
        //             await skaleDKG.complaint(
        //                 web3.utils.soliditySha3("New16NodeSchain"),
        //                 complaintNode,
        //                 accusedNode,
        //                 {from: validatorsAccount[0]}
        //             );
        //             const resResp = await skaleDKG.response(
        //                 web3.utils.soliditySha3("New16NodeSchain"),
        //                 accusedNode,
        //                 secretNumbers[indexes[indexToSend]],
        //                 multipliedShares[indexes[indexToSend]],
        //                 {from: validatorsAccount[indexToSend], gas: 12500000},
        //             );
        //             assert.equal(resResp.logs[0].event, "BadGuy");
        //             assert.equal(resResp.logs[0].args.nodeIndex.toString(), accusedNode);
        //             console.log("\n Response from " + index + " node gas usage without new node", resResp.receipt.gasUsed);
        //         });
        //     }

        // });

        // describe("should send response from each node in schain with new node", async () => {

        //     beforeEach(async () => {
        //         for (let i = 3; i <= 16; i++) {
        //             const hexIndex = ("0" + i.toString(16)).slice(-2);
        //             await nodes.createNode(validatorsAccount[0],
        //                 {
        //                     port: 8545,
        //                     nonce: 0,
        //                     ip: "0x7f0000" + hexIndex,
        //                     publicIp: "0x7f0000" + hexIndex,
        //                     publicKey: validatorsPublicKey[0],
        //                     name: "d2" + hexIndex
        //                 });
        //         }

        //         const deposit = await schains.getSchainPrice(3, 5);

        //         await schains.addSchain(
        //             validator1,
        //             deposit,
        //             web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 3, 0, "New16NodeSchain"]));

        //         await nodes.createNode(validatorsAccount[0],
        //             {
        //                 port: 8545,
        //                 nonce: 0,
        //                 ip: "0x7f0000ff",
        //                 publicIp: "0x7f0000ff",
        //                 publicKey: validatorsPublicKey[0],
        //                 name: "d2ff"
        //             });

        //         const secretKeyContributions = [];
        //         for (let i = 0; i < 16; i++) {
        //             secretKeyContributions[i] = encryptedSecretKeyContributions[0][0];
        //         }

        //         const verificationVectorNew = [];
        //         for (let i = 0; i < 11; i++) {
        //             verificationVectorNew[i] = verificationVectors[i % 2][0];
        //         }

        //         for (let i = 0; i < 16; i++) {
        //             let index = 0;
        //             if (i === 1) {
        //                 index = 1;
        //             }
        //             await skaleDKG.broadcast(
        //                 web3.utils.soliditySha3("New16NodeSchain"),
        //                 i,
        //                 verificationVectorNew,
        //                 secretKeyContributions,
        //                 {from: validatorsAccount[index]},
        //             );
        //         }
        //     });

        //     for (let index = 0; index <= 15; index++) {
        //         it("should run response for " + index + " node in schain", async () => {
        //             const nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3("New16NodeSchain"));
        //             const accusedNode = nodesInGroup[index].toString();
        //             let complaintNode = "7";
        //             let indexToSend = 0;
        //             if (accusedNode === "1") {
        //                 indexToSend = 1;
        //             }
        //             if (accusedNode === "7") {
        //                 complaintNode = "9";
        //             }
        //             await skaleDKG.complaint(
        //                 web3.utils.soliditySha3("New16NodeSchain"),
        //                 complaintNode,
        //                 accusedNode,
        //                 {from: validatorsAccount[0]}
        //             );
        //             const resResp = await skaleDKG.response(
        //                 web3.utils.soliditySha3("New16NodeSchain"),
        //                 accusedNode,
        //                 secretNumbers[indexes[indexToSend]],
        //                 multipliedShares[indexes[indexToSend]],
        //                 {from: validatorsAccount[indexToSend], gas: 12500000},
        //             );
        //             assert.equal(resResp.logs[0].event, "BadGuy");
        //             assert.equal(resResp.logs[0].args.nodeIndex.toString(), accusedNode);
        //             console.log("\n Response from " + index + " node gas usage with new node", resResp.receipt.gasUsed);
        //         });
        //     }

        // });

        it("should take correct BLS keys for 2 nodes schain", async () => {
            const verVecFor2 = [
                [
                    {
                        x: {
                            a: "17492274578600355891194795946925275177566546281080621460897407165524669389171",
                            b: "12212127475052171902089797237561688847122922498668927197636222775103092168023"
                        },
                        y: {
                            a: "7563883894682747393966302272534974125855153908848630024241020696067482762303",
                            b: "21477418340153886229578812265388825603091448074970196711471309017002269602287"
                        }
                    }
                ],
                [
                    {
                        x: {
                            a: "19455570214703536349873314107316760340340963939395022399518285340062114550390",
                            b: "14077696141948256850006511616401411034604223866033133087438617061095163573909"
                        },
                        y: {
                            a: "15095601243921248983283757213564324442809599865416053171896217043326580196972",
                            b: "8771921477598314549280859157092178327203491786593224370775000175883868151292"
                        }
                    }
                ]
            ];

            const numberOfNodes = 2;

            const newSchainName = "New2NodeSchain";

            const deposit = await schains.getSchainPrice(4, 5);

            await schains.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, newSchainName])
            );

            const secretKeyContributions = [];
            for (let i = 0; i < numberOfNodes; i++) {
                secretKeyContributions[i] = encryptedSecretKeyContributions[0][0];
            }

            for (let i = 0; i < numberOfNodes; i++) {
                let broadData = await keyStorage.getBroadcastedData(web3.utils.soliditySha3(newSchainName), i);
                assert(broadData[0].length.toString(), "0");
                assert(broadData[1].length.toString(), "0");
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                let broadPoss = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(newSchainName),
                    i,
                    {from: validatorsAccount[index]},
                );
                assert.equal(broadPoss, true);
                await skaleDKG.broadcast(
                    web3.utils.soliditySha3(newSchainName),
                    i,
                    verVecFor2[i],
                    secretKeyContributions,
                    {from: validatorsAccount[index]},
                );
                broadData = await keyStorage.getBroadcastedData(web3.utils.soliditySha3(newSchainName), i);
                secretKeyContributions.forEach( (keyShare, j) => {
                    keyShare.share.should.be.equal(broadData[0][j].share);
                    keyShare.publicKey[0].should.be.equal(broadData[0][j].publicKey[0]);
                    keyShare.publicKey[1].should.be.equal(broadData[0][j].publicKey[1]);
                });
                verVecFor2[i].forEach( (verVec, j) => {
                    let data = broadData[1][j].x.a;
                    verVec.x.a.should.be.equal(data);
                    data = broadData[1][j].x.b;
                    verVec.x.b.should.be.equal(data);
                    data = broadData[1][j].y.a;
                    verVec.y.a.should.be.equal(data);
                    data = broadData[1][j].y.b;
                    verVec.y.b.should.be.equal(data);
                });
                broadPoss = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(newSchainName),
                    i,
                    {from: validatorsAccount[index]},
                );
                assert.equal(broadPoss, false);
            }

            const newBlsPublicKeys = [
                {
                    x: {
                        b: "18455786117839290870216657486894354645699077803371423779775674796205715318648",
                        a: "13631323048911964288262361757410368439401555203002045920531660027969376821938"
                    },
                    y: {
                        b: "17088109708771381822666387486951400483339875687685316682796862170009987241589",
                        a: "3092240288814317936282030765595713590845693394143253669109889732548463631463"
                    }
                },
                {
                    x: {
                        b: "18455786117839290870216657486894354645699077803371423779775674796205715318648",
                        a: "13631323048911964288262361757410368439401555203002045920531660027969376821938"
                    },
                    y: {
                        b: "17088109708771381822666387486951400483339875687685316682796862170009987241589",
                        a: "3092240288814317936282030765595713590845693394143253669109889732548463631463"
                    }
                }
            ]

            const key1 = await keyStorage.getBLSPublicKey(web3.utils.soliditySha3(newSchainName), 0);
            const key2 = await keyStorage.getBLSPublicKey(web3.utils.soliditySha3(newSchainName), 1);

            assert.equal(key1.x.a.toString(), newBlsPublicKeys[0].x.a);
            assert.equal(key1.x.b.toString(), newBlsPublicKeys[0].x.b);
            assert.equal(key1.y.a.toString(), newBlsPublicKeys[0].y.a);
            assert.equal(key1.y.b.toString(), newBlsPublicKeys[0].y.b);

            assert.equal(key2.x.a.toString(), newBlsPublicKeys[1].x.a);
            assert.equal(key2.x.b.toString(), newBlsPublicKeys[1].x.b);
            assert.equal(key2.y.a.toString(), newBlsPublicKeys[1].y.a);
            assert.equal(key2.y.b.toString(), newBlsPublicKeys[1].y.b);
        });

        it("should take correct BLS keys for 4 nodes schain", async () => {
            const verVecFor2 = [
                [
                    {
                        x: {
                            b: "10996849449472664113258166654358981611063715412769867689333640851839600671795",
                            a: "6140745957435307466367119250574494313258606722381197819912939903986800208659"
                        },
                        y: {
                            b: "3868838242238849187209048933611695499246526600194206120203659151441003700920",
                            a: "16801142824839188507823943809801668392172826755438778176388140206421554775280"
                        }
                    },
                    {
                        x: {
                            b: "13932500164725749864232999322119562257250975835810511649314245998181420269026",
                            a: "18003005259832180834926474312079432853197828626088427700176708815092914639396"
                        },
                        y: {
                            b: "5881383498900881428476489484803261117032276137928607985305173737698968235273",
                            a: "8739194471739000716884710379004648005292498802722286635794778526124258694425"
                        }
                    },
                    {
                        x: {
                            b: "13989328731008510536902496465869294788224123469011435740143811025345800554092",
                            a: "19980588300811401185281646480530171168216833173352819617467506058861278953808"
                        },
                        y: {
                            b: "7886345675958970512545111505763905336490737813723552503060086497621848931257",
                            a: "14867367514048446324063031378253498769786154521318329739792458056307051999134"
                        }
                    }
                ],
                // 2 node
                [
                    {
                        x: {
                            b: "551963522314523275528227649663033589167494227615738653591910817541007342444",
                            a: "16762202699341327146754445254409930824140070965806274267547086433093855042740"
                        },
                        y: {
                            b: "2005676154603268819688232845891809597213296061146269237247996396907835890978",
                            a: "13634776438847528677663533615212786579305567879155453153793066345779573493225"
                        }
                    },
                    {
                        x: {
                            b: "7669277945580106853500329886148968026767412839365912461655186022448880065147",
                            a: "17597078597944349916823086176304000881142876799476306217836648780820830533813"
                        },
                        y: {
                            b: "7722442156811568450277333977674546467968382867359355281734651789317761984037",
                            a: "18298977142812505702918672364540840739545917007633022360660778385293205190810"
                        }
                    },
                    {
                        x: {
                            b: "6909765333213713528262128948237751680678220774640526829571911834464192003363",
                            a: "17844410198928768940101964446302198881103832941131336982536172692160985800000"
                        },
                        y: {
                            b: "5508425012931026983435470901308067755247348582319786547493241261883641173430",
                            a: "20063316588843511199646076587438466601815101355998374029096987069349304193079"
                        }
                    }
                ],
                // 3 node
                [
                    {
                        x: {
                            b: "19232331178670754445667296756597922812400761809747150897168094837479454679487",
                            a: "7478399315331222397227885418231031417246590321799093473436982977942954162639"
                        },
                        y: {
                            b: "21619393068500662314385046625852031600663459430921726173489242059818797604587",
                            a: "15323844542536139563876512047591650326501198284387977709436215791905556787218"
                        }
                    },
                    {
                        x: {
                            b: "12129790409528211991026390001548117777892890113870338082099179986572890811765",
                            a: "6379182619431838825635194097773773843053394070726395628116044910734273558992"
                        },
                        y: {
                            b: "8625290259041806495080775268511515644448771538824795701250505428814550717838",
                            a: "17078294413987139383293716278124134106797248121342672587624110182126733484673"
                        }
                    },
                    {
                        x: {
                            b: "13651064748196748325906967763214999493446097651122033645914886302309715325625",
                            a: "6799458325917281945858001049708608337146289011124046303772098804700194179953"
                        },
                        y: {
                            b: "10248022647101093529495887695672463885862231969015233535737877624534391387151",
                            a: "11425016784701423024398235876036051964632195809321049869081255662624859636713"
                        }
                    }
                ],
                // 4 node
                [
                    {
                        x: {
                            b: "1590216119087495148066966288018500792298079534170100009740438105738250960390",
                            a: "10630856489361155574525767912391714053993415561204890521292399562559793094148"
                        },
                        y: {
                            b: "12240543384010321180266688117258685696095657105295584780113329700752323580912",
                            a: "13585235493818491560737283392200882323234422403104012128938991272661426578488"
                        }
                    },
                    {
                        x: {
                            b: "20783105372769303773744556257284776921079244721017798973956690638476239861660",
                            a: "19350907986237379246044309553988991414489904361096301724100440254966538661709"
                        },
                        y: {
                            b: "4259281803896824558624335966045860325161825961394154378642233642790692301383",
                            a: "11416231470223440150891044946991032165580685055501774177062516576136298171577"
                        }
                    },
                    {
                        x: {
                            b: "2228051830667587495662830828307765783410318310071081346794910933769602653334",
                            a: "7245192930757422196720922597945866703957767516104397729678743405854757364809"
                        },
                        y: {
                            b: "9666440475527143220446634201405463845248561607345593371803104402784775710771",
                            a: "21302406496717116889657303869339721229642857349368727053159398370015027562144"
                        }
                    }
                ]
            ];

            const numberOfNodes = 4;

            const newSchainName = "New4NodeSchain";

            for (let i = 3; i <= numberOfNodes; i++) {
                const hexIndex = ("0" + i.toString(16)).slice(-2);
                await nodes.createNode(validatorsAccount[0],
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: validatorsPublicKey[0],
                        name: "d2" + hexIndex
                    }
                );
            }
            const deposit = await schains.getSchainPrice(5, 5);

            await schains.addSchain(
                validator1,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 5, 0, newSchainName])
            );

            const nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3(newSchainName));

            const secretKeyContributions = [];
            for (let i = 0; i < numberOfNodes; i++) {
                secretKeyContributions[i] = encryptedSecretKeyContributions[0][0];
            }

            for (let i = 0; i < numberOfNodes; i++) {
                const nodeIndex = nodesInGroup[i].toString();
                let broadData = await keyStorage.getBroadcastedData(web3.utils.soliditySha3(newSchainName), nodeIndex);
                assert(broadData[0].length.toString(), "0");
                assert(broadData[1].length.toString(), "0");
                let index = 0;
                if (nodeIndex === "1") {
                    index = 1;
                }
                let broadPoss = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(newSchainName),
                    nodeIndex,
                    {from: validatorsAccount[index]},
                );
                assert.equal(broadPoss, true);
                await skaleDKG.broadcast(
                    web3.utils.soliditySha3(newSchainName),
                    nodeIndex,
                    verVecFor2[i],
                    secretKeyContributions,
                    {from: validatorsAccount[index]},
                );
                broadData = await keyStorage.getBroadcastedData(web3.utils.soliditySha3(newSchainName), nodeIndex);
                secretKeyContributions.forEach( (keyShare, j) => {
                    keyShare.share.should.be.equal(broadData[0][j].share);
                    keyShare.publicKey[0].should.be.equal(broadData[0][j].publicKey[0]);
                    keyShare.publicKey[1].should.be.equal(broadData[0][j].publicKey[1]);
                });
                verVecFor2[i].forEach( (verVec, j) => {
                    let data = broadData[1][j].x.a;
                    verVec.x.a.should.be.equal(data);
                    data = broadData[1][j].x.b;
                    verVec.x.b.should.be.equal(data);
                    data = broadData[1][j].y.a;
                    verVec.y.a.should.be.equal(data);
                    data = broadData[1][j].y.b;
                    verVec.y.b.should.be.equal(data);
                });
                broadPoss = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(newSchainName),
                    nodeIndex,
                    {from: validatorsAccount[index]},
                );
                assert.equal(broadPoss, false);
            }

            const newBlsPublicKeys = [
                {
                    x: {
                        a: "17945245934172112720430606564971497509853214613861569656863106071068568253723",
                        b: "7365539570896884237936399383009560079020428209504598034927226836959448281990"
                    },
                    y: {
                        a: "328756406065900481141455427607662240753146186462209383165310531382712639488",
                        b: "12396023648016274643661712758226227732541765987317826629989463402470034350085"
                    }
                },
                // 2 node
                {
                    x: {
                        a: "1445886288383119232860836986153651053796281365332916864782089846880141512144",
                        b: "10553600839554651318567513403500033488246708292083711872298991829355668538168"
                    },
                    y: {
                        a: "8969531490580165920116494456925233436129053776122269190773320733487965418156",
                        b: "2134182532824397945972910300655031748052723368480421779361832118884704193190"
                    }
                },
                // 3 node
                {
                    x: {
                        a: "12011784688071615337531728975163527901337850783718139799543319364102099115988",
                        b: "7191172423183142435771719315902242302090503182407848443277297718294975327102"
                    },
                    y: {
                        a: "5681635636890558713111840746113474744709486043686600787107825609606002312504",
                        b: "8795133914776911664871434131529229484570551353787244066377299576346011174240"
                    }
                },
                // 4 node
                {
                    x: {
                        a: "10455056727998322865946036086965550113207055958400651276429680068301388440824",
                        b: "16399632585992986113889531984057584018202082523780198860571634172342249898427"
                    },
                    y: {
                        a: "20975727804781043923479295002129978461350253091600848335667800040191266955860",
                        b: "12438545441458779579423489236582196261771238101275308133996083192256807258310"
                    }
                }
            ]

            const key1 = await keyStorage.getBLSPublicKey(web3.utils.soliditySha3(newSchainName), nodesInGroup[0]);
            const key2 = await keyStorage.getBLSPublicKey(web3.utils.soliditySha3(newSchainName), nodesInGroup[1]);
            const key3 = await keyStorage.getBLSPublicKey(web3.utils.soliditySha3(newSchainName), nodesInGroup[2]);
            const key4 = await keyStorage.getBLSPublicKey(web3.utils.soliditySha3(newSchainName), nodesInGroup[3]);

            assert.equal(key1.x.a.toString(), newBlsPublicKeys[0].x.a);
            assert.equal(key1.x.b.toString(), newBlsPublicKeys[0].x.b);
            assert.equal(key1.y.a.toString(), newBlsPublicKeys[0].y.a);
            assert.equal(key1.y.b.toString(), newBlsPublicKeys[0].y.b);

            assert.equal(key2.x.a.toString(), newBlsPublicKeys[1].x.a);
            assert.equal(key2.x.b.toString(), newBlsPublicKeys[1].x.b);
            assert.equal(key2.y.a.toString(), newBlsPublicKeys[1].y.a);
            assert.equal(key2.y.b.toString(), newBlsPublicKeys[1].y.b);

            assert.equal(key3.x.a.toString(), newBlsPublicKeys[2].x.a);
            assert.equal(key3.x.b.toString(), newBlsPublicKeys[2].x.b);
            assert.equal(key3.y.a.toString(), newBlsPublicKeys[2].y.a);
            assert.equal(key3.y.b.toString(), newBlsPublicKeys[2].y.b);

            assert.equal(key4.x.a.toString(), newBlsPublicKeys[3].x.a);
            assert.equal(key4.x.b.toString(), newBlsPublicKeys[3].x.b);
            assert.equal(key4.y.a.toString(), newBlsPublicKeys[3].y.a);
            assert.equal(key4.y.b.toString(), newBlsPublicKeys[3].y.b);
        });
    });
});
