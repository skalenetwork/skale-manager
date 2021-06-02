import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ConstantsHolder,
         ContractManager,
         DelegationController,
         DelegationPeriodManager,
         Distributor,
         Nodes,
         SchainsInternal,
         Schains,
         SkaleDKGTester,
         SkaleManager,
         SkaleToken,
         ValidatorService,
         BountyV2,
         Wallets} from "../typechain";

import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";

import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deploySkaleDKGTester } from "./tools/deploy/test/skaleDKGTester";
import { deployDelegationController } from "./tools/deploy/delegation/delegationController";
import { deployDelegationPeriodManager } from "./tools/deploy/delegation/delegationPeriodManager";
import { deployDistributor } from "./tools/deploy/delegation/distributor";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployNodes } from "./tools/deploy/nodes";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { deploySchains } from "./tools/deploy/schains";
import { deploySkaleManager } from "./tools/deploy/skaleManager";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { skipTime, currentTime } from "./tools/time";
import { deployBounty } from "./tools/deploy/bounty";
import { BigNumber } from "ethers";
import { deployTimeHelpers } from "./tools/deploy/delegation/timeHelpers";
import { ethers, web3 } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { deployWallets } from "./tools/deploy/wallets";
import chaiAlmost from "chai-almost";
import { makeSnapshot, applySnapshot } from "./tools/snapshot";

chai.should();
chai.use(chaiAsPromised);
chai.use(solidity);

async function getValidatorIdSignature(validatorId: BigNumber, signer: SignerWithAddress) {
    const hash = web3.utils.soliditySha3(validatorId.toString());
    if (hash) {
        let signature = await web3.eth.sign(hash, signer.address);
        signature = (
            signature.slice(130) === "00" ?
            signature.slice(0, 130) + "1b" :
            (
                signature.slice(130) === "01" ?
                signature.slice(0, 130) + "1c" :
                signature
            )
        );
        return signature;
    } else {
        return "";
    }
}

function stringValue(value: string | null) {
    if (value) {
        return value;
    } else {
        return "";
    }
}

function hexValue(value: string) {
    if (value.length % 2 === 0) {
        return value;
    } else {
        return "0" + value;
    }
}

async function getBalance(address: string) {
    return parseFloat(web3.utils.fromWei(await web3.eth.getBalance(address)));
}

describe("SkaleManager", () => {
    let owner: SignerWithAddress;
    let validator: SignerWithAddress
    let developer: SignerWithAddress
    let hacker: SignerWithAddress
    let nodeAddress: SignerWithAddress

    let contractManager: ContractManager;
    let constantsHolder: ConstantsHolder;
    let nodesContract: Nodes;
    let skaleManager: SkaleManager;
    let skaleToken: SkaleToken;
    let schainsInternal: SchainsInternal;
    let schains: Schains;
    let validatorService: ValidatorService;
    let delegationController: DelegationController;
    let delegationPeriodManager: DelegationPeriodManager;
    let distributor: Distributor;
    let skaleDKG: SkaleDKGTester;
    let bountyContract: BountyV2;
    let wallets: Wallets;
    let snapshot: number;

    before(async() => {
        chai.use(chaiAlmost(0.002));
        [owner, validator, developer, hacker, nodeAddress] = await ethers.getSigners();

        contractManager = await deployContractManager();

        skaleToken = await deploySkaleToken(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);
        nodesContract = await deployNodes(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        schains = await deploySchains(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        validatorService = await deployValidatorService(contractManager);
        delegationController = await deployDelegationController(contractManager);
        delegationPeriodManager = await deployDelegationPeriodManager(contractManager);
        distributor = await deployDistributor(contractManager);
        skaleDKG = await deploySkaleDKGTester(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);
        bountyContract = await deployBounty(contractManager);
        wallets = await deployWallets(contractManager);

        const CONSTANTS_HOLDER_MANAGER_ROLE = await constantsHolder.CONSTANTS_HOLDER_MANAGER_ROLE();
        await constantsHolder.grantRole(CONSTANTS_HOLDER_MANAGER_ROLE, owner.address);
        const SCHAIN_TYPE_MANAGER_ROLE = await schainsInternal.SCHAIN_TYPE_MANAGER_ROLE();
        await schainsInternal.grantRole(SCHAIN_TYPE_MANAGER_ROLE, owner.address);
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
        await constantsHolder.setLaunchTimestamp(await currentTime(web3)); // to allow bounty withdrawing
        await bountyContract.enableBountyReduction();

        await schainsInternal.addSchainType(1, 16);
        await schainsInternal.addSchainType(4, 16);
        await schainsInternal.addSchainType(128, 16);
        await schainsInternal.addSchainType(0, 2);
        await schainsInternal.addSchainType(32, 4);
    });

    beforeEach(async () => {
        snapshot = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(snapshot);
    });

    it("should fail to process token fallback if sent not from SkaleToken", async () => {
        await skaleManager.connect(validator).tokensReceived(hacker.address, validator.address, developer.address, 5, "0x11", "0x11").
            should.be.eventually.rejectedWith("Message sender is invalid");
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

    describe("when validator has delegated SKALE tokens", async () => {
        const validatorId = 1;
        const day = 60 * 60 * 24;
        const month = 31 * day;
        const delegatedAmount = 1e7;
        let validatorHasDelegatedTokens: number;
        before(async () => {
            validatorHasDelegatedTokens = await makeSnapshot();
            await validatorService.connect(validator).registerValidator("D2", "D2 is even", 150, 0);
            const validatorIndex = await validatorService.getValidatorId(validator.address);
            const signature = await getValidatorIdSignature(validatorIndex, nodeAddress);
            await validatorService.connect(validator).linkNodeAddress(nodeAddress.address, signature);

            await skaleToken.transfer(validator.address, 10 * delegatedAmount);
            await validatorService.enableValidator(validatorId);
            await delegationPeriodManager.setDelegationPeriod(12, 200);
            await delegationController.connect(validator).delegate(validatorId, delegatedAmount, 12, "Hello from D2");
            const delegationId = 0;
            await delegationController.connect(validator).acceptPendingDelegation(delegationId);

            await skipTime(ethers, month);
        });

        after(async () => {
            await applySnapshot(validatorHasDelegatedTokens);
        });

        it("should create a node", async () => {
            const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
            await skaleManager.connect(nodeAddress).createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                ["0x" + hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                "d2", // name
                "somedomain.name");

            (await nodesContract.numberOfActiveNodes()).should.be.equal(1);
            (await nodesContract.getNodePort(0)).should.be.equal(8545);
        });

        it("should not allow to create node if validator became untrusted", async () => {
            await skipTime(ethers, 2592000);
            await constantsHolder.setMSR(100);

            await validatorService.disableValidator(validatorId);
            const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
            await skaleManager.connect(nodeAddress).createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                ["0x" + hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                "d2", // name
                "somedomain.name")
                .should.be.eventually.rejectedWith("Validator is not authorized to create a node");
            await validatorService.enableValidator(validatorId);
            await skaleManager.connect(nodeAddress).createNode(
                8545, // port
                0, // nonce
                "0x7f000001", // ip
                "0x7f000001", // public ip
                ["0x" + hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                "d2", // name
                "somedomain.name");
        });

        describe("when node is created", async () => {
            let nodeIsCreated: number;
            before(async () => {
                nodeIsCreated = await makeSnapshot();
                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    ["0x" + hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                    "d2", // name
                    "somedomain.name");
                    await wallets.rechargeValidatorWallet(validatorId, {value: 1e18.toString()});
            });

            after(async () => {
                await applySnapshot(nodeIsCreated);
            });

            it("should fail to init exiting of someone else's node", async () => {
                await skaleManager.connect(hacker).nodeExit(0)
                    .should.be.eventually.rejectedWith("Sender is not permitted to call this function");
            });

            it("should reject if node in maintenance call nodeExit", async () => {
                await nodesContract.setNodeInMaintenance(0);
                await skaleManager.connect(nodeAddress).nodeExit(0)
                    .should.be.eventually.rejectedWith("Node should be Leaving");
            });

            it("should initiate exiting", async () => {
                await skaleManager.connect(nodeAddress).nodeExit(0);

                await nodesContract.isNodeLeft(0).should.be.eventually.true;
            });

            it("should remove the node", async () => {
                const balanceBefore = await skaleToken.balanceOf(validator.address);

                await skaleManager.connect(nodeAddress).nodeExit(0);

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = await skaleToken.balanceOf(validator.address);

                balanceAfter.should.be.equal(balanceBefore);
            });

            it("should remove the node by root", async () => {
                const balanceBefore = await skaleToken.balanceOf(validator.address);

                await skaleManager.nodeExit(0);

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = await skaleToken.balanceOf(validator.address);

                balanceBefore.should.be.equal(balanceAfter);
            });

            it("should create and remove node from validator address", async () => {
                (await validatorService.getValidatorIdByNodeAddress(validator.address)).should.be.equal(1);
                const pubKey = ec.keyFromPrivate(String(privateKeys[1]).slice(2)).getPublic();
                await skaleManager.connect(validator).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000002", // ip
                    "0x7f000002", // public ip
                    ["0x" + hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                    "d3", // name
                    "somedomain.name"
                );

                await skaleManager.connect(validator).nodeExit(1);

                await nodesContract.isNodeLeft(1).should.be.eventually.true;
                (await validatorService.getValidatorIdByNodeAddress(validator.address)).should.be.equal(1);
            });

            it("should pay bounty if Node is In Active state", async () => {
                await skipTime(ethers, month);
                const balanceBefore = await getBalance(nodeAddress.address);
                await skaleManager.connect(nodeAddress).getBounty(0);
                const balance = await getBalance(nodeAddress.address);
                balance.should.not.be.lessThan(balanceBefore);
                balance.should.be.almost(balanceBefore);
            });

            it("should pay bounty if Node is In Leaving state", async () => {
                await nodesContract.initExit(0);
                await skipTime(ethers, month);
                await skaleManager.connect(nodeAddress).getBounty(0);
            });

            it("should pay bounty if Node is In Maintenance state", async () => {
                await nodesContract.connect(validator).setNodeInMaintenance(0);
                await skipTime(ethers, month);
                await skaleManager.connect(nodeAddress).getBounty(0);
            });

            it("should not pay bounty if Node is In Left state", async () => {
                await nodesContract.initExit(0);
                await nodesContract.completeExit(0);
                await skipTime(ethers, month);
                await skaleManager.connect(nodeAddress).getBounty(0).should.be.eventually.rejectedWith("The node must not be in Left state");
            });

            it("should pay bounty according to the schedule", async () => {
                const timeHelpers = await deployTimeHelpers(contractManager);

                await bountyContract.disableBountyReduction();
                await constantsHolder.setMSR(delegatedAmount);

                const timelimit = 300 * 1000;
                const start = Date.now();
                const launch = (await constantsHolder.launchTimestamp()).toNumber();
                const launchMonth = (await timeHelpers.timestampToMonth(launch)).toNumber();
                const ten18 = BigNumber.from(10).pow(18);

                const schedule = [
                    385000000,
                    346500000,
                    308000000,
                    269500000,
                    231000000,
                    192500000
                ]
                for (let bounty = schedule[schedule.length - 1] / 2; bounty > 1; bounty /= 2) {
                    for (let i = 0; i < 3; ++i) {
                        schedule.push(bounty);
                    }
                }

                let mustBePaid = BigNumber.from(0);
                await skipTime(ethers, month);
                for (let year = 0; year < schedule.length && (Date.now() - start) < 0.9 * timelimit; ++year) {
                    for (let monthIndex = 0; monthIndex < 12; ++monthIndex) {
                        const monthEnd = (await timeHelpers.monthToTimestamp(launchMonth + 12 * year + monthIndex + 1)).toNumber();
                        if (await currentTime(web3) < monthEnd) {
                            await skipTime(ethers, monthEnd - await currentTime(web3) - day);
                            await skaleManager.connect(nodeAddress).getBounty(0);
                        }
                    }
                    const bountyWasPaid = await skaleToken.balanceOf(distributor.address);
                    mustBePaid = mustBePaid.add(Math.floor(schedule[year]));

                    bountyWasPaid.div(ten18).sub(mustBePaid).abs().toNumber().should.be.lessThan(35); // 35 because of rounding errors in JS
                }
            });
        });

        describe("when two nodes are created", async () => {
            let twoNodesAreCreated: number;
            before(async () => {
                twoNodesAreCreated = await makeSnapshot();
                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    ["0x" + hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                    "d2", // name
                    "somedomain.name");
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000002", // ip
                    "0x7f000002", // public ip
                    ["0x" + hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                    "d3", // name
                    "somedomain.name");
            });

            after(async () => {
                await applySnapshot(twoNodesAreCreated);
            });

            it("should fail to initiate exiting of first node from another account", async () => {
                await skaleManager.connect(hacker).nodeExit(0)
                    .should.be.eventually.rejectedWith("Sender is not permitted to call this function");
            });

            it("should fail to initiate exiting of second node from another account", async () => {
                await skaleManager.connect(hacker).nodeExit(1)
                    .should.be.eventually.rejectedWith("Sender is not permitted to call this function");
            });

            it("should initiate exiting of first node", async () => {
                await skaleManager.connect(nodeAddress).nodeExit(0);

                await nodesContract.isNodeLeft(0).should.be.eventually.true;
            });

            it("should initiate exiting of second node", async () => {
                await skaleManager.connect(nodeAddress).nodeExit(1);

                await nodesContract.isNodeLeft(1).should.be.eventually.true;
            });

            it("should remove the first node", async () => {
                const balanceBefore = await skaleToken.balanceOf(validator.address);

                await skaleManager.connect(nodeAddress).nodeExit(0);

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = await skaleToken.balanceOf(validator.address);

                balanceBefore.should.be.equal(balanceAfter);
            });

            it("should remove the second node", async () => {
                const balanceBefore = await skaleToken.balanceOf(validator.address);

                await skaleManager.connect(nodeAddress).nodeExit(1);

                await nodesContract.isNodeLeft(1).should.be.eventually.true;

                const balanceAfter = await skaleToken.balanceOf(validator.address);

                balanceBefore.should.be.equal(balanceAfter);
            });

            it("should remove the first node by root", async () => {
                const balanceBefore = await skaleToken.balanceOf(validator.address);

                await skaleManager.nodeExit(0);

                await nodesContract.isNodeLeft(0).should.be.eventually.true;

                const balanceAfter = await skaleToken.balanceOf(validator.address);

                balanceBefore.should.be.equal(balanceAfter);
            });

            it("should remove the second node by root", async () => {
                const balanceBefore = await skaleToken.balanceOf(validator.address);

                await skaleManager.nodeExit(1);

                await nodesContract.isNodeLeft(1).should.be.eventually.true;

                const balanceAfter = await skaleToken.balanceOf(validator.address);

                balanceBefore.should.be.equal(balanceAfter);
            });
        });

        describe("when 18 nodes are in the system", async () => {
            let d2SchainId: string

            const verdict = {
                toNodeIndex: 1,
                downtime: 0,
                latency: 50
            };
            let when18NodesAreCreated: number;
            before(async () => {
                when18NodesAreCreated = await makeSnapshot();
                await skaleToken.transfer(validator.address, "0x3635c9adc5dea00000");
                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                for (let i = 0; i < 18; ++i) {
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        ["0x" + hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                        "d2-" + i, // name
                        "somedomain.name");
                }

                const schainId = web3.utils.soliditySha3("d2");
                if (schainId) {
                    d2SchainId = schainId;
                }
            });

            after(async () => {
                await applySnapshot(when18NodesAreCreated);
            });

            it("should fail to create schain if validator doesn't meet MSR", async () => {
                await constantsHolder.setMSR(delegatedAmount + 1);
                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                await skaleManager.connect(nodeAddress).createNode(
                    8545, // port
                    0, // nonce
                    "0x7f000001", // ip
                    "0x7f000001", // public ip
                    ["0x" + hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                    "d2", // name
                    "somedomain.name").should.be.eventually.rejectedWith("Validator must meet the Minimum Staking Requirement");
            });

            describe("when developer has SKALE tokens", async () => {
                let developerHasTokens: number;
                before(async () => {
                    developerHasTokens = await makeSnapshot();
                    skaleToken.transfer(developer.address, "0x3635c9adc5dea00000");
                });

                after(async () => {
                    await applySnapshot(developerHasTokens);
                });

                it("should create schain", async () => {
                    await skaleToken.connect(developer).send(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            5, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d2"])); // name

                    const schain = await schainsInternal.schains(d2SchainId);
                    schain[0].should.be.equal("d2");
                });

                it("should not create schain if schain admin set too low schain lifetime", async () => {
                    const SECONDS_TO_YEAR = 31622400;
                    constantsHolder.setMinimalSchainLifetime(SECONDS_TO_YEAR);
                    await skaleToken.connect(developer).send(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            0, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d2"]), // name
                        )
                        .should.be.eventually.rejectedWith("Minimal schain lifetime should be satisfied");

                    constantsHolder.setMinimalSchainLifetime(4);
                    await skaleToken.connect(developer).send(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            5, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d2"]), // name
                        );

                    const schain = await schainsInternal.schains(d2SchainId);
                    schain[0].should.be.equal("d2");
                });


                it("should not allow to create schain if certain date has not reached", async () => {
                    const unreacheableDate = BigNumber.from(2).pow(256).sub(1);
                    await constantsHolder.setSchainCreationTimeStamp(unreacheableDate);
                    await skaleToken.connect(developer).send(
                        skaleManager.address,
                        "0x1cc2d6d04a2ca",
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            4, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d2"]), // name
                        )
                        .should.be.eventually.rejectedWith("It is not a time for creating Schain");
                });

                describe("when schain is created", async () => {
                    let schainIsCreated: number;
                    before(async () => {
                        schainIsCreated = await makeSnapshot();
                        await skaleToken.connect(developer).send(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                                5, // lifetime
                                3, // type of schain
                                0, // nonce
                                "d2"]), // name
                            );
                        await skaleDKG.setSuccessfulDKGPublic(
                            d2SchainId
                        );
                    });

                    after(async () => {
                        await applySnapshot(schainIsCreated);
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
                        const nodes = await schainsInternal.getNodesInGroup(d2SchainId);
                        await skaleManager.connect(nodeAddress).nodeExit(nodes[0]);
                        await skaleDKG.setSuccessfulDKGPublic(
                            d2SchainId,
                        );
                        await skaleManager.connect(developer).deleteSchain("d2");
                    });
                });

                describe("when another schain is created", async () => {
                    let anotherSchainIsCreated: number;
                    before(async () => {
                        anotherSchainIsCreated = await makeSnapshot();
                        await skaleToken.connect(developer).send(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                                5, // lifetime
                                3, // type of schain
                                0, // nonce
                                "d3"]), // name
                            );
                    });

                    after(async () => {
                        await applySnapshot(anotherSchainIsCreated);
                    });

                    it("should fail to delete schain if sender is not owner of it", async () => {
                        await skaleManager.connect(hacker).deleteSchain("d3")
                            .should.be.eventually.rejectedWith("Message sender is not the owner of the Schain");
                    });

                    it("should delete schain by root", async () => {
                        const SCHAIN_DELETER_ROLE = await skaleManager.SCHAIN_DELETER_ROLE();
                        await skaleManager.grantRole(SCHAIN_DELETER_ROLE, owner.address);
                        await skaleManager.deleteSchainByRoot("d3");

                        await schainsInternal.getSchains().should.be.eventually.empty;
                    });
                });
            });
        });

        describe("when 32 nodes are in the system", async () => {
            let d2SchainId: string;
            let d3SchainId: string;
            let when32Nodes: number;

            before(async () => {
                when32Nodes = await makeSnapshot();
                await constantsHolder.setMSR(3);

                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                for (let i = 0; i < 32; ++i) {
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        ["0x" + hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                        "d2-" + i, // name
                        "somedomain.name");
                }

                let schainId = web3.utils.soliditySha3("d2");
                if (schainId) {
                    d2SchainId = schainId;
                }
                schainId = web3.utils.soliditySha3("d3");
                if (schainId) {
                    d3SchainId = schainId;
                }
            });

            after(async () => {
                await applySnapshot(when32Nodes);
            });

            describe("when developer has SKALE tokens", async () => {
                let developerHasSKL: number;
                before(async () => {
                    developerHasSKL = await makeSnapshot();
                    await skaleToken.transfer(developer.address, "0x3635C9ADC5DEA000000");
                });

                after(async () => {
                    await applySnapshot(developerHasSKL);
                });

                it("should create 2 medium schains", async () => {
                    const price = await schains.getSchainPrice(3, 5)
                    await skaleToken.connect(developer).send(
                        skaleManager.address,
                        price,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            5, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d2"]), // name
                        );

                    const schain1 = await schainsInternal.schains(d2SchainId);
                    schain1[0].should.be.equal("d2");

                    await skaleToken.connect(developer).send(
                        skaleManager.address,
                        price,
                        web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                            5, // lifetime
                            3, // type of schain
                            0, // nonce
                            "d3"]), // name
                        );

                    const schain2 = await schainsInternal.schains(d3SchainId);
                    schain2[0].should.be.equal("d3");
                });

                describe("when schains are created", async () => {
                    let whenSchainsAreCreated: number;
                    before(async () => {
                        whenSchainsAreCreated = await makeSnapshot();
                        await skaleToken.connect(developer).send(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                                5, // lifetime
                                3, // type of schain
                                0, // nonce
                                "d2"]), // name
                            );

                        await skaleToken.connect(developer).send(
                            skaleManager.address,
                            "0x1cc2d6d04a2ca",
                            web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                                5, // lifetime
                                3, // type of schain
                                0, // nonce
                                "d3"]), // name
                            );
                    });

                    after(async () => {
                        await applySnapshot(whenSchainsAreCreated);
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
        describe("when 16 nodes are in the system", async () => {

            it("should create 16 nodes & create & delete all types of schain", async () => {

                await skaleToken.transfer(validator.address, "0x32D26D12E980B600000");

                const pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
                for (let i = 0; i < 16; ++i) {
                    await skaleManager.connect(nodeAddress).createNode(
                        8545, // port
                        0, // nonce
                        "0x7f0000" + ("0" + (i + 1).toString(16)).slice(-2), // ip
                        "0x7f000001", // public ip
                        ["0x" + hexValue(pubKey.x.toString('hex')), "0x" + hexValue(pubKey.y.toString('hex'))], // public key
                        "d2-" + i, // name
                        "somedomain.name");
                    }

                await skaleToken.transfer(developer.address, "0x3635C9ADC5DEA000000");

                let price = await schains.getSchainPrice(1, 5);
                await skaleToken.connect(developer).send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        1, // type of schain
                        0, // nonce
                        "d2"]), // name
                    );

                let schain1 = await schainsInternal.schains(stringValue(web3.utils.soliditySha3("d2")));
                schain1[0].should.be.equal("d2");

                await skaleManager.connect(developer).deleteSchain("d2");

                (await schainsInternal.numberOfSchains()).should.be.equal(0);
                price = await schains.getSchainPrice(2, 5);

                await skaleToken.connect(developer).send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        2, // type of schain
                        0, // nonce
                        "d3"]), // name
                    );

                schain1 = await schainsInternal.schains(stringValue(web3.utils.soliditySha3("d3")));
                schain1[0].should.be.equal("d3");

                await skaleManager.connect(developer).deleteSchain("d3");

                (await schainsInternal.numberOfSchains()).should.be.equal(0);
                price = await schains.getSchainPrice(3, 5);
                await skaleToken.connect(developer).send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        3, // type of schain
                        0, // nonce
                        "d4"]), // name
                    );

                schain1 = await schainsInternal.schains(stringValue(web3.utils.soliditySha3("d4")));
                schain1[0].should.be.equal("d4");

                await skaleManager.connect(developer).deleteSchain("d4");

                (await schainsInternal.numberOfSchains()).should.be.equal(0);
                price = await schains.getSchainPrice(4, 5);
                await skaleToken.connect(developer).send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        4, // type of schain
                        0, // nonce
                        "d5"]), // name
                    );

                schain1 = await schainsInternal.schains(stringValue(web3.utils.soliditySha3("d5")));
                schain1[0].should.be.equal("d5");

                await skaleManager.connect(developer).deleteSchain("d5");

                (await schainsInternal.numberOfSchains()).should.be.equal(0);
                price = await schains.getSchainPrice(5, 5);
                await skaleToken.connect(developer).send(
                    skaleManager.address,
                    price.toString(),
                    web3.eth.abi.encodeParameters(["uint", "uint8", "uint16", "string"], [
                        5, // lifetime
                        5, // type of schain
                        0, // nonce
                        "d6"]), // name
                    );

                schain1 = await schainsInternal.schains(stringValue(web3.utils.soliditySha3("d6")));
                schain1[0].should.be.equal("d6");

                await skaleManager.connect(developer).deleteSchain("d6");

                (await schainsInternal.numberOfSchains()).should.be.equal(0);
            });
        });
    });
});
