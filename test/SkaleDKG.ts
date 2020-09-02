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
         ValidatorServiceInstance,
         SkaleManagerInstance,
         ConstantsHolderInstance} from "../types/truffle-contracts";

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
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";

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
    let skaleManager: SkaleManagerInstance;
    let constantsHolder: ConstantsHolderInstance;

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
        skaleManager = await deploySkaleManager(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);

        await slashingTable.setPenalty("FailedDKG", failedDkgPenalty);
        await constantsHolder.setFirstDelegationsMonth(0);
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
                let index = 3;
                while ((new BigNumber(nodesInGroup[0])).toFixed() === "1") {
                    await schains.deleteSchainByRoot(schainName);
                    schainName = "d" + index;
                    index++;
                    await schains.addSchain(
                        validator1,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, schainName]));
                    nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3(schainName));
                }
            });

            it("should broadcast data from 1 node", async () => {
                let isBroadcasted = await skaleDKG.isNodeBroadcasted(
                    web3.utils.soliditySha3(schainName),
                    0
                );
                assert(isBroadcasted.should.be.false);
                const result = await skaleDKG.broadcast(
                    web3.utils.soliditySha3(schainName),
                    0,
                    verificationVectors[indexes[0]],
                    encryptedSecretKeyContributions[indexes[0]],
                    {from: validatorsAccount[0]},
                );
                isBroadcasted = await skaleDKG.isNodeBroadcasted(
                    web3.utils.soliditySha3(schainName),
                    0
                );
                assert(isBroadcasted.should.be.true);
                assert.equal(result.logs[0].event, "BroadcastAndKeyShare");
                assert.equal(result.logs[0].args.groupIndex, web3.utils.soliditySha3(schainName));
                assert.equal(result.logs[0].args.fromNode.toString(), "0");
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
                let isBroadcasted = await skaleDKG.isNodeBroadcasted(
                    web3.utils.soliditySha3(schainName),
                    1
                );
                assert(isBroadcasted.should.be.false);
                const result = await skaleDKG.broadcast(
                    web3.utils.soliditySha3(schainName),
                    1,
                    verificationVectors[indexes[1]],
                    encryptedSecretKeyContributions[indexes[1]],
                    {from: validatorsAccount[1]},
                );
                isBroadcasted = await skaleDKG.isNodeBroadcasted(
                    web3.utils.soliditySha3(schainName),
                    1
                );
                assert(isBroadcasted.should.be.true);
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
                let resCompl = await skaleDKG.isComplaintPossible(
                    web3.utils.soliditySha3(schainName),
                    0,
                    1,
                    {from: validatorsAccount[0]},
                );
                assert(resCompl.should.be.false);
                const resComplErr = await skaleDKG.complaint(
                    web3.utils.soliditySha3(schainName),
                    0,
                    1,
                    {from: validatorsAccount[0]},
                );
                assert.equal(resComplErr.logs[0].event, "ComplaintError");
                assert.equal(resComplErr.logs[0].args.error, "Has already sent alright");
                skipTime(web3, 1800);
                resCompl = await skaleDKG.isComplaintPossible(
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
                    ).should.be.eventually.rejectedWith("Node does not exist for message sender");
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

                        await skaleDKG.response(
                            web3.utils.soliditySha3(schainName),
                            0,
                            secretNumbers[indexes[0]],
                            multipliedShares[indexes[0]],
                            verificationVectors[indexes[0]],
                            badEncryptedSecretKeyContributions[indexes[0]],
                            {from: validatorsAccount[0]},
                        ).should.be.eventually.rejectedWith("Broadcasted Data is not correct");

                        const result = await skaleDKG.response(
                            web3.utils.soliditySha3(schainName),
                            0,
                            secretNumbers[indexes[0]],
                            multipliedShares[indexes[0]],
                            verificationVectors[indexes[0]],
                            encryptedSecretKeyContributions[indexes[0]],
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

                it("should not send alright after complaint from 2 node", async () => {
                    const result = await skaleDKG.complaint(
                        web3.utils.soliditySha3(schainName),
                        1,
                        0,
                        {from: validatorsAccount[1]},
                    );
                    const res = await skaleDKG.isAlrightPossible(
                        web3.utils.soliditySha3(schainName),
                        1,
                        {from: validatorsAccount[1]},
                    );
                    assert(res.should.be.false);
                    await skaleDKG.alright(
                        web3.utils.soliditySha3(schainName),
                        1,
                        {from: validatorsAccount[1]},
                    ).should.be.eventually.rejectedWith("Node has already sent complaint");
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
                            verificationVectors[indexes[0]],
                            badEncryptedSecretKeyContributions[indexes[0]],
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
                            verificationVectors[indexes[0]],
                            badEncryptedSecretKeyContributions[indexes[0]],
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
            let index = 3;
            while ((new BigNumber(nodesInGroup[0])).toFixed() === "1") {
                await schains.deleteSchainByRoot(schainName);
                schainName = "d" + index;
                index++;
                await schains.addSchain(
                    validator1,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, schainName]));
                nodesInGroup = await schainsInternal.getNodesInGroup(web3.utils.soliditySha3(schainName));
            }

            let rotCounter = await nodeRotation.getRotation(web3.utils.soliditySha3(schainName));
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
                verificationVectors[indexes[0]],
                badEncryptedSecretKeyContributions[indexes[0]],
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

            rotCounter = await nodeRotation.getRotation(web3.utils.soliditySha3(schainName));
            assert.equal(rotCounter.rotationCounter.toString(), "1");

            const failCompl = await skaleDKG.complaint(
                web3.utils.soliditySha3(schainName),
                2,
                0,
                {from: validatorsAccount[0]}
            );
            assert.equal(failCompl.logs[0].event, "ComplaintError");
            assert.equal(failCompl.logs[0].args.error, "Node is not in this group");

            let res = await skaleDKG.isBroadcastPossible(
                    web3.utils.soliditySha3(schainName),
                    2,
                    {from: validatorsAccount[0]},
                );

            assert.equal(res, true);

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
                const broadTx = await skaleDKG.broadcast(
                    web3.utils.soliditySha3("New16NodeSchain"),
                    i,
                    verificationVectorNew,
                    secretKeyContributions,
                    {from: validatorsAccount[index]},
                );
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

        //     for (let i = 0; i < 16; i++) {
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
        //         verificationVectorNew,
        //         secretKeyContributions,
        //         {from: validatorsAccount[indexToSend], gas: 12500000},
        //     );
        //     assert.equal(resResp.logs[0].event, "BadGuy");
        //     assert.equal(resResp.logs[0].args.nodeIndex.toString(), accusedNode);
        //     assert.isAtMost(resResp.receipt.gasUsed, 10000000);
        // });

        it("16 nodes schain test with incorrect complaint and response and deleting Schain", async () => {

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

            for (let i = 0; i < 15; i++) {
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                const broadPoss = await skaleDKG.isBroadcastPossible(
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
            }
            const accusedNode = "15";
            const complaintNode = "7";
            skipTime(web3, 1800);
            const resC = await skaleDKG.complaint(
                web3.utils.soliditySha3("New16NodeSchain"),
                complaintNode,
                accusedNode,
                {from: validatorsAccount[0]}
            );
            const failCompl = await skaleDKG.complaint(
                web3.utils.soliditySha3("New16NodeSchain"),
                8,
                accusedNode,
                {from: validatorsAccount[0]}
            );
            assert.equal(failCompl.logs[0].event, "ComplaintError");
            assert.equal(failCompl.logs[0].args.error, "Group is not created");
            await skaleManager.deleteSchain("New16NodeSchain", {from: validator1});
        });

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
        //                 verificationVectors[indexes[indexToSend]],
        //                 encryptedSecretKeyContributions[indexes[indexToSend]],
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
        //                 verificationVectors[indexes[indexToSend]],
        //                 encryptedSecretKeyContributions[indexes[indexToSend]],
        //                 {from: validatorsAccount[indexToSend], gas: 12500000},
        //             );
        //             assert.equal(resResp.logs[0].event, "BadGuy");
        //             assert.equal(resResp.logs[0].args.nodeIndex.toString(), accusedNode);
        //             console.log("\n Response from " + index + " node gas usage with new node", resResp.receipt.gasUsed);
        //         });
        //     }

        // });
    });
});
