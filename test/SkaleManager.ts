import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {ConstantsHolder,
         ContractManager,
         DelegationController,
         DelegationPeriodManager,
         Distributor,
         Nodes,
         SchainsInternalMock,
         Schains,
         SkaleDKGTester,
         SkaleManager,
         SkaleToken,
         ValidatorService,
         BountyV2,
         Wallets} from "../typechain-types";

import {privateKeys} from "./tools/private-keys";

import {deployConstantsHolder} from "./tools/deploy/constantsHolder";
import {deployContractManager} from "./tools/deploy/contractManager";
import {deploySkaleDKGTester} from "./tools/deploy/test/skaleDKGTester";
import {deployDelegationController} from "./tools/deploy/delegation/delegationController";
import {deployDelegationPeriodManager} from "./tools/deploy/delegation/delegationPeriodManager";
import {deployDistributor} from "./tools/deploy/delegation/distributor";
import {deployValidatorService} from "./tools/deploy/delegation/validatorService";
import {deployNodes} from "./tools/deploy/nodes";
import {deploySchainsInternalMock} from "./tools/deploy/test/schainsInternalMock";
import {deploySchains} from "./tools/deploy/schains";
import {deploySkaleManager} from "./tools/deploy/skaleManager";
import {deploySkaleToken} from "./tools/deploy/skaleToken";
import {skipTime, currentTime, nextMonth} from "./tools/time";
import {deployBounty} from "./tools/deploy/bounty";
import {ContractTransactionResponse, Wallet} from "ethers";
import {deployTimeHelpers} from "./tools/deploy/delegation/timeHelpers";
import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers";
import {deployWallets} from "./tools/deploy/wallets";
import chaiAlmost from "chai-almost";
import {fastBeforeEach} from "./tools/mocha";
import {getPublicKey} from "./tools/signatures";
import {schainParametersType, SchainType} from "./tools/types";

chai.should();
chai.use(chaiAsPromised);

async function ethSpent(response: ContractTransactionResponse) {
    const receipt = await response.wait();
    if(!receipt) {
        throw new Error();
    }
    if (receipt.gasPrice) {
        return receipt.gasPrice * receipt.gasUsed;
    } else {
        throw new ReferenceError("gasPrice is undefined");
    }
}

describe("SkaleManager", () => {
    let owner: SignerWithAddress;
    let validator: Wallet
    let developer: SignerWithAddress
    let hacker: SignerWithAddress
    let nodeAddress: Wallet

    let contractManager: ContractManager;
    let constantsHolder: ConstantsHolder;
    let nodesContract: Nodes;
    let skaleManager: SkaleManager;
    let skaleToken: SkaleToken;
    let schainsInternal: SchainsInternalMock;
    let schains: Schains;
    let validatorService: ValidatorService;
    let delegationController: DelegationController;
    let delegationPeriodManager: DelegationPeriodManager;
    let distributor: Distributor;
    let skaleDKG: SkaleDKGTester;
    let bountyContract: BountyV2;
    let wallets: Wallets;

    fastBeforeEach(async() => {
        chai.use(chaiAlmost(0.002));
        [owner, developer, hacker] = await ethers.getSigners();

        validator = new Wallet(String(privateKeys[1])).connect(ethers.provider);
        nodeAddress = new Wallet(String(privateKeys[4])).connect(ethers.provider);
        await owner.sendTransaction({to: nodeAddress.address, value: ethers.parseEther("10000")});
        await owner.sendTransaction({to: validator.address, value: ethers.parseEther("10000")});

        contractManager = await deployContractManager();

        skaleToken = await deploySkaleToken(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);
        nodesContract = await deployNodes(contractManager);
        schainsInternal = await deploySchainsInternalMock(contractManager);
        schains = await deploySchains(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        validatorService = await deployValidatorService(contractManager);
        delegationController = await deployDelegationController(contractManager);
        delegationPeriodManager = await deployDelegationPeriodManager(contractManager);
        distributor = await deployDistributor(contractManager);
        skaleDKG = await deploySkaleDKGTester(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG);
        await contractManager.setContractsAddress("SchainsInternal", schainsInternal);
        bountyContract = await deployBounty(contractManager);
        wallets = await deployWallets(contractManager);

        const CONSTANTS_HOLDER_MANAGER_ROLE = await constantsHolder.CONSTANTS_HOLDER_MANAGER_ROLE();
        await constantsHolder.grantRole(CONSTANTS_HOLDER_MANAGER_ROLE, owner.address);
        const BOUNTY_REDUCTION_MANAGER_ROLE = await bountyContract.BOUNTY_REDUCTION_MANAGER_ROLE();
        await bountyContract.grantRole(BOUNTY_REDUCTION_MANAGER_ROLE, owner.address);
        const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
        const NODE_MANAGER_ROLE = await nodesContract.NODE_MANAGER_ROLE();
        await nodesContract.grantRole(NODE_MANAGER_ROLE, owner.address);
        const DELEGATION_PERIOD_SETTER_ROLE = await delegationPeriodManager.DELEGATION_PERIOD_SETTER_ROLE();
        await delegationPeriodManager.grantRole(DELEGATION_PERIOD_SETTER_ROLE, owner.address);

        const premined = "100000000000000000000000000";
        await skaleToken.mint(owner.address, premined, "0x", "0x");
        await constantsHolder.setMSR(5);
        await constantsHolder.setLaunchTimestamp(await currentTime()); // to allow bounty withdrawing
        await bountyContract.enableBountyReduction();
    });

    it("should fail to process token fallback if sent not from SkaleToken", async () => {
        await skaleManager.connect(validator).tokensReceived(
            hacker.address,
            validator.address,
            developer.address,
            5,
            "0x11",
            "0x11"
        ).should.be.eventually.rejectedWith("Message sender is invalid");
    });

    it("should transfer ownership", async () => {
        await skaleManager.connect(hacker).grantRole(await skaleManager.DEFAULT_ADMIN_ROLE(), hacker.address)
            .should.be.eventually.rejectedWith("AccessControl: sender must be an admin to grant");

        await skaleManager.grantRole(await skaleManager.DEFAULT_ADMIN_ROLE(), hacker.address);

        await skaleManager.hasRole(await skaleManager.DEFAULT_ADMIN_ROLE(), hacker.address).should.be.eventually.true;
    });

    it("should allow only owner to set a version", async () => {
        await skaleManager.connect(hacker).setVersion("bad")
            .should.be.eventually.rejectedWith("Caller is not the owner");

        await skaleManager.setVersion("good");
        (await skaleManager.version()).should.be.equal("good");
    });

    describe("when validator has delegated SKALE tokens", () => {
        const validatorId = 1;
        const day = BigInt(60 * 60 * 24);
        const delegatedAmount = 1e7;

        fastBeforeEach(async () => {
            await validatorService.connect(validator).registerValidator("D2", "D2 is even", 150, 0);
            const validatorIndex = await validatorService.getValidatorId(validator.address);
            const signature = await nodeAddress.signMessage(
                ethers.solidityPackedKeccak256(
                    ["uint"],
                    [validatorIndex]
                )
            );
            await validatorService.connect(validator).linkNodeAddress(nodeAddress.address, signature);

            await skaleToken.transfer(validator.address, 10 * delegatedAmount);
            await validatorService.enableValidator(validatorId);
            await delegationPeriodManager.setDelegationPeriod(12, 200);
            await delegationController.connect(validator).delegate(validatorId, delegatedAmount, 12, "Hello from D2");
            const delegationId = 0;
            await delegationController.connect(validator).acceptPendingDelegation(delegationId);

            await nextMonth(contractManager);
        });

        it("should create a node", async () => {
            await skaleManager.connect(nodeAddress).createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                getPublicKey(nodeAddress), // public key
                "d2", // name
                "some.domain.name");

            (await nodesContract.numberOfActiveNodes()).should.be.equal(1);
            (await nodesContract.getNodePort(0)).should.be.equal(8545);
        });

        it("should not allow to create node if validator became untrusted", async () => {
            await nextMonth(contractManager);
            await constantsHolder.setMSR(100);

            await validatorService.disableValidator(validatorId);
            await skaleManager.connect(nodeAddress).createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                getPublicKey(nodeAddress), // public key
                "d2", // name
                "some.domain.name").should.be.eventually.rejectedWith("Validator is not authorized to create a node");
            await validatorService.enableValidator(validatorId);
            await skaleManager.connect(nodeAddress).createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                getPublicKey(nodeAddress), // public key
                "d2", // name
                "some.domain.name");
        });

        describe("when node is created", () => {
            fastBeforeEach(async () => {
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    getPublicKey(nodeAddress), // public key
                    "d2", // name
                    "some.domain.name");
                await wallets.rechargeValidatorWallet(validatorId, {value: ethers.parseEther('5.0')});
            });

            it("should fail to init exiting of someone else's node", async () => {
                await nodesContract.initExit(0);
                await skaleManager.connect(hacker).nodeExit(0)
                    .should.be.eventually.rejectedWith("Sender is not permitted to call this function");
            });

            it("should reject if node in maintenance call nodeExit", async () => {
                await nodesContract.setNodeInMaintenance(0);
                await nodesContract.initExit(0).should.be.eventually.rejectedWith("Node should be Active");
                // await skaleManager.connect(nodeAddress).nodeExit(0).should.be.eventually.rejectedWith("Node should be Leaving");
            });

            it("should be Left if there is no schains and node has exited", async () => {
                await nodesContract.initExit(0);
                await skaleManager.connect(nodeAddress).nodeExit(0);
                await nodesContract.isNodeLeft(0).should.be.eventually.true;
            });

            it("should perform nodeExit if validator unlinked his node address", async () => {
                await validatorService.connect(validator).unlinkNodeAddress(nodeAddress.address);
                await nodesContract.initExit(0);
                await skaleManager.connect(nodeAddress).nodeExit(0);
                await nodesContract.isNodeLeft(0).should.be.eventually.true;
            });

            it("should create and remove node from validator address", async () => {
                (await validatorService.getValidatorIdByNodeAddress(validator.address)).should.be.equal(1);
                await skaleManager.connect(validator).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000002", // ip
                    "0x7f000002", // public ip
                    getPublicKey(validator), // public key
                    "d3", // name
                    "some.domain.name"
                );
                await nodesContract.initExit(1);
                await skaleManager.connect(validator).nodeExit(1);

                await nodesContract.isNodeLeft(1).should.be.eventually.true;
                (await validatorService.getValidatorIdByNodeAddress(validator.address)).should.be.equal(1);
            });

            it("should pay bounty if Node is In Active state", async () => {
                const minNodeBalance = await constantsHolder.minNodeBalance();
                await nodeAddress.sendTransaction({
                    to: owner.address,
                    value: await ethers.provider.getBalance(nodeAddress) - minNodeBalance
                });
                await nextMonth(contractManager);
                await skipTime(await bountyContract.nodeCreationWindowSeconds());
                const spentValue = await ethSpent(await skaleManager.connect(nodeAddress).getBounty(0, {gasLimit: 2e6}));
                const balance = await ethers.provider.getBalance(nodeAddress);
                (balance + spentValue).should.be.least(minNodeBalance);
                (balance + spentValue).should.be.closeTo(minNodeBalance, 1e13);
            });

            it("should pay bounty if Node is In Leaving state", async () => {
                await nodesContract.initExit(0);
                await nextMonth(contractManager);
                await skipTime(await bountyContract.nodeCreationWindowSeconds())
                await skaleManager.connect(nodeAddress).getBounty(0);
            });

            it("should pay bounty if Node is In Maintenance state", async () => {
                await nodesContract.connect(validator).setNodeInMaintenance(0);
                await nextMonth(contractManager);
                await skipTime(await bountyContract.nodeCreationWindowSeconds())
                await skaleManager.connect(nodeAddress).getBounty(0);
            });

            it("should not pay bounty if Node is In Left state", async () => {
                await nodesContract.initExit(0);
                await nodesContract.completeExit(0);
                await nextMonth(contractManager);
                await skipTime(await bountyContract.nodeCreationWindowSeconds())
                await skaleManager.connect(nodeAddress).getBounty(0).should.be.eventually.rejectedWith("The node must not be in Left state");
            });

            it("should not pay bounty if Node is incompliant", async () => {
                const nodeIndex = 0;
                await nodesContract.grantRole(await nodesContract.COMPLIANCE_ROLE(), owner.address);
                await nodesContract.setNodeIncompliant(nodeIndex);

                await nextMonth(contractManager);
                await skipTime(await bountyContract.nodeCreationWindowSeconds())
                await skaleManager.connect(nodeAddress).getBounty(nodeIndex).should.be.eventually.rejectedWith("The node is incompliant");
            });

            it("should pay bounty according to the schedule", async () => {
                const timeHelpers = await deployTimeHelpers(contractManager);

                await bountyContract.disableBountyReduction();
                await constantsHolder.setMSR(delegatedAmount);

                const timeLimit = 300 * 1000;
                const start = Date.now();
                const launch = await constantsHolder.launchTimestamp();
                const launchMonth = await timeHelpers.timestampToMonth(launch);

                const schedule = [
                    385000000n,
                    346500000n,
                    308000000n,
                    269500000n,
                    231000000n,
                    192500000n
                ]
                for (let bounty = schedule[schedule.length - 1] / 2n; bounty > 1; bounty /= 2n) {
                    for (let i = 0; i < 3; ++i) {
                        schedule.push(bounty);
                    }
                }

                let mustBePaid = 0n;
                await nextMonth(contractManager);
                for (let year = 0; year < schedule.length && (Date.now() - start) < 0.9 * timeLimit; ++year) {
                    for (let monthIndex = 0n; monthIndex < 12; ++monthIndex) {
                        const monthEnd = await timeHelpers.monthToTimestamp(launchMonth + BigInt(12 * year) + monthIndex + 1n);
                        if (await currentTime() < monthEnd) {
                            await skipTime(monthEnd - await currentTime() - day);
                            await skaleManager.connect(nodeAddress).getBounty(0);
                        }
                    }
                    const bountyWasPaid = await skaleToken.balanceOf(distributor);
                    mustBePaid = mustBePaid + schedule[year];

                    const abs = (value: bigint) => {
                        if (value < 0) {
                            return - value;
                        }
                        return value;
                    }

                    abs(BigInt(ethers.formatEther(bountyWasPaid)) - mustBePaid).should.be.lessThan(35); // 35 because of rounding errors in JS
                }
            });
        });

        describe("when two nodes are created", () => {
            fastBeforeEach(async () => {
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    getPublicKey(nodeAddress), // public key
                    "d2", // name
                    "some.domain.name");
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000002", // ip
                    "0x7f000002", // public ip
                    getPublicKey(nodeAddress), // public key
                    "d3", // name
                    "some.domain.name");
            });

            it("should fail to initiate exiting of first node from another account", async () => {
                await nodesContract.connect(hacker).initExit(0)
                    .should.be.eventually.rejectedWith("NODE_MANAGER_ROLE is required");
                await skaleManager.connect(hacker).nodeExit(0)
                    .should.be.eventually.rejectedWith("Sender is not permitted to call this function");
            });

            it("should fail to initiate exiting of second node from another account", async () => {
                await nodesContract.connect(hacker).initExit(1)
                    .should.be.eventually.rejectedWith("NODE_MANAGER_ROLE is required");
                await skaleManager.connect(hacker).nodeExit(1)
                    .should.be.eventually.rejectedWith("Sender is not permitted to call this function");
            });

            it("should initiate exiting of first node", async () => {
                await nodesContract.initExit(0);
                await skaleManager.connect(nodeAddress).nodeExit(0);

                await nodesContract.isNodeLeft(0).should.be.eventually.true;
            });

            it("should initiate exiting of second node", async () => {
                await nodesContract.initExit(1);
                await skaleManager.connect(nodeAddress).nodeExit(1);

                await nodesContract.isNodeLeft(1).should.be.eventually.true;
            });
        });

        describe("when 18 nodes are in the system", () => {
            let d2SchainHash: string

            fastBeforeEach(async () => {
                await skaleToken.transfer(validator.address, "0x3635c9adc5dea00000");
                for (let i = 0; i < 18; ++i) {
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        getPublicKey(nodeAddress), // public key
                        `d2-${i}`, // name
                        "some.domain.name");
                }

                const schainHash = ethers.solidityPackedKeccak256(["string"], ["d2"]);
                if (schainHash) {
                    d2SchainHash = schainHash;
                }
            });

            it("should fail to create schain if validator doesn't meet MSR", async () => {
                await constantsHolder.setMSR(delegatedAmount + 1);
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    getPublicKey(nodeAddress), // public key
                    "d2", // name
                    "some.domain.name").should.be.eventually.rejectedWith("Validator must meet the Minimum Staking Requirement");
            });

            describe("when developer has SKALE tokens", () => {
                fastBeforeEach(async () => {
                    await skaleToken.transfer(developer.address, "0x3635c9adc5dea00000");
                });

                it("should create schain", async () => {
                    await skaleToken.connect(developer).send(
                        skaleManager,
                        "0x1cc2d6d04a2ca",
                        ethers.AbiCoder.defaultAbiCoder().encode(
                            [schainParametersType],
                            [{
                                lifetime: 5,
                                typeOfSchain: SchainType.LARGE,
                                nonce: 0,
                                name: "d2",
                                originator: ethers.ZeroAddress,
                                options: []
                            }]
                        ));

                    const schain = await schainsInternal.schains(d2SchainHash);
                    schain[0].should.be.equal("d2");
                });

                it("should not create schain if schain admin set too low schain lifetime", async () => {
                    const SECONDS_TO_YEAR = 31622400;
                    await constantsHolder.setMinimalSchainLifetime(SECONDS_TO_YEAR);

                    await skaleToken.connect(developer).send(
                        skaleManager,
                        "0x1cc2d6d04a2ca",
                        ethers.AbiCoder.defaultAbiCoder().encode(
                            [schainParametersType],
                            [{
                                lifetime: 5,
                                typeOfSchain: SchainType.LARGE,
                                nonce: 0,
                                name: "d2",
                                originator: ethers.ZeroAddress,
                                options: []
                            }]
                        )
                    ).should.be.eventually.rejectedWith("Minimal schain lifetime should be satisfied");

                    await constantsHolder.setMinimalSchainLifetime(4);
                    await skaleToken.connect(developer).send(
                        skaleManager,
                        "0x1cc2d6d04a2ca",
                        ethers.AbiCoder.defaultAbiCoder().encode(
                            [schainParametersType],
                            [{
                                lifetime: 5,
                                typeOfSchain: SchainType.LARGE,
                                nonce: 0,
                                name: "d2",
                                originator: ethers.ZeroAddress,
                                options: []
                            }]
                        )
                    );

                    const schain = await schainsInternal.schains(d2SchainHash);
                    schain[0].should.be.equal("d2");
                });


                it("should not allow to create schain if certain date has not reached", async () => {
                    const unreachableDate = 2n ** 256n - 1n;
                    await constantsHolder.setSchainCreationTimeStamp(unreachableDate);
                    await skaleToken.connect(developer).send(
                        skaleManager,
                        "0x1cc2d6d04a2ca",
                        ethers.AbiCoder.defaultAbiCoder().encode(
                            [schainParametersType],
                            [{
                                lifetime: 4,
                                typeOfSchain: SchainType.LARGE,
                                nonce: 0,
                                name: "d2",
                                originator: ethers.ZeroAddress,
                                options: []
                            }]
                        )
                    ).should.be.eventually.rejectedWith("It is not a time for creating Schain");
                });

                describe("when schain is created", () => {
                    fastBeforeEach(async () => {
                        await skaleToken.connect(developer).send(
                            skaleManager,
                            "0x1cc2d6d04a2ca",
                            ethers.AbiCoder.defaultAbiCoder().encode(
                                [schainParametersType],
                                [{
                                    lifetime: 5,
                                    typeOfSchain: SchainType.LARGE,
                                    nonce: 0,
                                    name: "d2",
                                    originator: ethers.ZeroAddress,
                                    options: []
                                }]
                            )
                        );
                        await skaleDKG.setSuccessfulDKGPublic(
                            d2SchainHash
                        );
                    });

                    it("should fail to delete schain if sender is not owner of it", async () => {
                        await skaleManager.connect(hacker).deleteSchain("d2")
                            .should.be.eventually.rejectedWith("Message sender is not the owner of the Schain");
                    });

                    it("should delete schain", async () => {
                        await skaleManager.connect(developer).deleteSchain("d2");

                        await schainsInternal.getSchains().should.be.eventually.empty;
                    });

                    it("should delete schain after deleting node", async () => {
                        const nodes = await schainsInternal.getNodesInGroup(d2SchainHash);
                        await nodesContract.initExit(nodes[0]);
                        await skaleManager.connect(nodeAddress).nodeExit(nodes[0]);
                        await skaleDKG.setSuccessfulDKGPublic(d2SchainHash);
                        await skaleManager.connect(developer).deleteSchain("d2");
                    });
                });

                describe("when another schain is created", () => {
                    fastBeforeEach(async () => {
                        await skaleToken.connect(developer).send(
                            skaleManager,
                            "0x1cc2d6d04a2ca",
                            ethers.AbiCoder.defaultAbiCoder().encode(
                                [schainParametersType],
                                [{
                                    lifetime: 5,
                                    typeOfSchain: SchainType.LARGE,
                                    nonce: 0,
                                    name: "d3",
                                    originator: ethers.ZeroAddress,
                                    options: []
                                }]
                            )
                        );
                    });

                    it("should fail to delete schain if sender is not owner of it", async () => {
                        await skaleManager.connect(hacker).deleteSchain("d3")
                            .should.be.eventually.rejectedWith("Message sender is not the owner of the Schain");
                    });

                    it("should delete schain by root", async () => {
                        const SCHAIN_REMOVAL_ROLE = await skaleManager.SCHAIN_REMOVAL_ROLE();
                        await skaleManager.grantRole(SCHAIN_REMOVAL_ROLE, owner.address);
                        await skaleManager.deleteSchainByRoot("d3");

                        await schainsInternal.getSchains().should.be.eventually.empty;
                    });
                });
            });
        });

        describe("when 32 nodes are in the system", () => {
            let d2SchainHash: string;
            let d3SchainHash: string;

            fastBeforeEach(async () => {
                await constantsHolder.setMSR(3);

                for (let i = 0; i < 32; ++i) {
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        getPublicKey(nodeAddress), // public key
                        `d2-${i}`, // name
                        "some.domain.name");
                }

                d2SchainHash = ethers.solidityPackedKeccak256(["string"], ["d2"]);
                d3SchainHash = ethers.solidityPackedKeccak256(["string"], ["d3"]);
            });

            describe("when developer has SKALE tokens", () => {
                fastBeforeEach(async () => {
                    await skaleToken.transfer(developer.address, "0x3635C9ADC5DEA000000");
                });

                it("should create 2 medium schains", async () => {
                    const price = await schains.getSchainPrice(3, 5)
                    await skaleToken.connect(developer).send(
                        skaleManager,
                        price,
                        ethers.AbiCoder.defaultAbiCoder().encode(
                            [schainParametersType],
                            [{
                                lifetime: 5,
                                typeOfSchain: SchainType.LARGE,
                                nonce: 0,
                                name: "d2",
                                originator: ethers.ZeroAddress,
                                options: []
                            }]
                        )
                    );

                    const schain1 = await schainsInternal.schains(d2SchainHash);
                    schain1[0].should.be.equal("d2");

                    await skaleToken.connect(developer).send(
                        skaleManager,
                        price,
                        ethers.AbiCoder.defaultAbiCoder().encode(
                            [schainParametersType],
                            [{
                                lifetime: 5,
                                typeOfSchain: SchainType.LARGE,
                                nonce: 0,
                                name: "d3",
                                originator: ethers.ZeroAddress,
                                options: []
                            }]
                        )
                    );

                    const schain2 = await schainsInternal.schains(d3SchainHash);
                    schain2[0].should.be.equal("d3");
                });

                describe("when schains are created", () => {
                    fastBeforeEach(async () => {
                        await skaleToken.connect(developer).send(
                            skaleManager,
                            "0x1cc2d6d04a2ca",
                            ethers.AbiCoder.defaultAbiCoder().encode(
                                [schainParametersType],
                                [{
                                    lifetime: 5,
                                    typeOfSchain: SchainType.LARGE,
                                    nonce: 0,
                                    name: "d2",
                                    originator: ethers.ZeroAddress,
                                    options: []
                                }]
                            )
                        );

                        await skaleToken.connect(developer).send(
                            skaleManager,
                            "0x1cc2d6d04a2ca",
                            ethers.AbiCoder.defaultAbiCoder().encode(
                                [schainParametersType],
                                [{
                                    lifetime: 5,
                                    typeOfSchain: SchainType.LARGE,
                                    nonce: 0,
                                    name: "d3",
                                    originator: ethers.ZeroAddress,
                                    options: []
                                }]
                            )
                        );
                    });

                    it("should delete first schain", async () => {
                        await skaleManager.connect(developer).deleteSchain("d2");

                        (await schainsInternal.numberOfSchains()).should.be.equal(1);
                    });

                    it("should delete second schain", async () => {
                        await skaleManager.connect(developer).deleteSchain("d3");

                        (await schainsInternal.numberOfSchains()).should.be.equal(1);
                    });
                });
            });
        });
        describe("when 16 nodes are in the system", () => {
            it("should create 16 nodes & create & delete all types of schain", async () => {
                await skaleToken.transfer(validator.address, "0x32D26D12E980B600000");

                for (let i = 0; i < 16; ++i) {
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        getPublicKey(nodeAddress), // public key
                        `d2-${i}`, // name
                        "some.domain.name");
                }

                await skaleToken.transfer(developer.address, "0x3635C9ADC5DEA000000");

                let price = await schains.getSchainPrice(1, 5);
                await skaleToken.connect(developer).send(
                    skaleManager,
                    price.toString(),
                    ethers.AbiCoder.defaultAbiCoder().encode(
                        [schainParametersType],
                        [{
                            lifetime: 5,
                            typeOfSchain: SchainType.SMALL,
                            nonce: 0,
                            name: "d2",
                            originator: ethers.ZeroAddress,
                            options: []
                        }]
                    )
                );

                let schain1 = await schainsInternal.schains(ethers.solidityPackedKeccak256(["string"], ["d2"]));
                schain1[0].should.be.equal("d2");

                await skaleManager.connect(developer).deleteSchain("d2");

                (await schainsInternal.numberOfSchains()).should.be.equal(0);
                price = await schains.getSchainPrice(2, 5);

                await skaleToken.connect(developer).send(
                    skaleManager,
                    price.toString(),
                    ethers.AbiCoder.defaultAbiCoder().encode(
                        [schainParametersType],
                        [{
                            lifetime: 5,
                            typeOfSchain: SchainType.MEDIUM,
                            nonce: 0,
                            name: "d3",
                            originator: ethers.ZeroAddress,
                            options: []
                        }]
                    )
                );

                schain1 = await schainsInternal.schains(ethers.solidityPackedKeccak256(["string"], ["d3"]));
                schain1[0].should.be.equal("d3");

                await skaleManager.connect(developer).deleteSchain("d3");

                (await schainsInternal.numberOfSchains()).should.be.equal(0);
                price = await schains.getSchainPrice(3, 5);
                await skaleToken.connect(developer).send(
                    skaleManager,
                    price.toString(),
                    ethers.AbiCoder.defaultAbiCoder().encode(
                        [schainParametersType],
                        [{
                            lifetime: 5,
                            typeOfSchain: SchainType.LARGE,
                            nonce: 0,
                            name: "d4",
                            originator: ethers.ZeroAddress,
                            options: []
                        }]
                    )
                );

                schain1 = await schainsInternal.schains(ethers.solidityPackedKeccak256(["string"], ["d4"]));
                schain1[0].should.be.equal("d4");

                await skaleManager.connect(developer).deleteSchain("d4");

                (await schainsInternal.numberOfSchains()).should.be.equal(0);
                price = await schains.getSchainPrice(4, 5);
                await skaleToken.connect(developer).send(
                    skaleManager,
                    price.toString(),
                    ethers.AbiCoder.defaultAbiCoder().encode(
                        [schainParametersType],
                        [{
                            lifetime: 5,
                            typeOfSchain: SchainType.TEST,
                            nonce: 0,
                            name: "d5",
                            originator: ethers.ZeroAddress,
                            options: []
                        }]
                    )
                );

                schain1 = await schainsInternal.schains(ethers.solidityPackedKeccak256(["string"], ["d5"]));
                schain1[0].should.be.equal("d5");

                await skaleManager.connect(developer).deleteSchain("d5");

                (await schainsInternal.numberOfSchains()).should.be.equal(0);
                price = await schains.getSchainPrice(5, 5);
                await skaleToken.connect(developer).send(
                    skaleManager,
                    price.toString(),
                    ethers.AbiCoder.defaultAbiCoder().encode(
                        [schainParametersType],
                        [{
                            lifetime: 5,
                            typeOfSchain: SchainType.MEDIUM_TEST,
                            nonce: 0,
                            name: "d6",
                            originator: ethers.ZeroAddress,
                            options: []
                        }]
                    )
                );

                schain1 = await schainsInternal.schains(ethers.solidityPackedKeccak256(["string"], ["d6"]));
                schain1[0].should.be.equal("d6");

                await skaleManager.connect(developer).deleteSchain("d6");

                (await schainsInternal.numberOfSchains()).should.be.equal(0);
            });
        });
    });
});
