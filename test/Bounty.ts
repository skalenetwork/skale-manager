import {
    ContractManagerInstance,
    ConstantsHolderInstance,
    BountyV2Instance,
    NodesMockInstance,
    SkaleTokenInstance,
    DelegationControllerInstance,
    ValidatorServiceInstance,
    NodesContract,
    SkaleManagerContract,
    BountyV2Contract
} from "../types/truffle-contracts";

import { deployContractManager } from "./tools/deploy/contractManager";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployBounty } from "./tools/deploy/bounty";
import { skipTime, currentTime, months, skipTimeToDate } from "./tools/time";
import chaiAsPromised from "chai-as-promised";
import chaiAlmost from "chai-almost";
import * as chai from "chai";
import { deployNodesMock } from "./tools/deploy/test/nodesMock";
import { deploySkaleToken } from "./tools/deploy/skaleToken";
import { deployDelegationController } from "./tools/deploy/delegation/delegationController";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deployTimeHelpers } from "./tools/deploy/delegation/timeHelpers";
import { deployDelegationPeriodManager } from "./tools/deploy/delegation/delegationPeriodManager";
import { deployMonitors } from "./tools/deploy/monitors";
import { deployDistributor } from "./tools/deploy/delegation/distributor";
import { deploySkaleManagerMock } from "./tools/deploy/test/skaleManagerMock";
import { privateKeys } from "./tools/private-keys";
import * as elliptic from "elliptic";
import { deployPunisher } from "./tools/deploy/delegation/punisher";

chai.should();
chai.use(chaiAsPromised);
chai.use(chaiAlmost(2));
const EC = elliptic.ec;
const ec = new EC("secp256k1");

contract("Bounty", ([owner, admin, hacker, validator, validator2]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let bountyContract: BountyV2Instance;
    let nodes: NodesMockInstance;

    const ten18 = web3.utils.toBN(10).pow(web3.utils.toBN(18));
    const day = 60 * 60 * 24;
    const month = 31 * day;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        constantsHolder = await deployConstantsHolder(contractManager);
        bountyContract = await deployBounty(contractManager);
        nodes = await deployNodesMock(contractManager);
        await contractManager.setContractsAddress("Nodes", nodes.address);
        const skaleManagerMock = await deploySkaleManagerMock(contractManager);
        await contractManager.setContractsAddress("SkaleManager", skaleManagerMock.address);
    });

    it("should allow only owner to call enableBountyReduction", async() => {
        await bountyContract.enableBountyReduction({from: hacker})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await bountyContract.enableBountyReduction({from: admin})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await bountyContract.enableBountyReduction({from: owner});
    });

    it("should allow only owner to call disableBountyReduction", async() => {
        await bountyContract.disableBountyReduction({from: hacker})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await bountyContract.disableBountyReduction({from: admin})
            .should.be.eventually.rejectedWith("Caller is not the owner");
        await bountyContract.disableBountyReduction({from: owner});
    });

    function getBountyForEpoch(epoch: number) {
        const bountyForFirst6Years = [385000000, 346500000, 308000000, 269500000, 231000000, 192500000];
        const year = Math.floor(epoch / 12);
        if (year < 6) {
            return bountyForFirst6Years[year] / 12;
        } else {
            return bountyForFirst6Years[5] / 2 ** (Math.floor((year - 6) / 3) + 1);
        }
    }

    it("should allow to populate BountyV2 contract with data after upgrade", async () => {
        const skaleToken = await deploySkaleToken(contractManager);
        const delegationController = await deployDelegationController(contractManager);
        const validatorService = await deployValidatorService(contractManager);
        const delegationPeriodManager = await deployDelegationPeriodManager(contractManager);
        await deployMonitors(contractManager);
        await deployDistributor(contractManager);
        const Nodes: NodesContract = artifacts.require("./Nodes");
        const nodesContract = await Nodes.new();
        await nodesContract.initialize(contractManager.address);
        await contractManager.setContractsAddress("Nodes", nodesContract.address);
        const SkaleManager: SkaleManagerContract = artifacts.require("./SkaleManager");
        const skaleManagerContract = await SkaleManager.new();
        await skaleManagerContract.initialize(contractManager.address);
        await contractManager.setContractsAddress("SkaleManager", skaleManagerContract.address);

        await delegationPeriodManager.setDelegationPeriod(12, 200);

        await skipTimeToDate(web3, 25, 8); // Sep 25th

        const validatorId = 1;
        const validatorAmount = 1e6;
        const nodesAmount = 2;
        const validator2Id = 2;
        const validator2Amount = 0.5e6;
        const nodesAmount2 = 2;

        // register and delegate to validator
        await skaleToken.mint(validator, ten18.muln(validatorAmount).toString(), "0x", "0x");
        await validatorService.registerValidator("Validator", "", 150, 1e6 + 1, {from: validator});
        await validatorService.enableValidator(validatorId);
        await delegationController.delegate(validatorId, ten18.muln(validatorAmount).toString(), 2, "", {from: validator});
        await delegationController.acceptPendingDelegation(0, {from: validator});

        // register and delegate to validator2
        await skaleToken.mint(validator2, ten18.muln(validator2Amount).toString(), "0x", "0x");
        await validatorService.registerValidator("Validator", "", 150, 1e6 + 1, {from: validator2});
        await validatorService.enableValidator(validator2Id);
        await delegationController.delegate(validator2Id, ten18.muln(validator2Amount).toString(), 12, "", {from: validator2});
        await delegationController.acceptPendingDelegation(1, {from: validator2});

        await skipTimeToDate(web3, 1, 9); // October 1st

        await constantsHolder.setLaunchTimestamp(await currentTime(web3));
        let pubKey = ec.keyFromPrivate(String(privateKeys[3]).slice(2)).getPublic();
        for (let i = 0; i < nodesAmount; ++i) {
            await skaleManagerContract.createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + i.toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + i.toString(16)).slice(-6), // public ip
                ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                "d2-" + i, // name)
                "somedomain.name",
            {from: validator});
        }

        await skipTimeToDate(web3, 2, 9); // October 2nd

        pubKey = ec.keyFromPrivate(String(privateKeys[4]).slice(2)).getPublic();
        for (let i = 0; i < nodesAmount2; ++i) {
            await skaleManagerContract.createNode(
                1, // port
                0, // nonce
                "0x7f" + ("000000" + (i + nodesAmount).toString(16)).slice(-6), // ip
                "0x7f" + ("000000" + (i + nodesAmount).toString(16)).slice(-6), // public ip
                ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')], // public key
                "d2-" + (i + nodesAmount), // name)
                "somedomain.name",
            {from: validator2});
        }

        await skipTimeToDate(web3, 15, 9); // October 15th

        await delegationController.requestUndelegation(0, {from: validator});

        await skipTimeToDate(web3, 28, 9); // October 28th

        await constantsHolder.setMSR(ten18.muln(validator2Amount).toString());

        // upgrade
        const BountyV2: BountyV2Contract = artifacts.require("./BountyV2");
        const bounty2Contract = await BountyV2.new();
        await bounty2Contract.initialize(contractManager.address);
        await contractManager.setContractsAddress("Bounty", bounty2Contract.address);
        let response = await bounty2Contract.populate();
        response.receipt.gasUsed.should.be.below(12e6 / 25);

        await skipTimeToDate(web3, 29, 9); // October 29th

        let bounty = 0;
        for (let i = 0; i < nodesAmount; ++i) {
            response = await skaleManagerContract.getBounty(i, {from: validator});
            response.logs[0].event.should.be.equal("BountyReceived");
            const _bounty = response.logs[0].args.bounty.div(ten18).toNumber();
            if (bounty > 0) {
                bounty.should.be.equal(_bounty);
            } else {
                bounty = _bounty;
            }
        }

        let bounty2 = 0;
        for (let i = 0; i < nodesAmount2; ++i) {
            response = await skaleManagerContract.getBounty(nodesAmount + i, {from: validator2});
            response.logs[0].event.should.be.equal("BountyReceived");
            const _bounty = response.logs[0].args.bounty.div(ten18).toNumber();
            if (i > 0) {
                _bounty.should.be.equal(0);
            } else {
                bounty2 = _bounty;
            }
        }

        bounty.should.be.almost(getBountyForEpoch(0) / (2 * nodesAmount));
        bounty2.should.be.almost(getBountyForEpoch(0) / 2);

        await skipTimeToDate(web3, 29, 10); // November 29th

        bounty = 0;
        for (let i = 0; i < nodesAmount; ++i) {
            response = await skaleManagerContract.getBounty(i, {from: validator});
            response.logs[0].event.should.be.equal("BountyReceived");
            const _bounty = response.logs[0].args.bounty.div(ten18).toNumber();
            if (bounty > 0) {
                bounty.should.be.equal(_bounty);
            } else {
                bounty = _bounty;
            }
        }

        bounty2 = 0;
        for (let i = 0; i < nodesAmount2; ++i) {
            response = await skaleManagerContract.getBounty(nodesAmount + i, {from: validator2});
            response.logs[0].event.should.be.equal("BountyReceived");
            const _bounty = response.logs[0].args.bounty.div(ten18).toNumber();
            if (i > 0) {
                _bounty.should.be.equal(0);
            } else {
                bounty2 = _bounty;
            }
        }

        bounty.should.be.almost(getBountyForEpoch(1) / (2 * nodesAmount));
        bounty2.should.be.almost(getBountyForEpoch(1) / 2);

        await skipTimeToDate(web3, 29, 11); // December 29th

        for (let i = 0; i < nodesAmount; ++i) {
            response = await skaleManagerContract.getBounty(i, {from: validator});
            response.logs[0].event.should.be.equal("BountyReceived");
            const _bounty = response.logs[0].args.bounty.div(ten18).toNumber();
            _bounty.should.be.equal(0);
        }

        bounty2 = 0;
        for (let i = 0; i < nodesAmount; ++i) {
            response = await skaleManagerContract.getBounty(nodesAmount + i, {from: validator2});
            response.logs[0].event.should.be.equal("BountyReceived");
            const _bounty = response.logs[0].args.bounty.div(ten18).toNumber();
            if (i > 0) {
                _bounty.should.be.equal(0);
            } else {
                bounty2 = _bounty;
            }
        }

        bounty2.should.be.almost(getBountyForEpoch(2));
    });

    it("should allow to populate BountyV2 contract with data after upgrade when there is a big amount of validators", async () => {
        const skaleToken = await deploySkaleToken(contractManager);
        const delegationController = await deployDelegationController(contractManager);
        const validatorService = await deployValidatorService(contractManager);
        const delegationPeriodManager = await deployDelegationPeriodManager(contractManager);
        await deployMonitors(contractManager);
        await deployDistributor(contractManager);
        const Nodes: NodesContract = artifacts.require("./Nodes");
        const nodesContract = await Nodes.new();
        await nodesContract.initialize(contractManager.address);
        await contractManager.setContractsAddress("Nodes", nodesContract.address);
        const SkaleManager: SkaleManagerContract = artifacts.require("./SkaleManager");
        const skaleManagerContract = await SkaleManager.new();
        await skaleManagerContract.initialize(contractManager.address);
        await contractManager.setContractsAddress("SkaleManager", skaleManagerContract.address);

        await skipTimeToDate(web3, 25, 8); // Sep 25th

        const validatorsAmount = 50;
        const validators = [];
        for (let i = 0; i < validatorsAmount; ++i) {
            validators.push(web3.eth.accounts.create());
        }

        const etherAmount = 5 * 1e18;
        const delegationAmount = ten18.muln(1e6);

        const web3DelegationController = new web3.eth.Contract(
            artifacts.require("./DelegationController").abi,
            delegationController.address);
        const web3ValidatorService = new web3.eth.Contract(
                artifacts.require("./ValidatorService").abi,
                validatorService.address);

        let delegationId = 0;
        let validatorId = 1;
        for (const validatorAccount of validators) {
            await web3.eth.sendTransaction({from: owner, to: validatorAccount.address, value: etherAmount});
            await skaleToken.mint(validatorAccount.address, delegationAmount.muln(10).toString(), "0x", "0x");

            // register the validator
            let callData = web3ValidatorService.methods.registerValidator(
                "Validator", "", 150, 1e6 + 1).encodeABI();
            let tx = {
                data: callData,
                from: validatorAccount.address,
                gas: 1e6,
                to: validatorService.address,
            };
            let signedTx = await validatorAccount.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            // enable the validator
            await validatorService.enableValidator(validatorId);

            // delegate to the validator
            callData = web3DelegationController.methods.delegate(
                validatorId, delegationAmount.toString(), 2, "D2 is even").encodeABI();
            tx = {
                data: callData,
                from: validatorAccount.address,
                gas: 1e6,
                to: delegationController.address,
            };
            signedTx = await validatorAccount.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            // accept the delegation request
            callData = web3DelegationController.methods.acceptPendingDelegation(
                delegationId).encodeABI();
            tx = {
                data: callData,
                from: validatorAccount.address,
                gas: 1e6,
                to: delegationController.address,
            };
            signedTx = await validatorAccount.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            ++delegationId;
            ++validatorId;
        }

        await skipTimeToDate(web3, 1, 9); // October 1st
        await constantsHolder.setLaunchTimestamp(await currentTime(web3));

        let undelegatedId = 0;
        validatorId = 1;
        for (const validatorAccount of validators) {
            // delegate to the validator
            let callData = web3DelegationController.methods.delegate(
                validatorId, delegationAmount.toString(), 2, "D2 is even").encodeABI();
            let tx = {
                data: callData,
                from: validatorAccount.address,
                gas: 1e6,
                to: delegationController.address,
            };
            let signedTx = await validatorAccount.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            // accept the delegation request
            callData = web3DelegationController.methods.acceptPendingDelegation(
                delegationId).encodeABI();
            tx = {
                data: callData,
                from: validatorAccount.address,
                gas: 1e6,
                to: delegationController.address,
            };
            signedTx = await validatorAccount.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            // request undelegation
            callData = web3DelegationController.methods.requestUndelegation(
                undelegatedId).encodeABI();
            tx = {
                data: callData,
                from: validatorAccount.address,
                gas: 1e6,
                to: delegationController.address,
            };
            signedTx = await validatorAccount.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            ++delegationId;
            ++validatorId;
            ++undelegatedId;
        }

        await skipTimeToDate(web3, 25, 10); // November 25th

        validatorId = 1;
        for (const validatorAccount of validators) {
            // delegate to the validator
            let callData = web3DelegationController.methods.delegate(
                validatorId, delegationAmount.toString(), 2, "D2 is even").encodeABI();
            let tx = {
                data: callData,
                from: validatorAccount.address,
                gas: 1e6,
                to: delegationController.address,
            };
            let signedTx = await validatorAccount.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            // accept the delegation request
            callData = web3DelegationController.methods.acceptPendingDelegation(
                delegationId).encodeABI();
            tx = {
                data: callData,
                from: validatorAccount.address,
                gas: 1e6,
                to: delegationController.address,
            };
            signedTx = await validatorAccount.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            // request undelegation
            callData = web3DelegationController.methods.requestUndelegation(
                undelegatedId).encodeABI();
            tx = {
                data: callData,
                from: validatorAccount.address,
                gas: 1e6,
                to: delegationController.address,
            };
            signedTx = await validatorAccount.signTransaction(tx);
            await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

            ++delegationId;
            ++validatorId;
            ++undelegatedId;
        }

        // upgrade
        const BountyV2: BountyV2Contract = artifacts.require("./BountyV2");
        const bounty2Contract = await BountyV2.new();
        await bounty2Contract.initialize(contractManager.address);
        await contractManager.setContractsAddress("Bounty", bounty2Contract.address);
        const response = await bounty2Contract.populate();
        response.receipt.gasUsed.should.be.below(5e6);

        // return ETH
        for (const validatorAccount of validators) {
            const balance = Number.parseInt(await web3.eth.getBalance(validatorAccount.address), 10);
            const gas = 21 * 1e3;
            const gasPrice = 20 * 1e9;
            const sendTx = {
                from: validatorAccount.address,
                gas,
                gasPrice,
                to: owner,
                value: balance - gas * gasPrice,
            };
            const signedSendTx = await validatorAccount.signTransaction(sendTx);
            await web3.eth.sendSignedTransaction(signedSendTx.rawTransaction);
            await web3.eth.getBalance(validatorAccount.address).should.be.eventually.equal("0");
        }
    });

    describe("when validator is registered and has active delegations", async () => {
        let skaleToken: SkaleTokenInstance;
        let delegationController: DelegationControllerInstance;
        let validatorService: ValidatorServiceInstance;

        const validatorId = 1;
        const validatorAmount = 1e6;
        beforeEach(async () => {
            skaleToken = await deploySkaleToken(contractManager);
            delegationController = await deployDelegationController(contractManager);
            validatorService = await deployValidatorService(contractManager);

            await skaleToken.mint(validator, ten18.muln(validatorAmount).toString(), "0x", "0x");
            await validatorService.registerValidator("Validator", "", 150, 1e6 + 1, {from: validator});
            await validatorService.enableValidator(validatorId);
            await delegationController.delegate(validatorId, ten18.muln(validatorAmount).toString(), 2, "", {from: validator});
            await delegationController.acceptPendingDelegation(0, {from: validator});
            skipTime(web3, month);
        });

        async function calculateBounty(nodeId: number) {
            const estimate = web3.utils.toBN(await bountyContract.estimateBounty(nodeId)).div(ten18).toNumber();
            const bounty = web3.utils.toBN((await bountyContract.calculateBounty.call(nodeId))).div(ten18).toNumber();
            bounty.should.be.almost(estimate);
            await bountyContract.calculateBounty(nodeId);
            await nodes.changeNodeLastRewardDate(nodeId);
            return bounty;
        }

        describe("when second validator is registered and has active delegations", async () => {
            const validator2Id = 2;
            const validator2Amount = 0.5e6;
            beforeEach(async () => {
                const delegationPeriodManager = await deployDelegationPeriodManager(contractManager);

                await skaleToken.mint(validator2, ten18.muln(validator2Amount).toString(), "0x", "0x");
                await validatorService.registerValidator("Validator", "", 150, 1e6 + 1, {from: validator2});
                await validatorService.enableValidator(validator2Id);
                await delegationPeriodManager.setDelegationPeriod(12, 200);
                await delegationController.delegate(validator2Id, ten18.muln(validator2Amount).toString(), 12, "", {from: validator2});
                await delegationController.acceptPendingDelegation(1, {from: validator2});
                skipTime(web3, month);

                await skipTimeToDate(web3, 1, 0); // Jan 1st
                await constantsHolder.setLaunchTimestamp(await currentTime(web3));
                await constantsHolder.setMSR(ten18.muln(validator2Amount).toString());
            });

            it("should pay bounty proportionally to effective validator's stake", async () => {
                await nodes.registerNodes(2, validatorId);
                await nodes.registerNodes(1, validator2Id);

                skipTime(web3, 29 * day);
                const bounty0 = await calculateBounty(0) + await calculateBounty(1);
                const bounty1 = await calculateBounty(2);
                bounty0.should.be.equal(bounty1);
                bounty0.should.be.almost(getBountyForEpoch(0) / 2);
            });

            it("should process nodes adding and removing, delegation and undelegation and slashing", async () => {
                await skaleToken.mint(validator, ten18.muln(10e6).toString(), "0x", "0x");
                await skaleToken.mint(validator2, ten18.muln(10e6).toString(), "0x", "0x");
                const punisher = await deployPunisher(contractManager);
                await contractManager.setContractsAddress("SkaleDKG", contractManager.address); // for testing
                const million = ten18.muln(1e6).toString();

                // Jan 1st
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

                // validator1:
                //     delegations:
                //         0: 1M - 2 months - DELEGATED
                //     nodes:

                // validator2:
                //     delegations:
                //         1: 500K - 12 months - DELEGATED
                //     nodes:

                await delegationController.requestUndelegation(0, {from: validator});

                await skipTimeToDate(web3, 15, 0);

                // Jan 15th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

                // 1. validator1:
                //     delegations:
                //         0: 1M - 2 months - UNDELEGATION_REQUESTED
                //     nodes:

                // 2. validator2:
                //     delegations:
                //         1: 500K - 12 months - DELEGATED
                //     nodes:

                await delegationController.delegate(2, million, 2, "", {from: validator2});
                await delegationController.acceptPendingDelegation(2, {from: validator2});

                await skipTimeToDate(web3, 30, 0);

                // Jan 30th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await skipTimeToDate(web3, 1, 1);

                // Feb 1st
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await skipTimeToDate(web3, 15, 1);

                // Feb 15th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await delegationController.delegate(validatorId, million, 12, "", {from: validator});
                await delegationController.acceptPendingDelegation(3, {from: validator});

                await bountyContract.calculateBounty(0)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(web3, 27, 1);

                // Feb 27th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await delegationController.delegate(validatorId, million, 2, "", {from: validator});
                await delegationController.acceptPendingDelegation(4, {from: validator});

                await constantsHolder.setMSR(ten18.muln(1.5e6).toString());
                let bounty = await calculateBounty(0);
                bounty.should.be.almost(getBountyForEpoch(0) + getBountyForEpoch(1));

                await skipTimeToDate(web3, 1, 2);

                // March 1st
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await delegationController.requestUndelegation(3, {from: validator});

                await bountyContract.calculateBounty(0)
                    .should.be.eventually.rejectedWith("Transaction is sent too early");

                await skipTimeToDate(web3, 15, 2);

                // March 15th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await skipTimeToDate(web3, 29, 2);

                // March 29th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await delegationController.delegate(validatorId, million, 2, "", {from: validator});
                await delegationController.acceptPendingDelegation(5, {from: validator});

                let effectiveDelegated1 = 0.5e6 * 100 + 0.5e6 * 200;
                let effectiveDelegated2 = 1e6 * 100 + 0.5e6 * 200;
                let totalBounty = 0;
                let bountyLeft = getBountyForEpoch(2);

                bounty = await calculateBounty(0);
                bounty.should.be.almost(bountyLeft * effectiveDelegated2 / (effectiveDelegated1 + effectiveDelegated2));
                totalBounty += bounty;

                await skipTimeToDate(web3, 1, 3);

                // April 1st
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await skipTimeToDate(web3, 15, 3);

                // April 15th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await skipTimeToDate(web3, 28, 3);

                // April 28th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await delegationController.delegate(validator2Id, million, 2, "", {from: validator2});
                await delegationController.acceptPendingDelegation(6, {from: validator2});

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

                await skipTimeToDate(web3, 1, 4);

                // May 1st
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await skipTimeToDate(web3, 15, 4);

                // May 15th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await delegationController.requestUndelegation(1, {from: validator2});

                effectiveDelegated2 = 2e6 * 100 + 0.5e6 * 200;
                bountyLeft += getBountyForEpoch(4) - totalBounty;
                totalBounty = 0;

                effectiveDelegated1.should.be.almost(
                    web3.utils.toBN((await delegationController.getEffectiveDelegatedValuesByValidator(validatorId))[0])
                        .div(ten18)
                        .toNumber());
                effectiveDelegated2.should.be.almost(
                    web3.utils.toBN((await delegationController.getEffectiveDelegatedValuesByValidator(validator2Id))[1])
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

                await skipTimeToDate(web3, 29, 4);

                // May 29th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await punisher.slash(validator2Id, ten18.muln(1.25e6).toString());
                effectiveDelegated2 = 1e6 * 100 + 0.25e6 * 200;

                effectiveDelegated1.should.be.almost(
                    web3.utils.toBN((await delegationController.getEffectiveDelegatedValuesByValidator(validatorId))[0])
                        .div(ten18)
                        .toNumber());
                effectiveDelegated2.should.be.almost(
                    web3.utils.toBN((await delegationController.getEffectiveDelegatedValuesByValidator(validator2Id))[0])
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

                await skipTimeToDate(web3, 16, 5);

                // June 16th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await skipTimeToDate(web3, 27, 5);

                await delegationController.requestUndelegation(6, {from: validator2});

                await skipTimeToDate(web3, 28, 5);

                // June 28th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

                await skipTimeToDate(web3, 29, 6);

                // July 29th
                // console.log("ts: current", new Date(await currentTime(web3) * 1000));

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

        // this test was used to manually check bounty distribution

        // it("30 nodes by 1 each day", async () => {
        //     const nodesCount = 30;
        //     const result = new Map<number, object[]>();
        //     const queue = []
        //     for (let i = 0; i < nodesCount; ++i) {
        //         await nodes.registerNodes(1, validatorId);
        //         console.log("Node", i, "is registered", new Date(await currentTime(web3) * 1000))
        //         skipTime(web3, day);
        //         result.set(i, []);
        //         queue.push({nodeId: i, getBountyTimestamp: (await bountyContract.getNextRewardTimestamp(i)).toNumber()})
        //     }
        //     let minBounty = Infinity;
        //     let maxBounty = 0;
        //     const startTime = await currentTime(web3);
        //     queue.sort((a, b) => {
        //         return b.getBountyTimestamp - a.getBountyTimestamp;
        //     });
        //     for (let timestamp = startTime; timestamp < startTime + 365 * day; timestamp = await currentTime(web3)) {
        //         const nodeInfo: {nodeId: number, getBountyTimestamp: number} | undefined = queue.pop();
        //         assert(nodeInfo !== undefined);
        //         if (nodeInfo) {
        //             const nodeId = nodeInfo.nodeId;
        //             if (timestamp < nodeInfo.getBountyTimestamp) {
        //                 skipTime(web3, nodeInfo.getBountyTimestamp - timestamp);
        //                 timestamp = await currentTime(web3)
        //             }
        //             console.log("Node", nodeId, new Date(await currentTime(web3) * 1000))
        //             const bounty = web3.utils.toBN((await bountyContract.calculateBounty.call(nodeId))).div(ten18).toNumber();
        //             // total[nodeIndex] += bounty;
        //             await bountyContract.calculateBounty(nodeId);
        //             await nodes.changeNodeLastRewardDate(nodeId);

        //             nodeInfo.getBountyTimestamp = (await bountyContract.getNextRewardTimestamp(nodeId)).toNumber();
        //             queue.push(nodeInfo)
        //             queue.sort((a, b) => {
        //                 return b.getBountyTimestamp - a.getBountyTimestamp;
        //             });

        //             minBounty = Math.min(minBounty, bounty);
        //             maxBounty = Math.max(maxBounty, bounty);
        //             result.get(nodeId)?.push({timestamp, bounty});
        //         } else {
        //             assert(false, "Internal error");
        //         }
        //     }
        //     console.log(minBounty, maxBounty);
        //     console.log(JSON.stringify(Array.from(result)));
        //     const epochs = []
        //     const timeHelpers = await deployTimeHelpers(contractManager);
        //     for (let i = 0; i < 30; ++i) {
        //         epochs.push((await timeHelpers.monthToTimestamp(i)).toNumber())
        //     }
        //     console.log(JSON.stringify(Array.from(epochs)));
        // })
    });
});
