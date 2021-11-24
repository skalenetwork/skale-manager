import {
    ContractManager,
    ConstantsHolder,
    BountyV2,
    NodesMock,
    DelegationController,
    SkaleToken,
    ValidatorService
} from "../typechain";

import { deployContractManager } from "./tools/deploy/contractManager";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployBounty } from "./tools/deploy/bounty";
import { currentTime, skipTime, skipTimeToDate } from "./tools/time";
import chaiAsPromised from "chai-as-promised";
import chaiAlmost from "chai-almost";
import * as chai from "chai";
import { deployNodesMock } from "./tools/deploy/test/nodesMock";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { deployDelegationController } from "./tools/deploy/delegation/delegationController";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployDelegationPeriodManager } from "./tools/deploy/delegation/delegationPeriodManager";
import { deploySkaleManagerMock } from "./tools/deploy/test/skaleManagerMock";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumber, Event } from "ethers";
import { deployPunisher } from "./tools/deploy/delegation/punisher";

import { deployLibraries, getLinkedContractFactory } from "../test/tools/deploy/factory";
import { fastBeforeEach } from "./tools/mocha";

chai.should();
chai.use(chaiAsPromised);

function hexValue(value: string) {
    if (value.length % 2 === 0) {
        return value;
    } else {
        return "0" + value;
    }
}

function findEvent(events: Event[] | undefined, eventName: string) {
    if (events) {
        const target = events.find((event) => event.event === eventName);
        if (target) {
            return target;
        } else {
            throw new Error("Event was not emitted");
        }
    } else {
        throw new Error("Event was not emitted");
    }
}

function getBountyForEpoch(epoch: number) {
    const bountyForFirst6Years = [385000000, 346500000, 308000000, 269500000, 231000000, 192500000];
    const year = Math.floor(epoch / 12);
    if (year < 6) {
        return bountyForFirst6Years[year] / 12;
    } else {
        return bountyForFirst6Years[5] / 2 ** (Math.floor((year - 6) / 3) + 1);
    }
}

async function getContractFactoryWithLibraries(e: any, contractName: string) {
    const libraryNames = [];
    for (const str of e.toString().split(".sol:")) {
        const libraryName = str.split("\n")[0];
        libraryNames.push(libraryName);
    }
    libraryNames.shift();
    const libraries = await deployLibraries(libraryNames);
    const contractFactory = await getLinkedContractFactory(contractName, libraries);
    return contractFactory;
}

describe("Bounty", () => {
    let owner: SignerWithAddress;
    let admin: SignerWithAddress;
    let hacker: SignerWithAddress;
    let validator: SignerWithAddress;
    let validator2: SignerWithAddress;

    let contractManager: ContractManager;
    let constantsHolder: ConstantsHolder;
    let bountyContract: BountyV2;
    let nodes: NodesMock;

    const ten18 = BigNumber.from(10).pow(18);
    const day = 60 * 60 * 24;
    const month = 31 * day;

    fastBeforeEach(async () => {
        chai.use(chaiAlmost(2));
        [owner, admin, hacker, validator, validator2] = await ethers.getSigners();
        contractManager = await deployContractManager();
        constantsHolder = await deployConstantsHolder(contractManager);
        bountyContract = await deployBounty(contractManager);
        nodes = await deployNodesMock(contractManager);
        await contractManager.setContractsAddress("Nodes", nodes.address);
        const skaleManagerMock = await deploySkaleManagerMock(contractManager);
        await contractManager.setContractsAddress("SkaleManager", skaleManagerMock.address);
        const BOUNTY_REDUCTION_MANAGER_ROLE = await bountyContract.BOUNTY_REDUCTION_MANAGER_ROLE();
        await bountyContract.grantRole(BOUNTY_REDUCTION_MANAGER_ROLE, owner.address);
        const CONSTANTS_HOLDER_MANAGER_ROLE = await constantsHolder.CONSTANTS_HOLDER_MANAGER_ROLE();
        await constantsHolder.grantRole(CONSTANTS_HOLDER_MANAGER_ROLE, owner.address);
    });

    it("should allow only owner to call enableBountyReduction", async() => {
        await bountyContract.connect(hacker).enableBountyReduction()
            .should.be.eventually.rejectedWith("BOUNTY_REDUCTION_MANAGER_ROLE is required");
        await bountyContract.connect(admin).enableBountyReduction()
            .should.be.eventually.rejectedWith("BOUNTY_REDUCTION_MANAGER_ROLE is required");
        await bountyContract.enableBountyReduction();
    });

    it("should allow only owner to call disableBountyReduction", async() => {
        await bountyContract.connect(hacker).disableBountyReduction()
            .should.be.eventually.rejectedWith("BOUNTY_REDUCTION_MANAGER_ROLE is required");
        await bountyContract.connect(admin).disableBountyReduction()
            .should.be.eventually.rejectedWith("BOUNTY_REDUCTION_MANAGER_ROLE is required");
        await bountyContract.disableBountyReduction();
    });

    describe("when validator is registered and has active delegations", async () => {
        let skaleToken: SkaleToken;
        let delegationController: DelegationController;
        let validatorService: ValidatorService;

        const validatorId = 1;
        const validatorAmount = 1e6;
        fastBeforeEach(async () => {
            skaleToken = await deploySkaleToken(contractManager);
            delegationController = await deployDelegationController(contractManager);
            validatorService = await deployValidatorService(contractManager);
            const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
            await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);

            await skaleToken.mint(validator.address, ten18.mul(validatorAmount).toString(), "0x", "0x");
            await validatorService.connect(validator).registerValidator("Validator", "", 150, 1e6 + 1);
            await validatorService.enableValidator(validatorId);
            await delegationController.connect(validator).delegate(validatorId, ten18.mul(validatorAmount).toString(), 2, "");
            await delegationController.connect(validator).acceptPendingDelegation(0);
            await skipTime(ethers, month);
        });

        async function calculateBounty(nodeId: number) {
            const estimate = (await bountyContract.estimateBounty(nodeId)).div(ten18).toNumber();
            const bounty = (await bountyContract.callStatic.calculateBounty(nodeId)).div(ten18).toNumber();
            bounty.should.be.almost(estimate);
            await bountyContract.calculateBounty(nodeId);
            await nodes.changeNodeLastRewardDate(nodeId);
            return bounty;
        }

        describe("when second validator is registered and has active delegations", async () => {
            const validator2Id = 2;
            const validator2Amount = 0.5e6;
            fastBeforeEach(async () => {
                const delegationPeriodManager = await deployDelegationPeriodManager(contractManager);
                const DELEGATION_PERIOD_SETTER_ROLE = await delegationPeriodManager.DELEGATION_PERIOD_SETTER_ROLE();
                await delegationPeriodManager.grantRole(DELEGATION_PERIOD_SETTER_ROLE, owner.address);

                await skaleToken.mint(validator2.address, ten18.mul(validator2Amount).toString(), "0x", "0x");
                await validatorService.connect(validator2).registerValidator("Validator", "", 150, 1e6 + 1);
                await validatorService.enableValidator(validator2Id);
                await delegationPeriodManager.setDelegationPeriod(12, 200);
                await delegationController.connect(validator2).delegate(validator2Id, ten18.mul(validator2Amount).toString(), 12, "");
                await delegationController.connect(validator2).acceptPendingDelegation(1);
                await skipTime(ethers, month);

                await skipTimeToDate(ethers, 1, 0); // Jan 1st
                await constantsHolder.setLaunchTimestamp(await currentTime(ethers));
                await constantsHolder.setMSR(ten18.mul(validator2Amount).toString());
            });

            it("should pay bounty proportionally to effective validator's stake", async () => {
                await nodes.registerNodes(2, validatorId);
                await nodes.registerNodes(1, validator2Id);

                await skipTime(ethers, 29 * day);
                const bounty0 = await calculateBounty(0) + await calculateBounty(1);
                const bounty1 = await calculateBounty(2);
                bounty0.should.be.equal(bounty1);
                bounty0.should.be.almost(getBountyForEpoch(0) / 2);
            });

            it("should process nodes adding and removing, delegation and undelegation and slashing", async () => {
                await skaleToken.mint(validator.address, ten18.mul(10e6).toString(), "0x", "0x");
                await skaleToken.mint(validator2.address, ten18.mul(10e6).toString(), "0x", "0x");
                const punisher = await deployPunisher(contractManager);
                await contractManager.setContractsAddress("SkaleDKG", contractManager.address); // for testing
                const million = ten18.mul(1e6).toString();

                // Jan 1st
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // validator1:
                //     delegations:
                //         0: 1M - 2 months - DELEGATED
                //     nodes:

                // validator2:
                //     delegations:
                //         1: 500K - 12 months - DELEGATED
                //     nodes:

                await delegationController.connect(validator).requestUndelegation(0);

                await skipTimeToDate(ethers, 15, 0);

                // Jan 15th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 1M - 2 months - UNDELEGATION_REQUESTED
                //     nodes:

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months - DELEGATED
                //     nodes:

                await delegationController.connect(validator2).delegate(2, million, 2, "");
                await delegationController.connect(validator2).acceptPendingDelegation(2);

                await skipTimeToDate(ethers, 30, 0);

                // Jan 30th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 1M - 2 months - UNDELEGATION_REQUESTED
                //     nodes:

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months - DELEGATED
                //         2: 1M - 2 months - ACCEPTED
                //     nodes:

                await punisher.slash(1, million);

                await skipTimeToDate(ethers, 1, 1);

                // Feb 1st
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months - UNDELEGATION_REQUESTED
                //     nodes:

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months - DELEGATED
                //         2: 1M - 2 months - DELEGATED
                //     nodes:

                await nodes.registerNodes(1, validator2Id);

                await bountyContract.calculateBounty(0)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(ethers, 15, 1);

                // Feb 15th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - UNDELEGATION_REQUESTED
                //     nodes:

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months (from Jan) - DELEGATED
                //         2: 1M - 2 months (from Feb) - DELEGATED
                //     nodes:
                //         0: Feb 1st

                await delegationController.connect(validator).delegate(validatorId, million, 12, "");
                await delegationController.connect(validator).acceptPendingDelegation(3);

                await bountyContract.calculateBounty(0)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(ethers, 27, 1);

                // Feb 27th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - UNDELEGATION_REQUESTED
                //         3: 1M - 12 months (from Mar) - ACCEPTED
                //     nodes:

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months (from Jan) - DELEGATED
                //         2: 1M - 2 months (from Feb) - DELEGATED
                //     nodes:
                //         0: Feb 1st

                await delegationController.connect(validator).delegate(validatorId, million, 2, "");
                await delegationController.connect(validator).acceptPendingDelegation(4);

                await constantsHolder.setMSR(ten18.mul(1.5e6).toString());
                let bounty = await calculateBounty(0);
                bounty.should.be.almost(getBountyForEpoch(0) + getBountyForEpoch(1));

                await skipTimeToDate(ethers, 1, 2);

                // March 1st
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 1M - 12 months (from Mar) - DELEGATED
                //         4: 1M - 2 months (from Mar) - DELEGATED
                //     nodes:

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months (from Jan) - DELEGATED
                //         2: 1M - 2 months (from Feb) - DELEGATED
                //     nodes:
                //         0: Feb 27th

                await delegationController.connect(validator).requestUndelegation(3);

                await bountyContract.calculateBounty(0)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(ethers, 15, 2);

                // March 15th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 1M - 12 months (from Mar) - UNDELEGATION_REQUESTED
                //         4: 1M - 2 months (from Mar) - DELEGATED
                //     nodes:

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months (from Jan) - DELEGATED
                //         2: 1M - 2 months (from Feb) - DELEGATED
                //     nodes:
                //         0: Feb 27th

                await punisher.slash(validatorId, million);

                await bountyContract.calculateBounty(0)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(ethers, 29, 2);

                // March 29th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 500K - 12 months (from Mar) - UNDELEGATION_REQUESTED
                //         4: 500K - 2 months (from Mar) - DELEGATED
                //     nodes:

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months (from Jan) - DELEGATED
                //         2: 1M - 2 months (from Feb) - DELEGATED
                //     nodes:
                //         0: Feb 27th

                await delegationController.connect(validator).delegate(validatorId, million, 2, "");
                await delegationController.connect(validator).acceptPendingDelegation(5);

                let effectiveDelegated1 = 0.5e6 * 100 + 0.5e6 * 200;
                let effectiveDelegated2 = 1e6 * 100 + 0.5e6 * 200;
                let totalBounty = 0;
                let bountyLeft = getBountyForEpoch(2);

                bounty = await calculateBounty(0);
                bounty.should.be.almost(bountyLeft * effectiveDelegated2 / (effectiveDelegated1 + effectiveDelegated2));
                totalBounty += bounty;

                await skipTimeToDate(ethers, 1, 3);

                // April 1st
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 500K - 12 months (from Mar) - UNDELEGATION_REQUESTED
                //         4: 500K - 2 months (from Mar) - DELEGATED
                //         5: 1M - 2 months (from Apr) - DELEGATED
                //     nodes:

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months (from Jan) - DELEGATED
                //         2: 1M - 2 months (from Feb) - DELEGATED
                //     nodes:
                //         0: Feb 27th

                await nodes.registerNodes(1, validatorId);

                await bountyContract.calculateBounty(0)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");
                await bountyContract.calculateBounty(1)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(ethers, 15, 3);

                // April 15th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 500K - 12 months (from Mar) - UNDELEGATION_REQUESTED
                //         4: 500K - 2 months (from Mar) - DELEGATED
                //         5: 1M - 2 months (from Apr) - DELEGATED
                //     nodes:
                //         1: Apr 1st

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months (from Jan) - DELEGATED
                //         2: 1M - 2 months (from Feb) - DELEGATED
                //     nodes:
                //         0: Feb 27th

                await nodes.registerNodes(1, validatorId);

                await bountyContract.calculateBounty(0)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");
                await bountyContract.calculateBounty(1)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");
                await bountyContract.calculateBounty(2)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(ethers, 28, 3);

                // April 28th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 500K - 12 months (from Mar) - UNDELEGATION_REQUESTED
                //         4: 500K - 2 months (from Mar) - DELEGATED
                //         5: 1M - 2 months (from Apr) - DELEGATED
                //     nodes:
                //         1: Apr 1st
                //         2: Apr 15th

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months (from Jan) - DELEGATED
                //         2: 1M - 2 months (from Feb) - DELEGATED
                //     nodes:
                //         0: Feb 27th

                await delegationController.connect(validator2).delegate(validator2Id, million, 2, "");
                await delegationController.connect(validator2).acceptPendingDelegation(6);

                effectiveDelegated1 = 1.5e6 * 100 + 0.5e6 * 200;
                bountyLeft += getBountyForEpoch(3) - totalBounty;
                totalBounty = 0;

                bounty = await calculateBounty(0);
                bounty.should.be.almost(bountyLeft * effectiveDelegated2 / (effectiveDelegated1 + effectiveDelegated2));
                totalBounty += bounty;
                bounty = await calculateBounty(1);
                bounty.should.be.almost(bountyLeft * effectiveDelegated1 / (effectiveDelegated1 + effectiveDelegated2));
                totalBounty += bounty;
                await bountyContract.calculateBounty(2)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(ethers, 1, 4);

                // May 1st
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 500K - 12 months (from Mar) - UNDELEGATION_REQUESTED
                //         4: 500K - 2 months (from Mar) - DELEGATED
                //         5: 1M - 2 months (from Apr) - DELEGATED
                //     nodes:
                //         1: Apr 28th
                //         2: Apr 15th

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months (from Jan) - DELEGATED
                //         2: 1M - 2 months (from Feb) - DELEGATED
                //         6: 1M - 2 months (from May) - DELEGATED
                //     nodes:
                //         0: Apr 28th

                await nodes.registerNodes(1, validator2Id);

                await bountyContract.calculateBounty(0)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");
                await bountyContract.calculateBounty(1)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");
                await bountyContract.calculateBounty(2)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");
                await bountyContract.calculateBounty(3)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(ethers, 15, 4);

                // May 15th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 500K - 12 months (from Mar) - UNDELEGATION_REQUESTED
                //         4: 500K - 2 months (from Mar) - DELEGATED
                //         5: 1M - 2 months (from Apr) - DELEGATED
                //     nodes:
                //         1: Apr 28th
                //         2: Apr 15th

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months (from Jan) - DELEGATED
                //         2: 1M - 2 months (from Feb) - DELEGATED
                //         6: 1M - 2 months (from May) - DELEGATED
                //     nodes:
                //         0: Apr 28th
                //         3: May 1st

                await delegationController.connect(validator2).requestUndelegation(1);

                effectiveDelegated2 = 2e6 * 100 + 0.5e6 * 200;
                bountyLeft += getBountyForEpoch(4) - totalBounty;
                totalBounty = 0;

                effectiveDelegated1.should.be.almost(
                    (await delegationController.getEffectiveDelegatedValuesByValidator(validatorId))[0]
                        .div(ten18)
                        .toNumber());
                effectiveDelegated2.should.be.almost(
                    (await delegationController.getEffectiveDelegatedValuesByValidator(validator2Id))[1]
                        .div(ten18)
                        .toNumber());

                await bountyContract.calculateBounty(0)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");
                await bountyContract.calculateBounty(1)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");
                bounty = await calculateBounty(2);
                bounty.should.be.almost(bountyLeft * (effectiveDelegated1) / (effectiveDelegated1 + effectiveDelegated2));
                totalBounty += bounty;
                await bountyContract.calculateBounty(3)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(ethers, 29, 4);

                // May 29th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 500K - 12 months (from Mar) - UNDELEGATION_REQUESTED
                //         4: 500K - 2 months (from Mar) - DELEGATED
                //         5: 1M - 2 months (from Apr) - DELEGATED
                //     nodes:
                //         1: Apr 28th
                //         2: Apr 15th

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months (from Jan) - UNDELEGATION_REQUESTED
                //         2: 1M - 2 months (from Feb) - DELEGATED
                //         6: 1M - 2 months (from May) - DELEGATED
                //     nodes:
                //         0: Apr 28th
                //         3: May 1st

                await punisher.slash(validator2Id, ten18.mul(1.25e6).toString());
                effectiveDelegated2 = 1e6 * 100 + 0.25e6 * 200;

                effectiveDelegated1.should.be.almost(
                    (await delegationController.getEffectiveDelegatedValuesByValidator(validatorId))[0]
                        .div(ten18)
                        .toNumber());
                effectiveDelegated2.should.be.almost(
                    (await delegationController.getEffectiveDelegatedValuesByValidator(validator2Id))[0]
                        .div(ten18)
                        .toNumber());

                bounty = await calculateBounty(0);
                bounty.should.be.almost(0); // stake is too small
                totalBounty += bounty;
                bounty = await calculateBounty(1);
                // TODO: fix slashing
                // bounty.should.be.almost(bountyLeft * effectiveDelegated1 / (effectiveDelegated1 + effectiveDelegated2));
                totalBounty += bounty;
                await bountyContract.calculateBounty(2)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");
                bounty = await calculateBounty(3);
                bounty.should.be.almost(0); // stake is too small
                totalBounty += bounty;

                totalBounty.should.be.lessThan(getBountyForEpoch(4));

                await skipTimeToDate(ethers, 16, 5);

                // June 16th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 500K - 12 months (from Mar) - UNDELEGATION_REQUESTED
                //         4: 500K - 2 months (from Mar) - DELEGATED
                //         5: 1M - 2 months (from Apr) - DELEGATED
                //     nodes:
                //         1: May 29th
                //         2: Apr 15th

                // 2. validator2:
                //     delegations:
                //         1: 250K - 12 months (from Jan) - UNDELEGATION_REQUESTED
                //         2: 0.5M - 2 months (from Feb) - DELEGATED
                //         6: 0.5M - 2 months (from May) - DELEGATED
                //     nodes:
                //         0: May 29th
                //         3: May 29th

                bountyLeft += getBountyForEpoch(5) - totalBounty;
                totalBounty = 0;
                await nodes.removeNode(0);

                await bountyContract.calculateBounty(1)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");
                bounty = await calculateBounty(2);
                bounty.should.be.almost(bountyLeft * effectiveDelegated1 / (effectiveDelegated1 + effectiveDelegated2));
                totalBounty += bounty;
                await bountyContract.calculateBounty(3)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(ethers, 27, 5);

                await delegationController.connect(validator2).requestUndelegation(6);

                await skipTimeToDate(ethers, 28, 5);

                // June 28th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 500K - 12 months (from Mar) - UNDELEGATION_REQUESTED
                //         4: 500K - 2 months (from Mar) - DELEGATED
                //         5: 1M - 2 months (from Apr) - DELEGATED
                //     nodes:
                //         1: May 29th
                //         2: June 16th

                // 2. validator2:
                //     delegations:
                //         1: 250K - 12 months (from Jan) - UNDELEGATION_REQUESTED
                //         2: 0.5M - 2 months (from Feb) - DELEGATED
                //         6: 0.5M - 2 months (from May) - UNDELEGATION_REQUESTED
                //     nodes:
                //         3: May 29th

                bounty = await calculateBounty(1);
                bounty.should.be.almost(0); // stake is too low
                totalBounty += bounty;
                await bountyContract.calculateBounty(2)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");
                bounty = await calculateBounty(3);
                bounty.should.be.almost(0); // stake is too low
                totalBounty += bounty;

                await skipTimeToDate(ethers, 29, 6);

                // July 29th
                // console.log("ts: current", new Date(await currentTime(ethers) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 0 - 2 months (from Jan) - COMPLETED
                //         3: 500K - 12 months (from Mar) - UNDELEGATION_REQUESTED
                //         4: 500K - 2 months (from Mar) - DELEGATED
                //         5: 1M - 2 months (from Apr) - DELEGATED
                //     nodes:
                //         1: May 29th
                //         2: June 16th

                // 2. validator2:
                //     delegations:
                //         1: 250K - 12 months (from Jan) - UNDELEGATION_REQUESTED
                //         2: 0.5M - 2 months (from Feb) - DELEGATED
                //         6: 0.5M - 2 months (from May) - COMPLETED
                //     nodes:
                //         3: May 29th

                effectiveDelegated2 = 0.5e6 * 100 + 0.25e6 * 200;
                bountyLeft += getBountyForEpoch(5) - totalBounty;
                totalBounty = 0;

                bounty = await calculateBounty(1);
                bounty.should.be.almost(bountyLeft * effectiveDelegated1 / (effectiveDelegated1 + effectiveDelegated2), 3);
                totalBounty += bounty;
                bounty = await calculateBounty(2);
                bounty.should.be.almost(0); // stake is too low
                totalBounty += bounty;
                bounty = await calculateBounty(3);
                bounty.should.be.almost(0); // stake is too low
                totalBounty += bounty;
            });
        });
    });
});
