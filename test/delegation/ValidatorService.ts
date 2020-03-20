import { ConstantsHolderInstance,
    ContractManagerInstance,
    DelegationControllerInstance,
    SkaleTokenInstance,
    ValidatorServiceInstance} from "../../types/truffle-contracts";

import { skipTime } from "../utils/time";

import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployConstantsHolder } from "../utils/deploy/constantsHolder";
import { deployContractManager } from "../utils/deploy/contractManager";
import { deployDelegationController } from "../utils/deploy/delegation/delegationController";
import { deployValidatorService } from "../utils/deploy/delegation/validatorService";
import { deploySkaleToken } from "../utils/deploy/skaleToken";
chai.should();
chai.use(chaiAsPromised);

class Validator {
    public name: string;
    public validatorAddress: string;
    public requestedAddress: string;
    public description: string;
    public feeRate: BigNumber;
    public registrationTime: BigNumber;
    public minimumDelegationAmount: BigNumber;

    constructor(arrayData: [string, string, string, string, BigNumber, BigNumber, BigNumber]) {
        this.name = arrayData[0];
        this.validatorAddress = arrayData[1];
        this.requestedAddress = arrayData[2];
        this.description = arrayData[3];
        this.feeRate = new BigNumber(arrayData[4]);
        this.registrationTime = new BigNumber(arrayData[5]);
        this.minimumDelegationAmount = new BigNumber(arrayData[6]);
    }
}

contract("ValidatorService", ([owner, holder, validator1, validator2, validator3, nodeAddress]) => {
    let contractManager: ContractManagerInstance;
    let validatorService: ValidatorServiceInstance;
    let constantsHolder: ConstantsHolderInstance;
    let skaleToken: SkaleTokenInstance;
    let delegationController: DelegationControllerInstance;

    const defaultAmount = 100 * 1e18;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        constantsHolder = await deployConstantsHolder(contractManager);
        skaleToken = await deploySkaleToken(contractManager);
        validatorService = await deployValidatorService(contractManager);
        delegationController = await deployDelegationController(contractManager);
    });

    it("should register new validator", async () => {
        await validatorService.registerValidator(
            "ValidatorName",
            "Really good validator",
            500,
            100,
            {from: validator1});
        const validatorId = await validatorService.getValidatorId(validator1);
        const validator: Validator = new Validator(
            await validatorService.validators(validatorId));
        assert.equal(validator.name, "ValidatorName");
        assert.equal(validator.validatorAddress, validator1);
        assert.equal(validator.description, "Really good validator");
        assert.equal(validator.feeRate.toNumber(), 500);
        assert.equal(validator.minimumDelegationAmount.toNumber(), 100);
        assert.isTrue(await validatorService.checkValidatorAddressToId(validator1, validatorId));
    });

    it("should reject if validator tried to register with a fee rate higher than 100 percent", async () => {
        await validatorService.registerValidator(
            "ValidatorName",
            "Really good validator",
            1500,
            100,
            {from: validator1})
            .should.be.eventually.rejectedWith("Fee rate of validator should be lower than 100%");
    });

    describe("when validator registered", async () => {
        beforeEach(async () => {
            await validatorService.registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100,
                {from: validator1});
        });

        it("should reject when validator tried to register new one with the same address", async () => {
            await validatorService.registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100,
                {from: validator1})
                .should.be.eventually.rejectedWith("Validator with such address already exists");

        });

        it("should reset name, description, minimum delegation amount", async () => {
            const validatorId = 1;
            await validatorService.setValidatorName("Validator", {from: validator1});
            await validatorService.setValidatorDescription("Good", {from: validator1});
            await validatorService.setValidatorMDA(1, {from: validator1});
            const validator = await validatorService.getValidator(validatorId);
            assert.equal(validator.name, "Validator");
            assert.equal(validator.description, "Good");
            assert.equal(validator.minimumDelegationAmount, new BigNumber(1));
        });

        it("should link new node address for validator", async () => {
            const validatorId = 1;
            await validatorService.linkNodeAddress(nodeAddress, {from: validator1});
            const id = new BigNumber(await validatorService.getValidatorId(nodeAddress, {from: validator1})).toNumber();
            assert.equal(id, validatorId);
        });

        it("should reject if linked node address tried to unlink validator address", async () => {
            await validatorService.linkNodeAddress(nodeAddress, {from: validator1});
            await validatorService.unlinkNodeAddress(validator1, {from: nodeAddress})
                .should.be.eventually.rejectedWith("Address does not have permissions to unlink node");
        });

        it("should reject if validator tried to override node address of another validator", async () => {
            const validatorId = 1;
            await validatorService.registerValidator(
                "Second Validator",
                "Bad validator",
                500,
                100,
                {from: validator2});
            await validatorService.linkNodeAddress(nodeAddress, {from: validator1});
            await validatorService.linkNodeAddress(nodeAddress, {from: validator2})
                .should.be.eventually.rejectedWith("Validator cannot override node address");
            const id = new BigNumber(await validatorService.getValidatorId(nodeAddress, {from: validator1})).toNumber();
            assert.equal(id, validatorId);
        });

        it("should unlink node address for validator", async () => {
            const validatorId = 1;
            await validatorService.linkNodeAddress(nodeAddress, {from: validator1});
            await validatorService.registerValidator(
                "Second Validator",
                "Not bad validator",
                500,
                100,
                {from: validator2});
            await validatorService.unlinkNodeAddress(nodeAddress, {from: validator2})
                .should.be.eventually.rejectedWith("Validator does not have permissions to unlink node");
            const id = new BigNumber(await validatorService.getValidatorId(nodeAddress, {from: validator1})).toNumber();
            assert.equal(id, validatorId);

            await validatorService.unlinkNodeAddress(nodeAddress, {from: validator1});
            await validatorService.getValidatorId(nodeAddress, {from: validator1})
                .should.be.eventually.rejectedWith("Validator with such address does not exist");
        });

        it("should not allow changing the address to the address of an existing validator", async () => {
            await validatorService.registerValidator(
                "Doge",
                "I'm a cat",
                500,
                100,
                {from: validator2});
            await validatorService.requestForNewAddress(validator1, {from: validator2})
                .should.be.eventually.rejectedWith("Address already registered");
        });

        describe("when validator requests for a new address", async () => {
            beforeEach(async () => {
                await validatorService.requestForNewAddress(validator3, {from: validator1});
            });

            it("should reject when hacker tries to change validator address", async () => {
                const validatorId = 1;
                await validatorService.confirmNewAddress(validatorId, {from: validator2})
                    .should.be.eventually.rejectedWith("The validator cannot be changed because it is not the actual owner");
            });

            it("should set new address for validator", async () => {
                const validatorId = new BigNumber(1);
                assert.deepEqual(validatorId, new BigNumber(await validatorService.getValidatorId(validator1)));
                await validatorService.confirmNewAddress(validatorId, {from: validator3});
                assert.deepEqual(validatorId, new BigNumber(await validatorService.getValidatorId(validator3)));
                await validatorService.getValidatorId(validator1)
                    .should.be.eventually.rejectedWith("Validator with such address does not exist");

            });
        });

        it("should reject when someone tries to set new address for validator that doesn't exist", async () => {
            await validatorService.requestForNewAddress(validator2)
                .should.be.eventually.rejectedWith("Validator with such address does not exist");
        });

        it("should reject if validator tries to set new address as null", async () => {
            await validatorService.requestForNewAddress("0x0000000000000000000000000000000000000000")
            .should.be.eventually.rejectedWith("New address cannot be null");
        });

        it("should reject if provided validatorId equals zero", async () => {
            await validatorService.enableValidator(0)
                .should.be.eventually.rejectedWith("Validator with such ID does not exist");
        });

        it("should return list of trusted validators", async () => {
            const validatorId1 = 1;
            const validatorId3 = 3;
            await validatorService.registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100,
                {from: validator2});
            await validatorService.registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100,
                {from: validator3});
            const whitelist = [];
            await validatorService.enableValidator(validatorId1, {from: owner});
            whitelist.push(validatorId1);
            await validatorService.enableValidator(validatorId3, {from: owner});
            whitelist.push(validatorId3);
            const trustedList = (await validatorService.getTrustedValidators()).map(Number);
            assert.deepEqual(whitelist, trustedList);
        });

        describe("when holder has enough tokens", async () => {
            let validatorId: number;
            let amount: number;
            let delegationPeriod: number;
            let info: string;
            beforeEach(async () => {
                validatorId = 1;
                amount = 100;
                delegationPeriod = 3;
                info = "NICE";
                await skaleToken.mint(owner, holder, 200, "0x", "0x");
                await skaleToken.mint(owner, validator3, 200, "0x", "0x");
            });

            it("should allow to enable validator in whitelist", async () => {
                await validatorService.enableValidator(validatorId, {from: validator1})
                    .should.be.eventually.rejectedWith("Ownable: caller is not the owner");
                await validatorService.enableValidator(validatorId, {from: owner});
            });

            it("should allow to disable validator from whitelist", async () => {
                await validatorService.disableValidator(validatorId, {from: validator1})
                    .should.be.eventually.rejectedWith("Ownable: caller is not the owner");
                await validatorService.disableValidator(validatorId, {from: owner});
            });

            it("should not allow to send delegation request if validator isn't authorized", async () => {
                await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder})
                    .should.be.eventually.rejectedWith("Validator is not authorized to accept request");
            });

            it("should allow to send delegation request if validator is authorized", async () => {
                await validatorService.enableValidator(validatorId, {from: owner});
                await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder});
            });

            it("should not allow to create node if new epoch isn't started", async () => {
                await validatorService.enableValidator(validatorId, {from: owner});
                await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder});
                const delegationId = 0;
                await delegationController.acceptPendingDelegation(delegationId, {from: validator1});

                await validatorService.checkPossibilityCreatingNode(validator1)
                    .should.be.eventually.rejectedWith("Validator must meet Minimum Staking Requirement");
            });

            it("should allow to create node if new epoch is started", async () => {
                await validatorService.enableValidator(validatorId, {from: owner});
                await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder});
                const delegationId = 0;
                await delegationController.acceptPendingDelegation(delegationId, {from: validator1});
                skipTime(web3, 2592000);

                await validatorService.checkPossibilityCreatingNode(validator1)
                    .should.be.eventually.rejectedWith("Validator must meet Minimum Staking Requirement");

                await constantsHolder.setMSR(amount);

                // now it should not reject
                await validatorService.checkPossibilityCreatingNode(validator1);

                await validatorService.pushNode(validator1, 0);
                const nodeIndexBN = (await validatorService.getValidatorNodeIndexes(validatorId))[0];
                const nodeIndex = new BigNumber(nodeIndexBN).toNumber();
                assert.equal(nodeIndex, 0);
            });

            it("should allow to create 2 nodes", async () => {
                await validatorService.enableValidator(validatorId, {from: owner});
                await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: holder});
                await delegationController.delegate(validatorId, amount, delegationPeriod, info, {from: validator3});
                const delegationId1 = 0;
                const delegationId2 = 1;
                await delegationController.acceptPendingDelegation(delegationId1, {from: validator1});
                await delegationController.acceptPendingDelegation(delegationId2, {from: validator1});
                skipTime(web3, 2592000);
                await constantsHolder.setMSR(amount);

                await validatorService.checkPossibilityCreatingNode(validator1);
                await validatorService.pushNode(validator1, 0);

                await validatorService.checkPossibilityCreatingNode(validator1);
                await validatorService.pushNode(validator1, 1);

                const nodeIndexesBN = (await validatorService.getValidatorNodeIndexes(validatorId));
                for (let i = 0; i < nodeIndexesBN.length; i++) {
                    const nodeIndexBN = (await validatorService.getValidatorNodeIndexes(validatorId))[i];
                    const nodeIndex = new BigNumber(nodeIndexBN).toNumber();
                    assert.equal(nodeIndex, i);
                }
            });
        });
    });
});
