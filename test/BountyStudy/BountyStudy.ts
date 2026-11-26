import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {
    BountyV2,
    ConstantsHolder,
    ContractManager,
    DelegationController,
    DelegationPeriodManager,
    Distributor,
    Nodes,
    SchainsInternalMock,
    SkaleDKGTester,
    SkaleManager,
    SkaleToken,
    ValidatorService
} from "../../typechain-types";
import {privateKeys} from "../tools/private-keys";
import {deployBounty} from "../tools/deploy/bounty";
import {deployConstantsHolder} from "../tools/deploy/constantsHolder";
import {deployContractManager} from "../tools/deploy/contractManager";
import {deployDelegationController} from "../tools/deploy/delegation/delegationController";
import {deployDelegationPeriodManager} from "../tools/deploy/delegation/delegationPeriodManager";
import {deployDistributor} from "../tools/deploy/delegation/distributor";
import {deployValidatorService} from "../tools/deploy/delegation/validatorService";
import {deployNodes} from "../tools/deploy/nodes";
import {deploySchains} from "../tools/deploy/schains";
import {deploySchainsInternalMock} from "../tools/deploy/test/schainsInternalMock";
import {deploySkaleDKGTester} from "../tools/deploy/test/skaleDKGTester";
import {deploySkaleManager} from "../tools/deploy/skaleManager";
import {deploySkaleToken} from "../tools/deploy/skaleToken";
import {deployWallets} from "../tools/deploy/wallets";
import {fastBeforeEach} from "../tools/mocha";
import {getPublicKey} from "../tools/signatures";
import {currentTime, nextMonth, skipTime} from "../tools/time";
import {ethers} from "hardhat";
import {SignerWithAddress} from "@nomicfoundation/hardhat-ethers/signers";
import {Wallet} from "ethers";
import {takeSnapshot} from "@nomicfoundation/hardhat-network-helpers";

chai.should();
chai.use(chaiAsPromised);

const LOG_LINE = "═".repeat(86);

function formatSkl(amount: bigint): string {
    const skl = Number.parseFloat(ethers.formatEther(amount));
    return `${skl.toLocaleString(undefined, {maximumFractionDigits: 6})} SKL`;
}

function logSection(title: string): void {
    console.log(`\n${LOG_LINE}`);
    console.log(`🧪 ${title}`);
    console.log(LOG_LINE);
}

function logSubsection(title: string): void {
    console.log(`\n• ${title}`);
    console.log("─".repeat(86));
}

function logSubSubsection(title: string): void {
    console.log(`\n• ${title}`);
}

describe("BountyStudy", () => {
    const validatorId = 1;
    const firstDelegationAmount = 39_000_000;
    const secondDelegationAmount = 1_000_000;
    const smallDelegationId = 1;
    const totalDelegated = firstDelegationAmount + secondDelegationAmount;
    const nodeIndexes = [0, 1];

    let owner: SignerWithAddress;
    let validator: Wallet;
    let nodeAddress: Wallet;

    let contractManager: ContractManager;
    let constantsHolder: ConstantsHolder;
    let nodesContract: Nodes;
    let skaleManager: SkaleManager;
    let skaleToken: SkaleToken;
    let schainsInternal: SchainsInternalMock;
    let validatorService: ValidatorService;
    let delegationController: DelegationController;
    let delegationPeriodManager: DelegationPeriodManager;
    let distributor: Distributor;
    let skaleDKG: SkaleDKGTester;
    let bountyContract: BountyV2;

    const moveToBountyReadyTime = async (indexes: number[] = nodeIndexes) => {
        let readyAt = 0n;
        for (const nodeIndex of indexes) {
            const nextRewardTimestamp = await bountyContract.getNextRewardTimestamp(nodeIndex);
            if (nextRewardTimestamp > readyAt) {
                readyAt = nextRewardTimestamp;
            }
        }
        const now = await currentTime();
        if (now < readyAt) {
            await skipTime(readyAt - now + 1n);
        }
    };

    const claimInOrderAndLog = async (label: string, indexes: number[]) => {
        let total = 0n;
        const perNode = new Map<number, bigint>();
        logSubSubsection(`${label} | claim order: ${indexes.join(" -> ")}`);
        await moveToBountyReadyTime(indexes);
        for (const nodeIndex of indexes) {
            await skaleManager.connect(nodeAddress).getBounty.staticCall(nodeIndex);
            const before = await skaleToken.balanceOf(distributor);
            await skaleManager.connect(nodeAddress).getBounty(nodeIndex);
            const after = await skaleToken.balanceOf(distributor);
            const nodeBounty = after - before;
            total += nodeBounty;
            perNode.set(nodeIndex, nodeBounty);
            console.log(`  node ${nodeIndex}: ${formatSkl(nodeBounty)}`);
        }
        console.log(`  total:   ${formatSkl(total)}`);
        return {total, perNode};
    };

    fastBeforeEach(async () => {
        [owner,] = await ethers.getSigners();

        validator = new Wallet(String(privateKeys[1])).connect(ethers.provider);
        nodeAddress = new Wallet(String(privateKeys[4])).connect(ethers.provider);
        await owner.sendTransaction({to: nodeAddress.address, value: ethers.parseEther("10000")});
        await owner.sendTransaction({to: validator.address, value: ethers.parseEther("10000")});

        contractManager = await deployContractManager();

        skaleToken = await deploySkaleToken(contractManager);
        constantsHolder = await deployConstantsHolder(contractManager);
        nodesContract = await deployNodes(contractManager);
        schainsInternal = await deploySchainsInternalMock(contractManager);
        await deploySchains(contractManager);
        skaleManager = await deploySkaleManager(contractManager);
        validatorService = await deployValidatorService(contractManager);
        delegationController = await deployDelegationController(contractManager);
        delegationPeriodManager = await deployDelegationPeriodManager(contractManager);
        distributor = await deployDistributor(contractManager);
        skaleDKG = await deploySkaleDKGTester(contractManager);
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG);
        await contractManager.setContractsAddress("SchainsInternal", schainsInternal);
        bountyContract = await deployBounty(contractManager);
        await deployWallets(contractManager);

        const constantsHolderManagerRole = await constantsHolder.CONSTANTS_HOLDER_MANAGER_ROLE();
        await constantsHolder.grantRole(constantsHolderManagerRole, owner.address);
        const bountyReductionManagerRole = await bountyContract.BOUNTY_REDUCTION_MANAGER_ROLE();
        await bountyContract.grantRole(bountyReductionManagerRole, owner.address);
        const validatorManagerRole = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(validatorManagerRole, owner.address);
        const nodeManagerRole = await nodesContract.NODE_MANAGER_ROLE();
        await nodesContract.grantRole(nodeManagerRole, owner.address);
        const delegationPeriodSetterRole = await delegationPeriodManager.DELEGATION_PERIOD_SETTER_ROLE();
        await delegationPeriodManager.grantRole(delegationPeriodSetterRole, owner.address);

        const premined = "100000000000000000000000000";
        await skaleToken.mint(owner.address, premined, "0x", "0x");
        await constantsHolder.setLaunchTimestamp(await currentTime());
        await bountyContract.enableBountyReduction();

        await validatorService.connect(validator).registerValidator("D2", "D2 bounty study", 150, 0);
        const validatorIndex = await validatorService.getValidatorId(validator.address);
        const signature = await nodeAddress.signMessage(
            ethers.getBytes(
                ethers.solidityPackedKeccak256(["uint"], [validatorIndex])
            )
        );
        await validatorService.connect(validator).linkNodeAddress(nodeAddress.address, signature);
        await validatorService.enableValidator(validatorId);

        await delegationPeriodManager.setDelegationPeriod(1, 200);

        await skaleToken.transfer(validator.address, 50_000_000);

        await delegationController.connect(validator).delegate(
            validatorId,
            firstDelegationAmount,
            1,
            "39M delegation"
        );
        await delegationController.connect(validator).acceptPendingDelegation(0);

        await delegationController.connect(owner).delegate(
            validatorId,
            secondDelegationAmount,
            1,
            "1M delegation"
        );
        await delegationController.connect(validator).acceptPendingDelegation(1);

        // Progressive MSR: requiredDelegation(2 nodes) = 3 * MSR
        //await constantsHolder.setMSR(13_333_333);
        await constantsHolder.setMSR(20_000_000);
        await nextMonth(contractManager);

        await skaleManager.connect(nodeAddress).createNode(
            8545,
            0,
            "0x7f000001",
            "0x7f000001",
            getPublicKey(nodeAddress),
            "study-node-0",
            "study.domain.name"
        );
        await skaleManager.connect(nodeAddress).createNode(
            8545,
            1,
            "0x7f000002",
            "0x7f000002",
            getPublicKey(nodeAddress),
            "study-node-1",
            "study.domain.name"
        );
    });

    it("should set up bounty study preconditions", async () => {
        (await delegationController.getDelegationsByValidatorLength(validatorId)).should.be.equal(2);

        const delegation0 = await delegationController.getDelegation(0);
        const delegation1 = await delegationController.getDelegation(1);
        delegation0.amount.should.be.equal(firstDelegationAmount);
        delegation1.amount.should.be.equal(secondDelegationAmount);

        //(await bountyContract.getRequiredNodesNumber(totalDelegated)).should.be.equal(2);
        (BigInt(totalDelegated)/(await constantsHolder.msr())).should.be.equal(2);
        (await nodesContract.getNumberOfNodes()).should.be.equal(2);
        (await nodesContract.numberOfActiveNodes()).should.be.equal(2);

        for (let nodeIndex = 0; nodeIndex < 2; ++nodeIndex) {
            (await nodesContract.getNodeStatus(nodeIndex)).should.be.equal(0);
        }

        (await bountyContract.bountyReduction()).should.be.equal(true);
    });

    it("should compare month1/month2/month3 claims with and without undelegation request", async () => {
        logSection("Claim order always (0->1): without request vs with undelegation request");

        const baselineSnapshot = await takeSnapshot();

        logSubsection("Without undelegation requested");
        const baselineMonth1 = await claimInOrderAndLog("month1 | no request | order 0->1", [0, 1]);
        await nextMonth(contractManager);
        const baselineMonth2 = await claimInOrderAndLog("month2 | no request | order 0->1", [0, 1]);
        await nextMonth(contractManager);
        const baselineMonth3 = await claimInOrderAndLog("month3 | no request | order 0->1", [0, 1]);

        await baselineSnapshot.restore();

        logSubsection("With undelegation requested");
        await delegationController.connect(owner).requestUndelegation(smallDelegationId);
        const requestedMonth1 = await claimInOrderAndLog("month1 | request sent | order 0->1", [0, 1]);
        await nextMonth(contractManager);
        const requestedMonth2 = await claimInOrderAndLog("month2 | request sent | order 0->1", [0, 1]);
        await nextMonth(contractManager);
        const requestedMonth3 = await claimInOrderAndLog("month3 | request sent | order 0->1", [0, 1]);

        // Request does not affect current-month payout, but affects following month.
        requestedMonth1.total.should.be.closeTo(baselineMonth1.total, 1n);
        requestedMonth2.total.should.not.be.equal(baselineMonth2.total);
        requestedMonth3.total.should.not.be.equal(baselineMonth3.total);
    });

    it("should compare month1/month2/month3 claims for orders 0->1 vs 1->0 after undelegation request", async () => {
        logSection("Undelegation requested: compare order 0->1 vs order 1->0 across month1/month2/month3");

        await delegationController.connect(owner).requestUndelegation(smallDelegationId);
        const afterRequestSnapshot = await takeSnapshot();

        logSubsection("With order 0->1, undelegation requested");
        const order01Month1 = await claimInOrderAndLog("month1 order 0->1", [0, 1]);
        await nextMonth(contractManager);
        const order01Month2 = await claimInOrderAndLog("month2 order 0->1", [0, 1]);
        await nextMonth(contractManager);
        const order01Month3 = await claimInOrderAndLog("month3 order 0->1", [0, 1]);

        await afterRequestSnapshot.restore();

        logSubsection("With order 1->0, undelegation requested");
        const order10Month1 = await claimInOrderAndLog("month1 order 1->0", [1, 0]);
        await nextMonth(contractManager);
        const order10Month2 = await claimInOrderAndLog("month2 order 1->0", [1, 0]);
        await nextMonth(contractManager);
        const order10Month3 = await claimInOrderAndLog("month3 order 1->0", [1, 0]);

        // Month 1 should be order-invariant after request.
        order01Month1.total.should.be.closeTo(order10Month1.total, 1n);
        order01Month1.perNode.get(0)!.should.be.closeTo(order10Month1.perNode.get(0)!, 1n);
        order01Month1.perNode.get(1)!.should.be.closeTo(order10Month1.perNode.get(1)!, 1n);

        // Month 2 should be order-sensitive.
        order01Month2.perNode.get(0)!.should.not.be.equal(order10Month2.perNode.get(0)!);
        order01Month2.perNode.get(1)!.should.not.be.equal(order10Month2.perNode.get(1)!);
        order01Month2.perNode.get(0)!.should.be.greaterThan(order01Month2.perNode.get(1)!);
        order10Month2.perNode.get(1)!.should.be.greaterThan(order10Month2.perNode.get(0)!);

        // Month 3 should remain order-sensitive.
        order01Month3.perNode.get(0)!.should.not.be.equal(order10Month3.perNode.get(0)!);
        order01Month3.perNode.get(1)!.should.not.be.equal(order10Month3.perNode.get(1)!);
        order01Month3.perNode.get(0)!.should.be.greaterThan(order01Month3.perNode.get(1)!);
        order10Month3.perNode.get(1)!.should.be.greaterThan(order10Month3.perNode.get(0)!);
    });


    describe("with extra 20M delegation (effective from month2)", () => {
        fastBeforeEach(async () => {
            // Add delegation so that it should/could have 1 more node
            await delegationController.connect(owner).delegate(
                validatorId,
                20_000_000,
                1,
                "20M delegation"
            );
            await delegationController.connect(validator).acceptPendingDelegation(2);
            const snapshot = await takeSnapshot();
            // Confirm it becomes effective next month
            await nextMonth(contractManager);
            const delegation = await delegationController.getAndUpdateDelegatedToValidatorNow.staticCall(validatorId);
            console.log(delegation);
            (delegation / BigInt(await constantsHolder.msr())).should.be.equal(3);
            await snapshot.restore();
        });

        it("should compare month1/month2/month3 claims (order 0->1) with vs without undelegation request", async () => {
            logSection("[Extra 20M] Claim order 0->1: no request vs undelegation request");

            const baselineSnapshot = await takeSnapshot();

            logSubsection("Without undelegation requested");
            const baselineMonth1 = await claimInOrderAndLog("month1 | no request | order 0->1", [0, 1]);
            await nextMonth(contractManager);
            const baselineMonth2 = await claimInOrderAndLog("month2 | no request | order 0->1", [0, 1]);
            await nextMonth(contractManager);
            const baselineMonth3 = await claimInOrderAndLog("month3 | no request | order 0->1", [0, 1]);

            await baselineSnapshot.restore();

            logSubsection("With undelegation requested");
            await delegationController.connect(owner).requestUndelegation(smallDelegationId);
            const requestedMonth1 = await claimInOrderAndLog("month1 | request sent | order 0->1", [0, 1]);
            await nextMonth(contractManager);
            const requestedMonth2 = await claimInOrderAndLog("month2 | request sent | order 0->1", [0, 1]);
            await nextMonth(contractManager);
            const requestedMonth3 = await claimInOrderAndLog("month3 | request sent | order 0->1", [0, 1]);

            requestedMonth1.total.should.be.closeTo(baselineMonth1.total, 1n);
            requestedMonth2.total.should.not.be.equal(baselineMonth2.total);
            requestedMonth3.total.should.not.be.equal(baselineMonth3.total);
        });

        it("should compare month1/month2/month3 claims for order 0->1 vs 1->0 without undelegation request", async () => {
            logSection("[Extra 20M] No undelegation request: compare order 0->1 vs order 1->0 across month1/month2/month3");

            const baseSnapshot = await takeSnapshot();

            logSubsection("With order 0->1, no undelegation request");
            const order01Month1 = await claimInOrderAndLog("month1 order 0->1", [0, 1]);
            await nextMonth(contractManager);
            const order01Month2 = await claimInOrderAndLog("month2 order 0->1", [0, 1]);
            await nextMonth(contractManager);
            const order01Month3 = await claimInOrderAndLog("month3 order 0->1", [0, 1]);

            await baseSnapshot.restore();

            logSubsection("With order 1->0, no undelegation request");
            const order10Month1 = await claimInOrderAndLog("month1 order 1->0", [1, 0]);
            await nextMonth(contractManager);
            const order10Month2 = await claimInOrderAndLog("month2 order 1->0", [1, 0]);
            await nextMonth(contractManager);
            const order10Month3 = await claimInOrderAndLog("month3 order 1->0", [1, 0]);

            order01Month1.total.should.be.closeTo(order10Month1.total, 1n);
            order01Month1.perNode.get(0)!.should.be.closeTo(order10Month1.perNode.get(0)!, 1n);
            order01Month1.perNode.get(1)!.should.be.closeTo(order10Month1.perNode.get(1)!, 1n);

            // In this linear-mode path, month 2 and month 3 are order-invariant.
            order01Month2.total.should.be.closeTo(order10Month2.total, 1n);
            order01Month2.perNode.get(0)!.should.be.closeTo(order10Month2.perNode.get(0)!, 1n);
            order01Month2.perNode.get(1)!.should.be.closeTo(order10Month2.perNode.get(1)!, 1n);

            order01Month3.total.should.be.closeTo(order10Month3.total, 1n);
            order01Month3.perNode.get(0)!.should.be.closeTo(order10Month3.perNode.get(0)!, 1n);
            order01Month3.perNode.get(1)!.should.be.closeTo(order10Month3.perNode.get(1)!, 1n);
        });
    });

    /*
    describe("with high psrActivationMonth and MSR=20M", () => {
        fastBeforeEach(async () => {
            await bountyContract.setPsrActivationMonth(2n ** 255n);
            await constantsHolder.setMSR(20_000_000);
        });

        it("should compare month1/month2 claims with and without undelegation request (linear mode)", async () => {
            logSection("[Linear mode] Claim order always (0->1): without request vs with undelegation request");

            const baselineSnapshot = await takeSnapshot();

            logSubsection("Without undelegation requested");
            const baselineMonth1 = await claimInOrderAndLog("month1 | no request | order 0->1", [0, 1]);
            await nextMonth(contractManager);
            const baselineMonth2 = await claimInOrderAndLog("month2 | no request | order 0->1", [0, 1]);

            await baselineSnapshot.restore();

            logSubsection("With undelegation requested");
            await delegationController.connect(owner).requestUndelegation(smallDelegationId);
            const requestedMonth1 = await claimInOrderAndLog("month1 | request sent | order 0->1", [0, 1]);
            await nextMonth(contractManager);
            const requestedMonth2 = await claimInOrderAndLog("month2 | request sent | order 0->1", [0, 1]);

            requestedMonth1.total.should.be.closeTo(baselineMonth1.total, 1n);
            requestedMonth2.total.should.not.be.equal(baselineMonth2.total);
        });

        it("should compare month1/month2 claims for orders 0->1 vs 1->0 after undelegation request (linear mode)", async () => {
            logSection("[Linear mode] Undelegation requested: compare order 0->1 vs order 1->0 across month1/month2");

            await delegationController.connect(owner).requestUndelegation(smallDelegationId);
            const afterRequestSnapshot = await takeSnapshot();

            logSubsection("With order 0->1, undelegation requested");
            const order01Month1 = await claimInOrderAndLog("month1 order 0->1", [0, 1]);
            await nextMonth(contractManager);
            const order01Month2 = await claimInOrderAndLog("month2 order 0->1", [0, 1]);

            await afterRequestSnapshot.restore();

            logSubsection("With order 1->0, undelegation requested");
            const order10Month1 = await claimInOrderAndLog("month1 order 1->0", [1, 0]);
            await nextMonth(contractManager);
            const order10Month2 = await claimInOrderAndLog("month2 order 1->0", [1, 0]);

            order01Month1.total.should.be.closeTo(order10Month1.total, 1n);
            order01Month1.perNode.get(0)!.should.be.closeTo(order10Month1.perNode.get(0)!, 1n);
            order01Month1.perNode.get(1)!.should.be.closeTo(order10Month1.perNode.get(1)!, 1n);

            order01Month2.perNode.get(0)!.should.not.be.equal(order10Month2.perNode.get(0)!);
            order01Month2.perNode.get(1)!.should.not.be.equal(order10Month2.perNode.get(1)!);
            order01Month2.perNode.get(0)!.should.be.greaterThan(order01Month2.perNode.get(1)!);
            order10Month2.perNode.get(1)!.should.be.greaterThan(order10Month2.perNode.get(0)!);
        });
    });*/
});
