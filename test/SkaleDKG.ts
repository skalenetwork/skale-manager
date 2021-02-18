import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ContractManager,
         DelegationController,
         KeyStorage,
         Nodes,
         NodeRotation,
         SchainsInternal,
         Schains,
         SkaleDKG,
         SkaleToken,
         SlashingTable,
         ValidatorService,
         SkaleManager,
         ConstantsHolder,
         Wallets } from "../typechain";

import { skipTime, currentTime } from "./tools/time";

import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";

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
import { deployWallets } from "./tools/deploy/wallets";
import { ethers, web3 } from "hardhat";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { assert, expect } from "chai";
import chaiAlmost from "chai-almost";
import { makeSnapshot, applySnapshot } from "./tools/snapshot";

chai.should();
chai.use(chaiAsPromised);
chai.use(solidity);

function stringValue(value: string | null) {
    if (value) {
        return value;
    } else {
        return "";
    }
}

async function getBalance(address: string) {
    return parseFloat(web3.utils.fromWei(await web3.eth.getBalance(address)));
}

describe("SkaleDKG", () => {
    let owner: SignerWithAddress;
    let validator1: SignerWithAddress;
    let validator2: SignerWithAddress;

    let contractManager: ContractManager;
    let keyStorage: KeyStorage
    let schainsInternal: SchainsInternal;
    let schains: Schains;
    let skaleDKG: SkaleDKG;
    let skaleToken: SkaleToken;
    let validatorService: ValidatorService;
    let slashingTable: SlashingTable;
    let delegationController: DelegationController;
    let nodes: Nodes;
    let nodeRotation: NodeRotation;
    let skaleManager: SkaleManager;
    let constantsHolder: ConstantsHolder;
    let wallets: Wallets;

    const failedDkgPenalty = 5;
    let snapshot: any;
    before(async() => {
        chai.use(chaiAlmost(0.002));
        [owner, validator1, validator2] = await ethers.getSigners();

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
        wallets = await deployWallets(contractManager);

        await slashingTable.setPenalty("FailedDKG", failedDkgPenalty);
    });

    beforeEach(async () => {
        snapshot = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(snapshot);
    });

    describe("when 2 nodes are created", async () => {
        let validatorsAccount: SignerWithAddress[];
        const validatorsPrivateKey = [
            privateKeys[1],
            privateKeys[2],
        ];
        const pubKey1 = ec.keyFromPrivate(String(privateKeys[1]).slice(2)).getPublic();
        const pubKey2 = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        const validatorsPublicKey: [string, string][] = [
            ["0x" + pubKey1.x.toString('hex'), "0x" + pubKey1.y.toString('hex')],
            ["0x" + pubKey2.x.toString('hex'), "0x" + pubKey2.y.toString('hex')]
        ];

        const secretNumbers = [
            "94073351970851123256998281197810571804991376897451597421391551220528953509967",
            "23383085566804766363053828952501543288710399799919707285577168673945626165222",
        ];

        const encryptedSecretKeyContributions: {share: string, publicKey: [string, string]}[][] = [
            [
                {
                    share: "0xc54860dc759e1c6095dfaa33e0b045fc102551e654cec47c7e1e9e2b33354ca6",
                    publicKey: [
                        "0xf676847eeff8f52b6f22c8b590aed7f80c493dfa2b7ec1cff3ae3049ed15c767",
                        "0xe5c51a3f401c127bde74fefce07ed225b45e7975fccf4a10c12557ae8036653b"
                    ]
                },
                {
                    share: "0xdb68ca3cb297158e493e137ce0ab5fddd2cec34b3a15a4ee1aec9dfcc61dfd15",
                    publicKey: [
                        "0xdc1282664acf84218bf29112357c78f46766c783e7b7ead43db07d5d9fd74ca9",
                        "0x85569644dc1a5bc374d3833a5c5ff3aaa26fa4050ff738d442b34087d4d8f3aa"
                    ]
                }
            ],
            [
                {
                    share: "0x7bb14ad459adba781466c3441e10eeb3148c152b4919b126a0166fd1dac824ba",
                    publicKey: [
                        "0x89051df58e7d7cec9c6816d65a17f068409aa37200cd544d263104c1b9dbd037",
                        "0x435e1a25c9b9f95627ec141e14826f0d0e798c793d470388865dccb461c19773"
                    ]
                },
                {
                    share: "0xa6b44d487799470fc5da3e359d21b976a146d7345ed90782c1d034d1ceef53bf",
                    publicKey: [
                        "0x78b59fd523f23097483958ec5cd4308e5805a261961fe629bf7dc9674ed2ec94",
                        "0xaa4244b53891263f79f6df64a82592dab46a6be903c29c15170d785e493ff9c2"
                    ]
                }
            ]
        ];

        const badEncryptedSecretKeyContributions: {share: string, publicKey: [string, string]}[][] = [
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

        const verificationVectors = [
            [
                {
                    x: {
                        a: "0x2603b519d8eacb84244da4f264a888b292214ed2d2fad9368bc12c2a9a5a5f25",
                        b: "0x2d8b197411929589919db23a989c1fd619a53a47db14dab3fd952490c7bf0615"
                    },
                    y: {
                        a: "0x2e99d40faf53cc640065fa674948a0a9b169c303afc5d061bac6ef4c7c1fc400",
                        b: "0x1b9afd2c7c3aeb9ef31f357491d4f1c2b889796297460facaa81ce8c15c3680"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "0x2a21918482ff2503b08a38dd5bf119b1a0a6bca910dfd9052fa6792f01624f20",
                        b: "0xa55dec4eb79493ec63aed84aebbc016c2ab11e335d3d465519ffbfa15416ced",
                    },
                    y: {
                        a: "0x13b919159469023fad82fedae095a2359f600f0a8a09f32bab6250e1688f0852",
                        b: "0x269279ef4c2fcd6ca475c522406444ee79ffa796a645f9953b3d4d003f8f7294"
                    }
                }
            ]
        ];

        const verificationVectorMult = [
            [
                {
                    x: {
                        a: "17194438700289937736888799343771909433659280658838586817455546535714250972965",
                        b: "20599845601114276224190290094010139071928880374844902020405844010104675829269"
                    },
                    y: {
                        a: "21078182228830189979024581609964511130944484501828138899170020075656894727168",
                        b: "780393043804401103204250478988289933707327885740151238575348025052446340736"
                    }
                }
            ],
            [
                {
                    x: {
                        a: "19056449919363678002498844918597898897333951353086926304319833715542992244512",
                        b: "4674847982975643573922066052993530659739521275327220373195818068694758681837",
                    },
                    y: {
                        a: "8920983955513029529488328311353033907080303508488681579760788761713386129490",
                        b: "17446689480380380927144149357400533537993350530713480927137321363016554345108"
                    }
                }
            ]
        ];

        const multipliedShares = [
            {
                x: {
                    a: "0x2603b519d8eacb84244da4f264a888b292214ed2d2fad9368bc12c2a9a5a5f25",
                    b: "0x2d8b197411929589919db23a989c1fd619a53a47db14dab3fd952490c7bf0615"
                },
                y: {
                    a: "0x2e99d40faf53cc640065fa674948a0a9b169c303afc5d061bac6ef4c7c1fc400",
                    b: "0x1b9afd2c7c3aeb9ef31f357491d4f1c2b889796297460facaa81ce8c15c3680"
                }
            },
            {
                x: {
                    a: "0x2a21918482ff2503b08a38dd5bf119b1a0a6bca910dfd9052fa6792f01624f20",
                    b: "0xa55dec4eb79493ec63aed84aebbc016c2ab11e335d3d465519ffbfa15416ced"
                },
                y: {
                    a: "0x13b919159469023fad82fedae095a2359f600f0a8a09f32bab6250e1688f0852",
                    b: "0x269279ef4c2fcd6ca475c522406444ee79ffa796a645f9953b3d4d003f8f7294"
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

        let cleanContracts: number;
        before(async () => {
            cleanContracts = await makeSnapshot();
            validatorsAccount = [validator1, validator2];

            await validatorService.connect(validator1).registerValidator("Validator1", "D2 is even", 0, 0);
            const validator1Id = await validatorService.getValidatorId(validator1.address);
            await validatorService.connect(validator2).registerValidator("Validator2", "D2 is even more even", 0, 0);
            const validator2Id = await validatorService.getValidatorId(validator2.address);
            await skaleToken.mint(validator1.address, delegatedAmount, "0x", "0x");
            await skaleToken.mint(validator2.address, delegatedAmount, "0x", "0x");
            await validatorService.enableValidator(validator1Id);
            await validatorService.enableValidator(validator2Id);
            await delegationController.connect(validator1).delegate(validator1Id, delegatedAmount, 2, "D2 is even");
            await delegationController.connect(validator2).delegate(validator2Id, delegatedAmount, 2, "D2 is even more even");
            await delegationController.connect(validator1).acceptPendingDelegation(0);
            await delegationController.connect(validator2).acceptPendingDelegation(1);

            await skipTime(ethers, 60 * 60 * 24 * 31);

            const nodesCount = 2;
            for (const index of Array.from(Array(nodesCount).keys())) {
                const hexIndex = ("0" + index.toString(16)).slice(-2);
                const pubKey = ec.keyFromPrivate(String(privateKeys[index + 1]).slice(2)).getPublic();
                await nodes.createNode(validatorsAccount[index].address,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: validatorsPublicKey[index],
                        name: "d2" + hexIndex,
                        domainName: "somedomain.name"
                    });
            }
        });

        after(async () => {
            await applySnapshot(cleanContracts);
        });

        it("should create schain and open a DKG channel", async () => {
            const deposit = await schains.getSchainPrice(4, 5);

            const res = await (await schains.addSchain(
                validator1.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]))).wait();

            assert((await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d2")))).should.be.true);
            (await skaleDKG.getChannelStartedBlock(stringValue(web3.utils.soliditySha3("d2")))).should.be.equal(res.blockNumber);
        });

        it("should create schain and reopen a DKG channel", async () => {
            const deposit = await schains.getSchainPrice(4, 5);

            await schains.addSchain(
                validator1.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            assert((await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d2")))).should.be.true);
        });

        it("should create & delete schain and open & close a DKG channel", async () => {
            const deposit = await schains.getSchainPrice(4, 5);

            await schains.addSchain(
                validator1.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            assert((await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d2")))).should.be.true);


            await schains.deleteSchainByRoot("d2");
            assert((await skaleDKG.isChannelOpened(stringValue(web3.utils.soliditySha3("d2")))).should.be.false);
        });

        describe("when 2-node schain is created", async () => {
            let twoNodesAreCreated: number;
            let twoSchainAreCreated: number;
            before(async () => {
                twoNodesAreCreated = await makeSnapshot();
                const deposit = await schains.getSchainPrice(4, 5);

                await schains.addSchain(
                    validator1.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

                let nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));
                schainName = "d2";
                await wallets.connect(owner).rechargeSchainWallet(stringValue(web3.utils.soliditySha3(schainName)), {value: 1e20.toString()});
                let index = 3;
                while (nodesInGroup[0].eq(1)) {
                    await schains.deleteSchainByRoot(schainName);
                    schainName = "d" + index;
                    index++;
                    await schains.addSchain(
                        validator1.address,
                        deposit,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, schainName]));
                    nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3(schainName)));
                    await wallets.rechargeSchainWallet(stringValue(web3.utils.soliditySha3(schainName)), {value: 1e20.toString()});
                }
            });

            after(async () => {
                await applySnapshot(twoNodesAreCreated);
            });

            it("should broadcast data from 1 node", async () => {
                let isBroadcasted = await skaleDKG.isNodeBroadcasted(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );
                assert(isBroadcasted.should.be.false);
                await expect(skaleDKG.connect(validatorsAccount[0]).broadcast(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    verificationVectors[indexes[0]],
                    encryptedSecretKeyContributions[indexes[0]]
                )).to.emit(skaleDKG, "BroadcastAndKeyShare");

                isBroadcasted = await skaleDKG.isNodeBroadcasted(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );
                assert(isBroadcasted.should.be.true);
            });

            it("should broadcast data from 1 node & check", async () => {
                await expect(skaleDKG.connect(validatorsAccount[0]).broadcast(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    verificationVectors[indexes[0]],
                    encryptedSecretKeyContributions[indexes[0]]
                )).to.emit(skaleDKG, "BroadcastAndKeyShare");

                const res = await skaleDKG.connect(validatorsAccount[0]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );
                assert(res.should.be.false);
            });

            it("should broadcast data from 2 node", async () => {
                let isBroadcasted = await skaleDKG.isNodeBroadcasted(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1
                );
                assert(isBroadcasted.should.be.false);
                await expect(skaleDKG.connect(validatorsAccount[1]).broadcast(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1,
                    verificationVectors[indexes[1]],
                    encryptedSecretKeyContributions[indexes[1]]
                )).to.emit(skaleDKG, "BroadcastAndKeyShare");

                isBroadcasted = await skaleDKG.isNodeBroadcasted(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1
                );
                assert(isBroadcasted.should.be.true);
            });

            it("should rejected broadcast data from 2 node with incorrect sender", async () => {
                await skaleDKG.connect(validatorsAccount[0]).broadcast(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1,
                    verificationVectors[indexes[1]],
                    encryptedSecretKeyContributions[indexes[1]]
                ).should.be.eventually.rejectedWith("Node does not exist for message sender");
            });

            it("should rejected early complaint after missing broadcast", async () => {
                let res = await skaleDKG.connect(validatorsAccount[0]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );
                assert(res.should.be.true);
                const result = await skaleDKG.connect(validatorsAccount[0]).broadcast(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    verificationVectors[indexes[0]],
                    encryptedSecretKeyContributions[indexes[0]]
                );
                res = await skaleDKG.connect(validatorsAccount[0]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );
                assert(res.should.be.false);
                res = await skaleDKG.connect(validatorsAccount[1]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1
                );
                assert(res.should.be.true);
                await skipTime(ethers, 1700);
                const resCompl = await skaleDKG.connect(validatorsAccount[0]).isComplaintPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    1,
                );
                assert(resCompl.should.be.false);
                const balanceBefore = await getBalance(validatorsAccount[0].address);
                await expect(skaleDKG.connect(validatorsAccount[0]).complaint(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    1
                )).to.emit(skaleDKG, "ComplaintError")
                    .withArgs("Complaint sent too early");
                const balance = await getBalance(validatorsAccount[0].address);
                balance.should.not.be.lessThan(balanceBefore);
                balance.should.be.almost(balanceBefore);
            });

            it("should send complaint after missing broadcast", async () => {
                let res = await skaleDKG.connect(validatorsAccount[0]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );
                assert(res.should.be.true);
                const result = await skaleDKG.connect(validatorsAccount[0]).broadcast(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    verificationVectors[indexes[0]],
                    encryptedSecretKeyContributions[indexes[0]]
                );
                res = await skaleDKG.connect(validatorsAccount[0]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );
                assert(res.should.be.false);
                res = await skaleDKG.connect(validatorsAccount[1]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1
                );
                assert(res.should.be.true);
                await skipTime(ethers, 1800);
                let resCompl = await skaleDKG.connect(validatorsAccount[0]).isComplaintPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    1
                );
                assert(resCompl.should.be.true);
                const balanceBefore = await getBalance(validatorsAccount[0].address);
                await skaleDKG.connect(validatorsAccount[0]).complaint(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    1
                );
                const balance = await getBalance(validatorsAccount[0].address);
                balance.should.not.be.lessThan(balanceBefore);
                balance.should.be.almost(balanceBefore);
                res = await skaleDKG.connect(validatorsAccount[1]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1
                );
                assert(res.should.be.false);
                resCompl = await skaleDKG.connect(validatorsAccount[0]).isComplaintPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    1
                );
                assert(resCompl.should.be.false);
                res = await skaleDKG.connect(validatorsAccount[1]).isChannelOpened(
                    stringValue(web3.utils.soliditySha3(schainName))
                );
                assert(res.should.be.false);
            });

            it("should send complaint after missing alright", async () => {
                let res = await skaleDKG.connect(validatorsAccount[0]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );
                assert(res.should.be.true);
                await skaleDKG.connect(validatorsAccount[0]).broadcast(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    verificationVectors[indexes[0]],
                    encryptedSecretKeyContributions[indexes[0]]
                );
                res = await skaleDKG.connect(validatorsAccount[0]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );
                assert(res.should.be.false);
                res = await skaleDKG.connect(validatorsAccount[1]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1
                );
                assert(res.should.be.true);
                await skaleDKG.connect(validatorsAccount[1]).broadcast(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1,
                    verificationVectors[indexes[1]],
                    encryptedSecretKeyContributions[indexes[1]]
                );
                res = await skaleDKG.connect(validatorsAccount[1]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1
                );
                assert(res.should.be.false);

                let resAlr = await skaleDKG.connect(validatorsAccount[0]).isAlrightPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );
                assert(resAlr.should.be.true);

                let balanceBefore = await getBalance(validatorsAccount[0].address);

                const result = await skaleDKG.connect(validatorsAccount[0]).alright(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );

                let balance = await getBalance(validatorsAccount[0].address);
                balance.should.not.be.lessThan(balanceBefore);
                balance.should.be.almost(balanceBefore);


                resAlr = await skaleDKG.connect(validatorsAccount[0]).isAlrightPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0
                );
                assert(resAlr.should.be.false);
                resAlr = await skaleDKG.connect(validatorsAccount[1]).isAlrightPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1
                );
                assert(resAlr.should.be.true);
                let resCompl = await skaleDKG.connect(validatorsAccount[0]).isComplaintPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    1,
                );
                assert(resCompl.should.be.false);

                balanceBefore = await getBalance(validatorsAccount[0].address);
                await expect(skaleDKG.connect(validatorsAccount[0]).complaint(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    1
                )).to.emit(skaleDKG, "ComplaintError")
                    .withArgs("Has already sent alright");
                balance = await getBalance(validatorsAccount[0].address);
                balance.should.not.be.lessThan(balanceBefore);
                balance.should.be.almost(balanceBefore);

                await skipTime(ethers, 1800);
                resCompl = await skaleDKG.connect(validatorsAccount[0]).isComplaintPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    1
                );
                assert(resCompl.should.be.true);

                balanceBefore = await getBalance(validatorsAccount[0].address);
                await skaleDKG.connect(validatorsAccount[0]).complaint(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    1
                );
                balance = await getBalance(validatorsAccount[0].address);
                balance.should.not.be.lessThan(balanceBefore);
                balance.should.be.almost(balanceBefore);

                res = await skaleDKG.connect(validatorsAccount[1]).isAlrightPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1
                );
                assert(res.should.be.false);
                resCompl = await skaleDKG.connect(validatorsAccount[0]).isComplaintPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    0,
                    1
                );
                assert(resCompl.should.be.false);
                res = await skaleDKG.connect(validatorsAccount[1]).isChannelOpened(
                    stringValue(web3.utils.soliditySha3(schainName))
                );
                assert(res.should.be.false);
            });

            describe("after sending complaint after missing broadcast", async () => {
                before(async () => {
                    twoSchainAreCreated = await makeSnapshot();
                    await skaleDKG.connect(validatorsAccount[0]).broadcast(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0,
                        verificationVectors[indexes[0]],
                        encryptedSecretKeyContributions[indexes[0]]
                    );
                    await skipTime(ethers, 1800);
                    const balanceBefore = await getBalance(validatorsAccount[0].address);
                    await skaleDKG.connect(validatorsAccount[0]).complaint(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0,
                        1
                    );
                    const balance = await getBalance(validatorsAccount[0].address);
                    balance.should.not.be.lessThan(balanceBefore);
                    balance.should.be.almost(balanceBefore);
                });

                after(async () => {
                    await applySnapshot(twoSchainAreCreated);
                });

                it("channel should be closed", async () => {
                    const res = await skaleDKG.connect(validatorsAccount[1]).isChannelOpened(
                        stringValue(web3.utils.soliditySha3(schainName))
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send broadcast", async () => {
                    const res = await skaleDKG.connect(validatorsAccount[1]).isBroadcastPossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send complaint", async () => {
                    const res = await skaleDKG.connect(validatorsAccount[0]).isComplaintPossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0,
                        1
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send another complaint", async () => {
                    const res = await skaleDKG.connect(validatorsAccount[1]).isComplaintPossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1,
                        0
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send preResponse", async () => {
                    const res = await skaleDKG.connect(validatorsAccount[0]).isPreResponsePossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send another preResponse", async () => {
                    const res = await skaleDKG.connect(validatorsAccount[1]).isPreResponsePossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send response", async () => {
                    const res = await skaleDKG.connect(validatorsAccount[0]).isResponsePossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0
                    );
                    assert(res.should.be.false);
                });

                it("should be unpossible send another response", async () => {
                    const res = await skaleDKG.connect(validatorsAccount[1]).isResponsePossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1
                    );
                    assert(res.should.be.false);
                });
            });

            describe("when correct broadcasts sent", async () => {
                before(async () => {
                    twoSchainAreCreated = await makeSnapshot();
                    await skaleDKG.connect(validatorsAccount[0]).broadcast(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0,
                        verificationVectors[indexes[0]],
                        encryptedSecretKeyContributions[indexes[0]]
                    );

                    await skaleDKG.connect(validatorsAccount[1]).broadcast(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1,
                        verificationVectors[indexes[1]],
                        encryptedSecretKeyContributions[indexes[1]]
                    );
                });

                after(async () => {
                    await applySnapshot(twoSchainAreCreated);
                });
                it("should send alright from 1 node", async () => {
                    await expect(skaleDKG.connect(validatorsAccount[0]).alright(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0
                    )).to.emit(skaleDKG, "AllDataReceived")
                        .withArgs(stringValue(web3.utils.soliditySha3(schainName)), 0);
                    assert.equal(await skaleDKG.isAllDataReceived(stringValue(web3.utils.soliditySha3(schainName)), 0), true);
                });

                it("should send alright from 1 node", async () => {
                    await expect(skaleDKG.connect(validatorsAccount[0]).alright(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0
                    )).to.emit(skaleDKG, "AllDataReceived")
                        .withArgs(stringValue(web3.utils.soliditySha3(schainName)), 0);

                    const res = await skaleDKG.connect(validatorsAccount[0]).isAlrightPossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0
                    );
                    assert(res.should.be.false);
                });

                it("should send alright from 2 node", async () => {
                    await expect(skaleDKG.connect(validatorsAccount[1]).alright(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1
                    )).to.emit(skaleDKG, "AllDataReceived")
                        .withArgs(stringValue(web3.utils.soliditySha3(schainName)), 1);
                });

                it("should not send alright from 2 node with incorrect sender", async () => {
                    await skaleDKG.connect(validatorsAccount[0]).alright(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1
                    ).should.be.eventually.rejectedWith("Node does not exist for message sender");
                });

                it("should catch successful DKG event", async () => {
                    await skaleDKG.connect(validatorsAccount[0]).alright(stringValue(web3.utils.soliditySha3(schainName)), 0);
                    await expect(skaleDKG.connect(validatorsAccount[1]).alright(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1
                    )).to.emit(skaleDKG, "SuccessfulDKG")
                        .withArgs(stringValue(web3.utils.soliditySha3(schainName)));
                });

                it("should complaint and be slashed", async () => {
                    const balanceBefore = await getBalance(validatorsAccount[1].address);
                    await expect(skaleDKG.connect(validatorsAccount[1]).complaint(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1,
                        0
                    )).to.emit(skaleDKG, "BadGuy")
                        .withArgs(1);
                    const balance = await getBalance(validatorsAccount[1].address);
                    balance.should.not.be.lessThan(balanceBefore);
                    balance.should.be.almost(balanceBefore);
                });

                describe("when 2 node sent incorrect complaint", async () => {
                    let correctBroadcastIsSent: number;
                    before(async () => {
                        correctBroadcastIsSent = await makeSnapshot();
                        const balanceBefore = await getBalance(validatorsAccount[1].address);
                        await skaleDKG.connect(validatorsAccount[1]).complaintBadData(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            1,
                            0
                        );
                        const balance = await getBalance(validatorsAccount[1].address);
                        balance.should.not.be.lessThan(balanceBefore);
                        balance.should.be.almost(balanceBefore);
                    });

                    after(async () => {
                        await applySnapshot(correctBroadcastIsSent);
                    });

                    it("should check is possible to send complaint", async () => {
                        const res = await skaleDKG.connect(validatorsAccount[1]).isComplaintPossible(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            1,
                            0
                        );
                        assert(res.should.be.false);
                        await expect(skaleDKG.connect(validatorsAccount[1]).complaint(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            1,
                            0
                        )).to.emit(skaleDKG, "ComplaintError")
                            .withArgs("The same complaint rejected");
                    });

                    it("should send complaint after missing preResponse", async () => {
                        await skipTime(ethers, 1800);
                        const res = await skaleDKG.connect(validatorsAccount[1]).isComplaintPossible(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            1,
                            0
                        );
                        assert(res.should.be.true);
                        const balanceBefore = await getBalance(validatorsAccount[1].address);
                        await expect(skaleDKG.connect(validatorsAccount[1]).complaint(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            1,
                            0
                        )).to.emit(skaleDKG, "BadGuy")
                            .withArgs(0);
                        const balance = await getBalance(validatorsAccount[1].address);
                        balance.should.not.be.lessThan(balanceBefore);
                        balance.should.be.almost(balanceBefore);
                    });

                    it("should send complaint after missing response", async () => {
                        let res = await skaleDKG.connect(validatorsAccount[1]).isComplaintPossible(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            1,
                            0
                        );
                        assert(res.should.be.false);
                        await skaleDKG.connect(validatorsAccount[0]).preResponse(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0,
                            verificationVectors[indexes[0]],
                            verificationVectorMult[indexes[0]],
                            encryptedSecretKeyContributions[indexes[0]]
                        );
                        res = await skaleDKG.connect(validatorsAccount[1]).isComplaintPossible(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            1,
                            0
                        );
                        assert(res.should.be.false);
                        await skipTime(ethers, 1800);
                        res = await skaleDKG.connect(validatorsAccount[1]).isComplaintPossible(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            1,
                            0
                        );
                        assert(res.should.be.true);
                        const balanceBefore = await getBalance(validatorsAccount[1].address);
                        await expect(skaleDKG.connect(validatorsAccount[1]).complaint(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            1,
                            0
                        )).to.emit(skaleDKG, "BadGuy")
                            .withArgs(0);
                        const balance = await getBalance(validatorsAccount[1].address);
                        balance.should.not.be.lessThan(balanceBefore);
                        balance.should.be.almost(balanceBefore);
                    });

                    it("should send correct response", async () => {
                        let res = await skaleDKG.connect(validatorsAccount[0]).isResponsePossible(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0
                        );
                        assert(res.should.be.false);

                        res = await skaleDKG.connect(validatorsAccount[0]).isPreResponsePossible(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0
                        );
                        assert(res.should.be.true);

                        await skaleDKG.connect(validatorsAccount[0]).response(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0,
                            secretNumbers[indexes[0]],
                            multipliedShares[indexes[0]]
                        ).should.be.eventually.rejectedWith("Have not submitted pre-response data");

                        await skaleDKG.connect(validatorsAccount[0]).preResponse(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0,
                            verificationVectors[indexes[0]],
                            verificationVectorMult[indexes[0]],
                            badEncryptedSecretKeyContributions[indexes[0]]
                        ).should.be.eventually.rejectedWith("Broadcasted Data is not correct");

                        await skaleDKG.connect(validatorsAccount[0]).preResponse(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0,
                            verificationVectors[indexes[0]],
                            verificationVectorMult[indexes[0]],
                            encryptedSecretKeyContributions[indexes[0]]
                        );

                        res = await skaleDKG.connect(validatorsAccount[0]).isResponsePossible(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0
                        );
                        assert(res.should.be.true);

                        res = await skaleDKG.connect(validatorsAccount[0]).isPreResponsePossible(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0
                        );
                        assert(res.should.be.false);

                        const balanceBefore = await getBalance(validatorsAccount[0].address);

                        await expect(skaleDKG.connect(validatorsAccount[0]).response(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0,
                            secretNumbers[indexes[0]],
                            multipliedShares[indexes[0]]
                        )).to.emit(skaleDKG, "BadGuy")
                            .withArgs(1);

                        const balance = await getBalance(validatorsAccount[0].address);
                        balance.should.not.be.lessThan(balanceBefore);

                        (await skaleToken.callStatic.getAndUpdateLockedAmount(validator2.address)).toNumber()
                            .should.be.equal(delegatedAmount);
                        (await skaleToken.callStatic.getAndUpdateDelegatedAmount(validator2.address)).toNumber()
                            .should.be.equal(delegatedAmount - failedDkgPenalty);
                        (await skaleToken.callStatic.getAndUpdateSlashedAmount(validator2.address)).toNumber()
                            .should.be.equal(failedDkgPenalty);
                    });

                    it("should send incorrect response with bad multiplied share", async() => {
                        await skaleDKG.connect(validatorsAccount[0]).preResponse(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0,
                            verificationVectors[indexes[0]],
                            verificationVectorMult[indexes[0]],
                            encryptedSecretKeyContributions[indexes[0]]
                        );
                        await expect(skaleDKG.connect(validatorsAccount[0]).response(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0,
                            secretNumbers[indexes[0]],
                            badMultipliedShares[indexes[0]]
                        )).to.emit(skaleDKG, "BadGuy")
                            .withArgs(0);
                    });
                });
            });

            describe("when 1 node sent bad data", async () => {
                before(async () => {
                    twoSchainAreCreated = await makeSnapshot();
                    await skaleDKG.connect(validatorsAccount[0]).broadcast(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0,
                        verificationVectors[indexes[0]],
                        // the last symbol is spoiled in parameter below
                        badEncryptedSecretKeyContributions[indexes[0]]
                    );

                    await skaleDKG.connect(validatorsAccount[1]).broadcast(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1,
                        verificationVectors[indexes[1]],
                        encryptedSecretKeyContributions[indexes[1]]
                    );
                });

                after(async () => {
                    await applySnapshot(twoSchainAreCreated);
                });

                it("should send complaint from 2 node", async () => {
                    const balanceBefore = await getBalance(validatorsAccount[1].address);
                    await expect(skaleDKG.connect(validatorsAccount[1]).complaintBadData(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1,
                        0
                    )).to.emit(skaleDKG, "ComplaintSent")
                        .withArgs(stringValue(web3.utils.soliditySha3(schainName)), 1, 0);
                    const balance = await getBalance(validatorsAccount[1].address);
                    balance.should.not.be.lessThan(balanceBefore);
                    balance.should.be.almost(balanceBefore);
                    const res = await skaleDKG.getComplaintData(stringValue(web3.utils.soliditySha3(schainName)));
                    assert.equal(res[0].toString(), "1");
                    assert.equal(res[1].toString(), "0");
                });

                it("should not send alright after complaint from 2 node", async () => {
                    const result = await skaleDKG.connect(validatorsAccount[1]).complaintBadData(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1,
                        0
                    );
                    const res = await skaleDKG.connect(validatorsAccount[1]).isAlrightPossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1
                    );
                    assert(res.should.be.false);
                    await skaleDKG.connect(validatorsAccount[1]).alright(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1
                    ).should.be.eventually.rejectedWith("Node has already sent complaint");
                });

                it("should not send 2 complaints from 1 node", async () => {
                    await skaleDKG.connect(validatorsAccount[1]).complaintBadData(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1,
                        0
                    );
                    const resCompl = await skaleDKG.connect(validatorsAccount[0]).isComplaintPossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0,
                        1
                    );
                    assert(resCompl.should.be.false);
                    await expect(skaleDKG.connect(validatorsAccount[0]).complaintBadData(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        0,
                        1
                    )).to.emit(skaleDKG, "ComplaintError")
                        .withArgs("First complaint has already been processed");
                });

                it("should not send 2 complaints from 2 node", async () => {
                    await skaleDKG.connect(validatorsAccount[1]).complaintBadData(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1,
                        0,
                    );
                    await expect(skaleDKG.connect(validatorsAccount[1]).complaintBadData(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1,
                        0,
                    )).to.emit(skaleDKG, "ComplaintError")
                        .withArgs("First complaint has already been processed");
                });

                describe("when complaint successfully sent", async () => {

                    let nodeSentBadData: number;
                    before(async () => {
                        nodeSentBadData = await makeSnapshot();
                        const result = await skaleDKG.connect(validatorsAccount[1]).complaintBadData(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            1,
                            0
                        );
                    });

                    after(async () => {
                        await applySnapshot(nodeSentBadData);
                    });

                    it("accused node should send correct response", async () => {
                        await nodes.createNode(validatorsAccount[0].address,
                            {
                                port: 8545,
                                nonce: 0,
                                ip: "0x7f000002",
                                publicIp: "0x7f000002",
                                publicKey: validatorsPublicKey[0],
                                name: "d202",
                                domainName: "somedomain.name"
                        });

                        let balanceBefore = await getBalance(validatorsAccount[0].address);
                        await skaleDKG.connect(validatorsAccount[0]).preResponse(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0,
                            verificationVectors[indexes[0]],
                            verificationVectorMult[indexes[0]],
                            badEncryptedSecretKeyContributions[indexes[0]]
                        );
                        let balance = await getBalance(validatorsAccount[0].address);
                        balance.should.not.be.lessThan(balanceBefore);
                        balance.should.be.almost(balanceBefore);

                        balanceBefore = await getBalance(validatorsAccount[0].address);
                        await expect(skaleDKG.connect(validatorsAccount[0]).response(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0,
                            secretNumbers[indexes[0]],
                            multipliedShares[indexes[0]]
                        )).to.emit(skaleDKG, "BadGuy")
                            .withArgs(0);
                        balance = await getBalance(validatorsAccount[0].address);
                        balance.should.not.be.lessThan(balanceBefore);
                        balance.should.be.almost(balanceBefore);

                        const leavingTimeOfNode = (await nodeRotation.getLeavingHistory(0))[0].finishedRotation.toNumber();
                        assert.equal(await currentTime(web3), leavingTimeOfNode);

                        (await skaleToken.callStatic.getAndUpdateLockedAmount(validator1.address)).toNumber()
                            .should.be.equal(delegatedAmount);
                        (await skaleToken.callStatic.getAndUpdateDelegatedAmount(validator1.address)).toNumber()
                            .should.be.equal(delegatedAmount - failedDkgPenalty);
                        (await skaleToken.callStatic.getAndUpdateSlashedAmount(validator1.address)).toNumber()
                            .should.be.equal(failedDkgPenalty);
                    });

                    it("accused node should send incorrect response", async () => {
                        let balanceBefore = await getBalance(validatorsAccount[0].address);
                        await skaleDKG.connect(validatorsAccount[0]).preResponse(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0,
                            verificationVectors[indexes[0]],
                            verificationVectorMult[indexes[0]],
                            badEncryptedSecretKeyContributions[indexes[0]]
                        );
                        let balance = await getBalance(validatorsAccount[0].address);
                        balance.should.not.be.lessThan(balanceBefore);
                        balance.should.be.almost(balanceBefore);

                        balanceBefore = await getBalance(validatorsAccount[0].address);
                        await expect(skaleDKG.connect(validatorsAccount[0]).response(
                            stringValue(web3.utils.soliditySha3(schainName)),
                            0,
                            secretNumbers[indexes[0]],
                            multipliedShares[indexes[1]]
                        )).to.emit(skaleDKG, "BadGuy")
                            .withArgs(0);
                        balance = await getBalance(validatorsAccount[0].address);
                        balance.should.not.be.lessThan(balanceBefore);
                        balance.should.be.almost(balanceBefore);

                        (await skaleToken.callStatic.getAndUpdateLockedAmount(validator1.address)).toNumber()
                            .should.be.equal(delegatedAmount);
                        (await skaleToken.callStatic.getAndUpdateDelegatedAmount(validator1.address)).toNumber()
                            .should.be.equal(delegatedAmount - failedDkgPenalty);
                        (await skaleToken.callStatic.getAndUpdateSlashedAmount(validator1.address)).toNumber()
                            .should.be.equal(failedDkgPenalty);
                    });
                });
            });
        });

        it("should reopen channel correctly", async () => {
            const deposit = await schains.getSchainPrice(4, 5);

            await schains.addSchain(
                validator1.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            let nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));
            schainName = "d2";
            let index = 3;
            while (nodesInGroup[0].eq(1)) {
                await schains.deleteSchainByRoot(schainName);
                schainName = "d" + index;
                index++;
                await schains.addSchain(
                    validator1.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, schainName]));
                nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3(schainName)));
            }

            let rotCounter = await nodeRotation.getRotation(stringValue(web3.utils.soliditySha3(schainName)));
            assert.equal(rotCounter.rotationCounter.toString(), "0");

            await nodes.createNode(validatorsAccount[0].address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000003",
                    publicIp: "0x7f000003",
                    publicKey: validatorsPublicKey[0],
                    name: "d203",
                    domainName: "somedomain.name"
                });

            await wallets.connect(owner).rechargeSchainWallet(stringValue(web3.utils.soliditySha3(schainName)), {value: 1e20.toString()});
            let balanceBefore = await getBalance(validatorsAccount[0].address);
            await skaleDKG.connect(validatorsAccount[0]).broadcast(
                stringValue(web3.utils.soliditySha3(schainName)),
                0,
                verificationVectors[indexes[0]],
                // the last symbol is spoiled in parameter below
                badEncryptedSecretKeyContributions[indexes[0]]
            );
            let balance = await getBalance(validatorsAccount[0].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);

            balanceBefore = await getBalance(validatorsAccount[1].address);
            await skaleDKG.connect(validatorsAccount[1]).broadcast(
                stringValue(web3.utils.soliditySha3(schainName)),
                1,
                verificationVectors[indexes[1]],
                encryptedSecretKeyContributions[indexes[1]]
            );
            balance = await getBalance(validatorsAccount[1].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);

            balanceBefore = await getBalance(validatorsAccount[1].address);
            const resCompl = await (await skaleDKG.connect(validatorsAccount[1]).complaintBadData(
                stringValue(web3.utils.soliditySha3(schainName)),
                1,
                0
            )).wait();
            balance = await getBalance(validatorsAccount[1].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);

            assert(
                await skaleDKG.getComplaintStartedTime(stringValue(web3.utils.soliditySha3(schainName))),
                (await web3.eth.getBlock(resCompl.blockNumber)).timestamp.toString()
            );

            balanceBefore = await getBalance(validatorsAccount[0].address);
            await skaleDKG.connect(validatorsAccount[0]).preResponse(
                stringValue(web3.utils.soliditySha3(schainName)),
                0,
                verificationVectors[indexes[0]],
                verificationVectorMult[indexes[0]],
                badEncryptedSecretKeyContributions[indexes[0]]
            );
            balance = await getBalance(validatorsAccount[0].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);

            balanceBefore = await getBalance(validatorsAccount[0].address);
            const result = await (await skaleDKG.connect(validatorsAccount[0]).response(
                stringValue(web3.utils.soliditySha3(schainName)),
                0,
                secretNumbers[indexes[0]],
                multipliedShares[indexes[1]]
            )).wait();
            balance = await getBalance(validatorsAccount[0].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);

            if (result.events) {
                assert.equal(result.events[0].event, "BadGuy");
                assert.equal(result.events[0].args?.nodeIndex.toString(), "0");

                assert.equal(result.events[2].event, "ChannelOpened");
                assert.equal(result.events[2].args?.schainId, stringValue(web3.utils.soliditySha3(schainName)));
            } else {
                assert(false, "No events were emitted");
            }

            const blockNumber = result.blockNumber;
            const timestamp = (await web3.eth.getBlock(blockNumber)).timestamp;

            assert.equal((await skaleDKG.getNumberOfBroadcasted(stringValue(web3.utils.soliditySha3(schainName)))).toString(), "0");
            assert.equal((await skaleDKG.getChannelStartedTime(stringValue(web3.utils.soliditySha3(schainName)))).toString(), timestamp.toString());

            rotCounter = await nodeRotation.getRotation(stringValue(web3.utils.soliditySha3(schainName)));
            assert.equal(rotCounter.rotationCounter.toString(), "1");

            balanceBefore = await getBalance(validatorsAccount[0].address);
            await expect(skaleDKG.connect(validatorsAccount[0]).complaint(
                stringValue(web3.utils.soliditySha3(schainName)),
                2,
                0
            )).to.emit(skaleDKG, "ComplaintError")
                .withArgs("Node is not in this group");
            balance = await getBalance(validatorsAccount[0].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);

            let res = await skaleDKG.connect(validatorsAccount[0]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    2
                );

            assert.equal(res, true);

            await skaleDKG.connect(validatorsAccount[0]).broadcast(
                stringValue(web3.utils.soliditySha3(schainName)),
                2,
                verificationVectors[indexes[0]],
                // the last symbol is spoiled in parameter below
                badEncryptedSecretKeyContributions[indexes[0]]
            );

            res = await skaleDKG.connect(validatorsAccount[1]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3(schainName)),
                    1
                );
            assert.equal(res, true);

            await skaleDKG.connect(validatorsAccount[1]).broadcast(
                stringValue(web3.utils.soliditySha3(schainName)),
                1,
                verificationVectors[indexes[1]],
                encryptedSecretKeyContributions[indexes[1]]
            );

            res = await skaleDKG.connect(validatorsAccount[0]).isAlrightPossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        2,
                    );
            assert.equal(res, true);

            await skaleDKG.connect(validatorsAccount[0]).alright(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        2
                    );

            res = await skaleDKG.connect(validatorsAccount[1]).isAlrightPossible(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1
                    );
            assert.equal(res, true);

            await skaleDKG.connect(validatorsAccount[1]).alright(
                        stringValue(web3.utils.soliditySha3(schainName)),
                        1
                    );
        });

        it("should process nodeExit 2 times correctly", async () => {
            const deposit = await schains.getSchainPrice(4, 5);

            await schains.addSchain(
                validator1.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, "d2"]));

            let nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("d2")));
            schainName = "d2";
            let index = 3;
            while (nodesInGroup[0].eq(1)) {
                await schains.deleteSchainByRoot(schainName);
                schainName = "d" + index;
                index++;
                await schains.addSchain(
                    validator1.address,
                    deposit,
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 4, 0, schainName]));
                nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3(schainName)));
            }

            let rotCounter = await nodeRotation.getRotation(stringValue(web3.utils.soliditySha3(schainName)));
            assert.equal(rotCounter.rotationCounter.toString(), "0");

            await nodes.createNode(validatorsAccount[0].address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000003",
                    publicIp: "0x7f000003",
                    publicKey: validatorsPublicKey[0],
                    name: "d203",
                    domainName: "somedomain.name"
                });

            await wallets.connect(owner).rechargeSchainWallet(stringValue(web3.utils.soliditySha3(schainName)), {value: 1e20.toString()});
            await skaleDKG.connect(validatorsAccount[0]).broadcast(
                stringValue(web3.utils.soliditySha3(schainName)),
                0,
                verificationVectors[indexes[0]],
                // the last symbol is spoiled in parameter below
                encryptedSecretKeyContributions[indexes[0]]
            );

            const res = await(await skaleDKG.connect(validatorsAccount[1]).broadcast(
                stringValue(web3.utils.soliditySha3(schainName)),
                1,
                verificationVectors[indexes[1]],
                encryptedSecretKeyContributions[indexes[1]]
            )).wait();
            assert(
                await skaleDKG.getAlrightStartedTime(stringValue(web3.utils.soliditySha3(schainName))),
                (await web3.eth.getBlock(res.blockNumber)).timestamp.toString()
            );
            let numOfCompl = await skaleDKG.getNumberOfCompleted(stringValue(web3.utils.soliditySha3(schainName)));
            assert(numOfCompl, "0");

            await skaleDKG.connect(validatorsAccount[0]).alright(
                stringValue(web3.utils.soliditySha3(schainName)),
                0
            );

            numOfCompl = await skaleDKG.getNumberOfCompleted(stringValue(web3.utils.soliditySha3(schainName)));
            assert(numOfCompl, "1");

            const resSuccess = await (await skaleDKG.connect(validatorsAccount[1]).alright(
                stringValue(web3.utils.soliditySha3(schainName)),
                1
            )).wait();

            numOfCompl = await skaleDKG.getNumberOfCompleted(stringValue(web3.utils.soliditySha3(schainName)));
            assert(numOfCompl, "2");

            assert(
                await skaleDKG.getTimeOfLastSuccesfulDKG(stringValue(web3.utils.soliditySha3(schainName))),
                (await web3.eth.getBlock(resSuccess.blockNumber)).timestamp.toString()
            );

            const comPubKey = await keyStorage.getCommonPublicKey(stringValue(web3.utils.soliditySha3(schainName)));
            assert.equal(comPubKey.x.a.toString() !== "0", true);
            assert.equal(comPubKey.x.b.toString() !== "0", true);
            assert.equal(comPubKey.y.a.toString() !== "0", true);
            assert.equal(comPubKey.y.b.toString() !== "0", true);

            await skaleManager.connect(validatorsAccount[1]).nodeExit(1);

            let prevPubKey = await keyStorage.getPreviousPublicKey(stringValue(web3.utils.soliditySha3(schainName)));
            assert(prevPubKey.x.a, "0");
            assert(prevPubKey.x.b, "0");
            assert(prevPubKey.y.a, "0");
            assert(prevPubKey.y.b, "0");

            await nodes.createNode(validatorsAccount[0].address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000004",
                    publicIp: "0x7f000004",
                    publicKey: validatorsPublicKey[0],
                    name: "d204",
                    domainName: "somedomain.name"
                }
            );

            rotCounter = await nodeRotation.getRotation(stringValue(web3.utils.soliditySha3(schainName)));
            assert.equal(rotCounter.rotationCounter.toString(), "1");

            await skaleDKG.connect(validatorsAccount[0]).broadcast(
                stringValue(web3.utils.soliditySha3(schainName)),
                0,
                verificationVectors[indexes[0]],
                // the last symbol is spoiled in parameter below
                encryptedSecretKeyContributions[indexes[0]]
            );

            await skaleDKG.connect(validatorsAccount[0]).broadcast(
                stringValue(web3.utils.soliditySha3(schainName)),
                2,
                verificationVectors[indexes[0]],
                encryptedSecretKeyContributions[indexes[0]],
            );

            await skaleDKG.connect(validatorsAccount[0]).alright(
                stringValue(web3.utils.soliditySha3(schainName)),
                0
            );

            assert(
                await skaleDKG.getTimeOfLastSuccesfulDKG(stringValue(web3.utils.soliditySha3(schainName))),
                (await web3.eth.getBlock(resSuccess.blockNumber)).timestamp.toString()
            );

            await skaleDKG.connect(validatorsAccount[0]).alright(
                stringValue(web3.utils.soliditySha3(schainName)),
                2
            );

            prevPubKey = await keyStorage.getPreviousPublicKey(stringValue(web3.utils.soliditySha3(schainName)));
            assert.equal(prevPubKey.x.a.toString() === comPubKey.x.a.toString(), true);
            assert.equal(prevPubKey.x.b.toString() === comPubKey.x.b.toString(), true);
            assert.equal(prevPubKey.y.a.toString() === comPubKey.y.a.toString(), true);
            assert.equal(prevPubKey.y.b.toString() === comPubKey.y.b.toString(), true);

            let allPrevPubKeys = await keyStorage.getAllPreviousPublicKeys(stringValue(web3.utils.soliditySha3(schainName)));
            assert.equal(allPrevPubKeys.length === 1, true);
            assert.equal(prevPubKey.x.a.toString() === allPrevPubKeys[0].x.a.toString(), true);
            assert.equal(prevPubKey.x.b.toString() === allPrevPubKeys[0].x.b.toString(), true);
            assert.equal(prevPubKey.y.a.toString() === allPrevPubKeys[0].y.a.toString(), true);
            assert.equal(prevPubKey.y.b.toString() === allPrevPubKeys[0].y.b.toString(), true);

            await skipTime(ethers, 43260);
            await skaleManager.connect(validatorsAccount[0]).nodeExit(2);

            rotCounter = await nodeRotation.getRotation(stringValue(web3.utils.soliditySha3(schainName)));
            assert.equal(rotCounter.rotationCounter.toString(), "2");

            await skaleDKG.connect(validatorsAccount[0]).broadcast(
                stringValue(web3.utils.soliditySha3(schainName)),
                0,
                verificationVectors[indexes[0]],
                // the last symbol is spoiled in parameter below
                encryptedSecretKeyContributions[indexes[0]]
            );

            await skaleDKG.connect(validatorsAccount[0]).broadcast(
                stringValue(web3.utils.soliditySha3(schainName)),
                3,
                verificationVectors[indexes[0]],
                encryptedSecretKeyContributions[indexes[0]]
            );

            await skaleDKG.connect(validatorsAccount[0]).alright(
                stringValue(web3.utils.soliditySha3(schainName)),
                0
            );

            await skaleDKG.connect(validatorsAccount[0]).alright(
                stringValue(web3.utils.soliditySha3(schainName)),
                3
            );

            allPrevPubKeys = await keyStorage.getAllPreviousPublicKeys(stringValue(web3.utils.soliditySha3(schainName)));
            assert.equal(allPrevPubKeys.length === 2, true);
            assert.equal(prevPubKey.x.a.toString() === allPrevPubKeys[0].x.a.toString(), true);
            assert.equal(prevPubKey.x.b.toString() === allPrevPubKeys[0].x.b.toString(), true);
            assert.equal(prevPubKey.y.a.toString() === allPrevPubKeys[0].y.a.toString(), true);
            assert.equal(prevPubKey.y.b.toString() === allPrevPubKeys[0].y.b.toString(), true);
        });

        it("16 nodes schain test", async () => {

            for (let i = 3; i <= 16; i++) {
                const hexIndex = ("0" + i.toString(16)).slice(-2);
                await nodes.createNode(validatorsAccount[0].address,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: validatorsPublicKey[0],
                        name: "d2" + hexIndex,
                        domainName: "somedomain.name"
                    });
            }

            const deposit = await schains.getSchainPrice(3, 5);

            await schains.addSchain(
                validator1.address,
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

            await wallets.connect(owner).rechargeSchainWallet(stringValue(web3.utils.soliditySha3("New16NodeSchain")), {value: 1e20.toString()});
            for (let i = 0; i < 16; i++) {
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                let broadPoss = await skaleDKG.connect(validatorsAccount[index]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i
                );
                assert.equal(broadPoss, true);
                const balanceBefore = await getBalance(validatorsAccount[index].address);
                await skaleDKG.connect(validatorsAccount[index]).broadcast(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i,
                    verificationVectorNew,
                    secretKeyContributions
                );
                const balance = await getBalance(validatorsAccount[index].address);
                balance.should.not.be.lessThan(balanceBefore);
                balance.should.be.almost(balanceBefore);
                broadPoss = await skaleDKG.connect(validatorsAccount[index]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i
                );
                assert.equal(broadPoss, false);
            }
            let comPubKey;
            for (let i = 0; i < 16; i++) {
                comPubKey = await keyStorage.getCommonPublicKey(stringValue(web3.utils.soliditySha3("New16NodeSchain")));
                assert(comPubKey.x.a, "0");
                assert(comPubKey.x.b, "0");
                assert(comPubKey.y.a, "0");
                assert(comPubKey.y.b, "0");
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                let alrightPoss = await skaleDKG.connect(validatorsAccount[index]).isAlrightPossible(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i
                );
                assert.equal(alrightPoss, true);

                const balanceBefore = await getBalance(validatorsAccount[index].address);
                await skaleDKG.connect(validatorsAccount[index]).alright(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i
                );
                const balance = await getBalance(validatorsAccount[index].address);
                balance.should.not.be.lessThan(balanceBefore);
                balance.should.be.almost(balanceBefore);

                alrightPoss = await skaleDKG.connect(validatorsAccount[index]).isAlrightPossible(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i
                );
                assert.equal(alrightPoss, false);
            }

            comPubKey = await keyStorage.getCommonPublicKey(stringValue(web3.utils.soliditySha3("New16NodeSchain")));
            assert.equal(comPubKey.x.a.toString() !== "0", true);
            assert.equal(comPubKey.x.b.toString() !== "0", true);
            assert.equal(comPubKey.y.a.toString() !== "0", true);
            assert.equal(comPubKey.y.b.toString() !== "0", true);

            const prevPubKey = await keyStorage.getPreviousPublicKey(stringValue(web3.utils.soliditySha3("New16NodeSchain")));
            assert(prevPubKey.x.a, "0");
            assert(prevPubKey.x.b, "0");
            assert(prevPubKey.y.a, "0");
            assert(prevPubKey.y.b, "0");

        });

        it("16 nodes schain test with incorrect complaint and response", async () => {

            for (let i = 3; i <= 16; i++) {
                const hexIndex = ("0" + i.toString(16)).slice(-2);
                await nodes.createNode(validatorsAccount[0].address,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: validatorsPublicKey[0],
                        name: "d2" + hexIndex,
                        domainName: "somedomain.name"
                    });
            }

            const deposit = await schains.getSchainPrice(3, 5);

            await schains.addSchain(
                validator1.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 3, 0, "New16NodeSchain"]));

            await nodes.createNode(validatorsAccount[0].address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f0000ff",
                    publicIp: "0x7f0000ff",
                    publicKey: validatorsPublicKey[0],
                    name: "d2ff",
                    domainName: "somedomain.name"
                });

            const secretKeyContributions = [];
            for (let i = 0; i < 16; i++) {
                secretKeyContributions[i] = encryptedSecretKeyContributions[0][0];
            }

            const verificationVectorNew = [];
            for (let i = 0; i < 11; i++) {
                verificationVectorNew[i] = verificationVectors[i % 2][0];
            }

            const verificationVectorMultNew = [
                {
                    x: {
                        a: "17194438700289937736888799343771909433659280658838586817455546535714250972965",
                        b: "20599845601114276224190290094010139071928880374844902020405844010104675829269"
                    },
                    y: {
                        a: "21078182228830189979024581609964511130944484501828138899170020075656894727168",
                        b: "780393043804401103204250478988289933707327885740151238575348025052446340736"
                    }
                },
                {
                    x: {
                        a: "19056449919363678002498844918597898897333951353086926304319833715542992244512",
                        b: "4674847982975643573922066052993530659739521275327220373195818068694758681837"
                    },
                    y: {
                        a: "8920983955513029529488328311353033907080303508488681579760788761713386129490",
                        b: "17446689480380380927144149357400533537993350530713480927137321363016554345108"
                    }
                },
                {
                    x: {
                        a: "17194438700289937736888799343771909433659280658838586817455546535714250972965",
                        b: "20599845601114276224190290094010139071928880374844902020405844010104675829269"
                    },
                    y: {
                        a: "21078182228830189979024581609964511130944484501828138899170020075656894727168",
                        b: "780393043804401103204250478988289933707327885740151238575348025052446340736"
                    }
                },
                {
                    x: {
                        a: "19056449919363678002498844918597898897333951353086926304319833715542992244512",
                        b: "4674847982975643573922066052993530659739521275327220373195818068694758681837"
                    },
                    y: {
                        a: "8920983955513029529488328311353033907080303508488681579760788761713386129490",
                        b: "17446689480380380927144149357400533537993350530713480927137321363016554345108"
                    }
                },
                {
                    x: {
                        a: "17194438700289937736888799343771909433659280658838586817455546535714250972965",
                        b: "20599845601114276224190290094010139071928880374844902020405844010104675829269"
                    },
                    y: {
                        a: "21078182228830189979024581609964511130944484501828138899170020075656894727168",
                        b: "780393043804401103204250478988289933707327885740151238575348025052446340736"
                    }
                },
                {
                    x: {
                        a: "19056449919363678002498844918597898897333951353086926304319833715542992244512",
                        b: "4674847982975643573922066052993530659739521275327220373195818068694758681837"
                    },
                    y: {
                        a: "8920983955513029529488328311353033907080303508488681579760788761713386129490",
                        b: "17446689480380380927144149357400533537993350530713480927137321363016554345108"
                    }
                },
                {
                    x: {
                        a: "17194438700289937736888799343771909433659280658838586817455546535714250972965",
                        b: "20599845601114276224190290094010139071928880374844902020405844010104675829269"
                    },
                    y: {
                        a: "21078182228830189979024581609964511130944484501828138899170020075656894727168",
                        b: "780393043804401103204250478988289933707327885740151238575348025052446340736"
                    }
                },
                {
                    x: {
                        a: "19056449919363678002498844918597898897333951353086926304319833715542992244512",
                        b: "4674847982975643573922066052993530659739521275327220373195818068694758681837"
                    },
                    y: {
                        a: "8920983955513029529488328311353033907080303508488681579760788761713386129490",
                        b: "17446689480380380927144149357400533537993350530713480927137321363016554345108"
                    }
                },
                {
                    x: {
                        a: "17194438700289937736888799343771909433659280658838586817455546535714250972965",
                        b: "20599845601114276224190290094010139071928880374844902020405844010104675829269"
                    },
                    y: {
                        a: "21078182228830189979024581609964511130944484501828138899170020075656894727168",
                        b: "780393043804401103204250478988289933707327885740151238575348025052446340736"
                    }
                },
                {
                    x: {
                        a: "19056449919363678002498844918597898897333951353086926304319833715542992244512",
                        b: "4674847982975643573922066052993530659739521275327220373195818068694758681837"
                    },
                    y: {
                        a: "8920983955513029529488328311353033907080303508488681579760788761713386129490",
                        b: "17446689480380380927144149357400533537993350530713480927137321363016554345108"
                    }
                },
                {
                    x: {
                        a: "17194438700289937736888799343771909433659280658838586817455546535714250972965",
                        b: "20599845601114276224190290094010139071928880374844902020405844010104675829269"
                    },
                    y: {
                        a: "21078182228830189979024581609964511130944484501828138899170020075656894727168",
                        b: "780393043804401103204250478988289933707327885740151238575348025052446340736"
                    }
                }
            ];

            const badVerificationVectorMultNew = [
                {
                    x: {
                        a: "10154228958897272268223398244445374804407241158746898754006080773714557731510",
                        b: "7112863543807919636475650744510902904523209938129155195039100133389638393549",
                    },
                    y: {
                        a: "21768438699801937267178734343536352529284837452234631851378657019248743330246",
                        b: "14882110352786150224152801061494378526163517092877366497614600338997657740082"
                    }
                },
                {
                    x: {
                        a: "1248667632695062670561268931617774077806084650378129379256669532859564508029",
                        b: "17452053616248801946480735259763848198940239014150780455387001867946296308759"
                    },
                    y: {
                        a: "16485540817409047841232455331735423476271139132513408791308272320095885297565",
                        b: "1653133216675488580463747086102609772036158366008438638939181371452419103385"
                    }
                },
                {
                    x: {
                        a: "11675558950119196450024929752469377063058436384926761101313724839160807593665",
                        b: "17732768720607214514486094192491344793116072928491953239486763000133907186438",
                    },
                    y: {
                        a: "13432298756653034185833211678944163140142717623005437121784472737292262373101",
                        b: "14110339253414843301684494933373858527368231010405277993851079519384397169197"
                    }
                },
                {
                    x: {
                        a: "9584019064829844444009198489581486711814097906659839681226801906009940572463",
                        b: "12107824998643851242827918509306463216168355067370393221191193070485279779390",
                    },
                    y: {
                        a: "19580566472357013186763924574192000207594597645107117809373083056842914940490",
                        b: "8794679904479452539164306519974903816512888205806864056397579905980954785401"
                    }
                },
                {
                    x: {
                        a: "2130209935019246155549995246903886828740438246396827711445645653390332117156",
                        b: "13221912120875807075515478876428331631581853949878600923256053337594207398617",
                    },
                    y: {
                        a: "21603354201215582016047966890012820144395350508101251242982378867147366901144",
                        b: "16523634804376948498364139221051541163051742172209882011772363864208807274034"
                    }
                },
                {
                    x: {
                        a: "12082915188531472921205529175994123445068975555965469829521765007130391593923",
                        b: "21543158686763553685556612813816902284906145524238469375329415638954493610201",
                    },
                    y: {
                        a: "17937091031791764762290837097925474025829773862624475660486320902321269115193",
                        b: "9264536753314031966650651143683040304188265631134293156508248502436789516089"
                    }
                },
                {
                    x: {
                        a: "18972811942945532508043129775798931760980250101980721732797902183102044469897",
                        b: "13083412181754810692648967245538916513638311335557149623191133098732454174457",
                    },
                    y: {
                        a: "7783468601658690845202523178165606772061182311960130648248521022973136884234",
                        b: "19157965566238242224666363778051148326455113870986844626792660777950813555743"
                    }
                },
                {
                    x: {
                        a: "3933335548630886279504438859061157265256033428483255147101535321284926484518",
                        b: "14556207322551605974643458945348566952340163178377445459387289633705550923433",
                    },
                    y: {
                        a: "17429391977463766585376970754776755784689292622817820026995318775879257372068",
                        b: "11085146587637456148546675651254282228825219171107369550994865257942426199849"
                    }
                },
                {
                    x: {
                        a: "19885254956678720421922538248190466060955439589409913173031772478890463595589",
                        b: "3477999361824866105752930035142603151450418578875228261007525825292639122461",
                    },
                    y: {
                        a: "6910227192094283780657808901626891939343655323795413586540729175567672213741",
                        b: "18652368631073485100242070980550333440902236504389106897804818069903542308265"
                    }
                },
                {
                    x: {
                        a: "19445404794705556904703016485229974761006671718631182178881183244971227244347",
                        b: "7194332561175437391157323777441541676799555741519656066727586527888924962767",
                    },
                    y: {
                        a: "7475823720353602259020867009312071705248782801369325384093990021516350877236",
                        b: "8254372800693092114855311272350222920712119088638713174193194242010612663394"
                    }
                },
                {
                    x: {
                        a: "8241625745229820895588185827411423204661272509389284927127735803006700323777",
                        b: "7285820856111603999669759733195534113879041779892849070055429879350957214964",
                    },
                    y: {
                        a: "4302675421566250512738497103370123257586342322106869428719422803216115368388",
                        b: "3515306631210980987236988275133120807890918260406845205305216104406265259179"
                    }
                }
            ];

            await wallets.connect(owner).rechargeSchainWallet(stringValue(web3.utils.soliditySha3("New16NodeSchain")), {value: 1e20.toString()});
            for (let i = 0; i < 16; i++) {
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                const broadPoss = await skaleDKG.connect(validatorsAccount[index]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i
                );
                assert.equal(broadPoss, true);
                await skaleDKG.connect(validatorsAccount[index]).broadcast(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i,
                    verificationVectorNew,
                    secretKeyContributions
                );
            }
            const nodesInGroup = await schainsInternal.getNodesInGroup(stringValue(web3.utils.soliditySha3("New16NodeSchain")));
            const accusedNode = nodesInGroup[14].toString();
            const complaintNode = nodesInGroup[0].toString();
            const someNode = nodesInGroup[7].toString();
            let indexToSend = 0;
            if (complaintNode === "1") {
                indexToSend = 1;
            }
            await skaleDKG.connect(validatorsAccount[indexToSend]).complaintBadData(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                complaintNode,
                accusedNode
            );
            const balanceBefore = await getBalance(validatorsAccount[indexToSend].address);
            await expect(skaleDKG.connect(validatorsAccount[indexToSend]).complaint(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                complaintNode,
                someNode
            )).to.emit(skaleDKG, "ComplaintError")
                .withArgs("One complaint is already sent");
            const balance = await getBalance(validatorsAccount[indexToSend].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);

            if (accusedNode === "1") {
                indexToSend = 1;
            } else {
                indexToSend = 0;
            }
            await skaleDKG.connect(validatorsAccount[indexToSend]).preResponse(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                accusedNode,
                verificationVectorNew,
                verificationVectorMult[indexes[indexToSend]],
                secretKeyContributions
            ).should.be.eventually.rejectedWith("Incorrect length of multiplied verification vector");
            await skaleDKG.connect(validatorsAccount[indexToSend]).preResponse(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                accusedNode,
                verificationVectorNew,
                badVerificationVectorMultNew,
                secretKeyContributions
            ).should.be.eventually.rejectedWith("Multiplied verification vector is incorrect");
            const resPreResp = await (await skaleDKG.connect(validatorsAccount[indexToSend]).preResponse(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                accusedNode,
                verificationVectorNew,
                verificationVectorMultNew,
                secretKeyContributions
            )).wait();
            const resResp = await (await skaleDKG.connect(validatorsAccount[indexToSend]).response(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                accusedNode,
                secretNumbers[indexes[indexToSend]],
                multipliedShares[indexes[indexToSend]]
            )).wait();
            if (resResp.events) {
                assert.equal(resResp.events[0].event, "BadGuy");
                assert.equal(resResp.events[0].args?.nodeIndex.toString(), accusedNode);
            } else {
                assert(false, "No events were emitted");
            }
            assert.isAtMost(resResp.gasUsed.toNumber() + resPreResp.gasUsed.toNumber(), 10000000);
        });

        it("16 nodes schain test with incorrect complaint and deleting Schain", async () => {

            for (let i = 3; i <= 16; i++) {
                const hexIndex = ("0" + i.toString(16)).slice(-2);
                await nodes.createNode(validatorsAccount[0].address,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: validatorsPublicKey[0],
                        name: "d2" + hexIndex,
                        domainName: "somedomain.name"
                    });
            }

            const deposit = await schains.getSchainPrice(3, 5);

            await schains.addSchain(
                validator1.address,
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

            await wallets.connect(owner).rechargeSchainWallet(stringValue(web3.utils.soliditySha3("New16NodeSchain")), {value: 1e20.toString()});
            for (let i = 0; i < 15; i++) {
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                const broadPoss = await skaleDKG.connect(validatorsAccount[index]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i
                );
                assert.equal(broadPoss, true);
                await skaleDKG.connect(validatorsAccount[index]).broadcast(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i,
                    verificationVectorNew,
                    secretKeyContributions
                );
            }
            const accusedNode = "15";
            const complaintNode = "7";
            await skipTime(ethers, 1800);

            let balanceBefore = await getBalance(validatorsAccount[0].address);
            await skaleDKG.connect(validatorsAccount[0]).complaint(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                complaintNode,
                accusedNode
            );
            let balance = await getBalance(validatorsAccount[0].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);

            balanceBefore = await getBalance(validatorsAccount[0].address);
            await expect(skaleDKG.connect(validatorsAccount[0]).complaint(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                8,
                accusedNode
            )).to.emit(skaleDKG, "ComplaintError")
                .withArgs("Group is not created");
            balance = await getBalance(validatorsAccount[0].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);
            await skaleManager.connect(validator1).deleteSchain("New16NodeSchain");
        });

        it("16 nodes schain test with incorrect complaint and restart Schain creation", async () => {

            for (let i = 3; i <= 16; i++) {
                const hexIndex = ("0" + i.toString(16)).slice(-2);
                await nodes.createNode(validatorsAccount[0].address,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: validatorsPublicKey[0],
                        name: "d2" + hexIndex,
                        domainName: "somedomain.name"
                    });
            }

            const deposit = await schains.getSchainPrice(3, 5);

            await schains.addSchain(
                validator1.address,
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

            await wallets.connect(owner).rechargeSchainWallet(stringValue(web3.utils.soliditySha3("New16NodeSchain")), {value: 1e20.toString()});
            for (let i = 0; i < 15; i++) {
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                const broadPoss = await skaleDKG.connect(validatorsAccount[index]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i
                );
                assert.equal(broadPoss, true);
                await skaleDKG.connect(validatorsAccount[index]).broadcast(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i,
                    verificationVectorNew,
                    secretKeyContributions
                );
            }
            const accusedNode = "15";
            const complaintNode = "7";
            await skipTime(ethers, 1800);
            let balanceBefore = await getBalance(validatorsAccount[0].address);
            const res = await skaleDKG.connect(validatorsAccount[0]).complaint(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                complaintNode,
                accusedNode
            );
            let balance = await getBalance(validatorsAccount[0].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);

            balanceBefore = await getBalance(validatorsAccount[0].address);
            await expect(skaleDKG.connect(validatorsAccount[0]).complaint(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                8,
                accusedNode
            )).to.emit(skaleDKG, "ComplaintError")
                .withArgs("Group is not created");
            balance = await getBalance(validatorsAccount[0].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);

            await nodes.createNode(validatorsAccount[0].address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f0000ff",
                    publicIp: "0x7f0000ff",
                    publicKey: validatorsPublicKey[0],
                    name: "d2ff",
                    domainName: "somedomain.name"
                }
            );
            await schains.restartSchainCreation("New16NodeSchain");

            for (let i = 0; i < 17; i++) {
                if (i.toString() === accusedNode) {
                    continue;
                }
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                const broadTx = await skaleDKG.connect(validatorsAccount[index]).broadcast(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i,
                    verificationVectorNew,
                    secretKeyContributions
                );
            }
            let comPubKey;
            for (let i = 0; i < 17; i++) {
                if (i.toString() === accusedNode) {
                    continue;
                }
                comPubKey = await keyStorage.getCommonPublicKey(stringValue(web3.utils.soliditySha3("New16NodeSchain")));
                assert(comPubKey.x.a, "0");
                assert(comPubKey.x.b, "0");
                assert(comPubKey.y.a, "0");
                assert(comPubKey.y.b, "0");
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                await skaleDKG.connect(validatorsAccount[index]).alright(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i
                );
            }

            comPubKey = await keyStorage.getCommonPublicKey(stringValue(web3.utils.soliditySha3("New16NodeSchain")));
            assert.equal(comPubKey.x.a.toString() !== "0", true);
            assert.equal(comPubKey.x.b.toString() !== "0", true);
            assert.equal(comPubKey.y.a.toString() !== "0", true);
            assert.equal(comPubKey.y.b.toString() !== "0", true);
        });

        it("16 nodes schain test with incorrect complaint and creating new schain", async () => {

            for (let i = 3; i <= 16; i++) {
                const hexIndex = ("0" + i.toString(16)).slice(-2);
                await nodes.createNode(validatorsAccount[0].address,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f0000" + hexIndex,
                        publicIp: "0x7f0000" + hexIndex,
                        publicKey: validatorsPublicKey[0],
                        name: "d2" + hexIndex,
                        domainName: "somedomain.name"
                    });
            }

            const deposit = await schains.getSchainPrice(3, 5);

            await schains.addSchain(
                validator1.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "New16NodeSchain"]));

            const secretKeyContributions = [];
            for (let i = 0; i < 16; i++) {
                secretKeyContributions[i] = encryptedSecretKeyContributions[0][0];
            }

            const verificationVectorNew = [];
            for (let i = 0; i < 11; i++) {
                verificationVectorNew[i] = verificationVectors[i % 2][0];
            }

            await wallets.connect(owner).rechargeSchainWallet(stringValue(web3.utils.soliditySha3("New16NodeSchain")), {value: 1e20.toString()});
            for (let i = 0; i < 15; i++) {
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                const broadPoss = await skaleDKG.connect(validatorsAccount[index]).isBroadcastPossible(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i
                );
                assert.equal(broadPoss, true);
                await skaleDKG.connect(validatorsAccount[index]).broadcast(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                    i,
                    verificationVectorNew,
                    secretKeyContributions
                );
            }
            const accusedNode = "15";
            const complaintNode = "7";
            await skipTime(ethers, 1800);
            let balanceBefore = await getBalance(validatorsAccount[0].address);
            const resC = await skaleDKG.connect(validatorsAccount[0]).complaint(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                complaintNode,
                accusedNode
            );
            let balance = await getBalance(validatorsAccount[0].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);

            balanceBefore = await getBalance(validatorsAccount[0].address);
            await expect(skaleDKG.connect(validatorsAccount[0]).complaint(
                stringValue(web3.utils.soliditySha3("New16NodeSchain")),
                8,
                accusedNode
            )).to.emit(skaleDKG, "ComplaintError")
                .withArgs("Group is not created");
            balance = await getBalance(validatorsAccount[0].address);
            balance.should.not.be.lessThan(balanceBefore);
            balance.should.be.almost(balanceBefore);
            // await nodes.createNode(validatorsAccount[0].address,
            //     {
            //         port: 8545,
            //         nonce: 0,
            //         ip: "0x7f0000ff",
            //         publicIp: "0x7f0000ff",
            //         publicKey: validatorsPublicKey[0],
            //         name: "d2ff",
            //         domainName: "somedomain.name"
            //     }
            // );

            await schains.addSchain(
                validator1.address,
                deposit,
                web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [5, 1, 0, "New16NodeSchain1"])
            );

            await wallets.connect(owner).rechargeSchainWallet(stringValue(web3.utils.soliditySha3("New16NodeSchain1")), {value: 1e20.toString()});

            for (let i = 0; i < 16; i++) {
                // if (i.toString() === accusedNode) {
                //     continue;
                // }
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                const broadTx = await skaleDKG.connect(validatorsAccount[index]).broadcast(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain1")),
                    i,
                    verificationVectorNew,
                    secretKeyContributions
                );
            }
            let comPubKey;
            for (let i = 0; i < 16; i++) {
                // if (i.toString() === accusedNode) {
                //     continue;
                // }
                comPubKey = await keyStorage.getCommonPublicKey(stringValue(web3.utils.soliditySha3("New16NodeSchain1")));
                assert(comPubKey.x.a, "0");
                assert(comPubKey.x.b, "0");
                assert(comPubKey.y.a, "0");
                assert(comPubKey.y.b, "0");
                let index = 0;
                if (i === 1) {
                    index = 1;
                }
                await skaleDKG.connect(validatorsAccount[index]).alright(
                    stringValue(web3.utils.soliditySha3("New16NodeSchain1")),
                    i
                );
            }

            comPubKey = await keyStorage.getCommonPublicKey(stringValue(web3.utils.soliditySha3("New16NodeSchain1")));
            assert.equal(comPubKey.x.a.toString() !== "0", true);
            assert.equal(comPubKey.x.b.toString() !== "0", true);
            assert.equal(comPubKey.y.a.toString() !== "0", true);
            assert.equal(comPubKey.y.b.toString() !== "0", true);
        });
    });
});
