import { ContractManager,
    DelegationController,
    SkaleToken,
    ValidatorService} from "../../typechain";


import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "../tools/deploy/contractManager";
import { deployDelegationController } from "../tools/deploy/delegation/delegationController";
import { deployValidatorService } from "../tools/deploy/delegation/validatorService";
import { deploySkaleToken } from "../tools/deploy/skaleToken";
import { deploySkaleManager } from "../tools/deploy/skaleManager";
import { deploySkaleManagerMock } from "../tools/deploy/test/skaleManagerMock";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { assert } from "chai";
import { makeSnapshot, applySnapshot } from "../tools/snapshot";
import { getValidatorIdSignature } from "../tools/signatures";

chai.should();
chai.use(chaiAsPromised);

describe("ValidatorService", () => {
    let owner: SignerWithAddress;
    let holder: SignerWithAddress;
    let validator1: SignerWithAddress;
    let validator2: SignerWithAddress;
    let validator3: SignerWithAddress;
    let nodeAddress: SignerWithAddress;
    let contractManager: ContractManager;
    let validatorService: ValidatorService;
    let skaleToken: SkaleToken;
    let delegationController: DelegationController;
    let snapshot: number;

    before(async () => {
        [owner, holder, validator1, validator2, validator3, nodeAddress] = await ethers.getSigners();
        contractManager = await deployContractManager();

        skaleToken = await deploySkaleToken(contractManager);
        validatorService = await deployValidatorService(contractManager);
        delegationController = await deployDelegationController(contractManager);

        const skaleManagerMock = await deploySkaleManagerMock(contractManager);
        await contractManager.setContractsAddress("SkaleManager", skaleManagerMock.address);
        const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
        await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, owner.address);
    });

    beforeEach(async () => {
        snapshot = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(snapshot);
    });

    it("should register new validator", async () => {
        await validatorService.connect(validator1).registerValidator(
            "ValidatorName",
            "Really good validator",
            500,
            100);
        const validatorId = await validatorService.getValidatorId(validator1.address);
        const validator = await validatorService.validators(validatorId);
        assert.equal(validator.name, "ValidatorName");
        assert.equal(validator.validatorAddress, validator1.address);
        assert.equal(validator.description, "Really good validator");
        assert.equal(validator.feeRate.toNumber(), 500);
        assert.equal(validator.minimumDelegationAmount.toNumber(), 100);
        assert.isTrue(await validatorService.checkValidatorAddressToId(validator1.address, validatorId));
    });

    it("should reject if validator tried to register with a fee rate higher than 100 percent", async () => {
        await validatorService.connect(validator1).registerValidator(
            "ValidatorName",
            "Really good validator",
            1500,
            100)
            .should.be.eventually.rejectedWith("Fee rate of validator should be lower than 100%");
    });

    it("should allow only owner to call disableWhitelist", async() => {
        await validatorService.connect(validator1).disableWhitelist()
            .should.be.eventually.rejectedWith("VALIDATOR_MANAGER_ROLE is required");
        await validatorService.connect(owner).disableWhitelist();
    });

    describe("when validator registered", async () => {
        let cleanContracts: number;
        before(async () => {
            cleanContracts = await makeSnapshot();
            await validatorService.connect(validator1).registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100);
            const validatorId = await validatorService.getValidatorId(validator1.address);
            await validatorService.connect(validator1).linkNodeAddress(nodeAddress.address, await getValidatorIdSignature(validatorId, nodeAddress));
        });

        after(async () => {
            await applySnapshot(cleanContracts);
        });

        it("should reject when validator tried to register new one with the same address", async () => {
            await validatorService.connect(validator1).registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100)
                .should.be.eventually.rejectedWith("Validator with such address already exists");

        });

        it("should reset name, description, minimum delegation amount", async () => {
            const validatorId = 1;
            await validatorService.connect(validator1).setValidatorName("Validator");
            await validatorService.connect(validator1).setValidatorDescription("Good");
            await validatorService.connect(validator1).setValidatorMDA(1);
            const validator = await validatorService.getValidator(validatorId);
            assert.equal(validator.name, "Validator");
            assert.equal(validator.description, "Good");
            validator.minimumDelegationAmount.should.be.equal(1);
        });

        it("should link new node address for validator", async () => {
            const validatorId = await validatorService.getValidatorId(validator1.address);
            const signature = await getValidatorIdSignature(validatorId, nodeAddress);
            await validatorService.connect(validator1).linkNodeAddress(nodeAddress.address, signature);
            const id = await validatorService.getValidatorIdByNodeAddress(nodeAddress.address);
            id.should.be.equal(validatorId);
        });

        it("should reject if linked node address tried to unlink validator address", async () => {
            const validatorId = await validatorService.getValidatorId(validator1.address);
            const signature = await getValidatorIdSignature(validatorId, nodeAddress);
            await validatorService.connect(validator1).linkNodeAddress(nodeAddress.address, signature);
            await validatorService.connect(nodeAddress).unlinkNodeAddress(validator1.address)
                .should.be.eventually.rejectedWith("Validator address does not exist");
        });

        it("should reject if validator tried to override node address of another validator", async () => {
            await validatorService.connect(validator2).registerValidator(
                "Second Validator",
                "Bad validator",
                500,
                100);
            const validatorId1 = await validatorService.getValidatorId(validator1.address);
            const validatorId2 = await validatorService.getValidatorId(validator2.address);
            const signature1 = await getValidatorIdSignature(validatorId1, nodeAddress);
            const signature2 = await getValidatorIdSignature(validatorId2, nodeAddress);
            await validatorService.connect(validator1).linkNodeAddress(nodeAddress.address, signature1);
            await validatorService.connect(validator2).linkNodeAddress(nodeAddress.address, signature2)
                .should.be.eventually.rejectedWith("Validator cannot override node address");
            const id = await validatorService.getValidatorIdByNodeAddress(nodeAddress.address);
            id.should.be.equal(validatorId1);
        });

        it("should not link validator like node address", async () => {
            await validatorService.connect(validator2).registerValidator(
                "Second Validator",
                "Bad validator",
                500,
                100);
            const validatorId = await validatorService.getValidatorId(validator1.address);
            const signature = await getValidatorIdSignature(validatorId, validator2);
            await validatorService.connect(validator1).linkNodeAddress(validator2.address, signature)
                .should.be.eventually.rejectedWith("Node address is a validator");
        });

        it("should unlink node address for validator", async () => {
            const validatorId = await validatorService.getValidatorId(validator1.address);
            const signature = await getValidatorIdSignature(validatorId, nodeAddress);
            await validatorService.connect(validator1).linkNodeAddress(nodeAddress.address, signature);
            await validatorService.connect(validator2).registerValidator(
                "Second Validator",
                "Not bad validator",
                500,
                100);
            await validatorService.connect(validator2).unlinkNodeAddress(nodeAddress.address)
                .should.be.eventually.rejectedWith("Validator does not have permissions to unlink node");
            const id = await validatorService.getValidatorIdByNodeAddress(nodeAddress.address);
            id.should.be.equal(validatorId);

            await validatorService.connect(validator1).unlinkNodeAddress(nodeAddress.address);
            await validatorService.connect(validator1).getValidatorId(nodeAddress.address)
                .should.be.eventually.rejectedWith("Validator address does not exist");
        });

        it("should not allow changing the address to the address of an existing validator", async () => {
            await validatorService.connect(validator2).registerValidator(
                "Doge",
                "I'm a cat",
                500,
                100);
            await validatorService.connect(validator2).requestForNewAddress(validator1.address)
                .should.be.eventually.rejectedWith("Address already registered");
        });

        describe("when validator requests for a new address", async () => {
            let validatorLinkedNode: number;
            before(async () => {
                validatorLinkedNode = await makeSnapshot();
                await validatorService.connect(validator1).requestForNewAddress(validator3.address);
            });

            after(async () => {
                await applySnapshot(validatorLinkedNode);
            });

            it("should reject when hacker tries to change validator address", async () => {
                const validatorId = 1;
                await validatorService.connect(validator2).confirmNewAddress(validatorId)
                    .should.be.eventually.rejectedWith("The validator address cannot be changed because it is not the actual owner");
            });

            it("should set new address for validator", async () => {
                const validatorId = 1;
                (await validatorService.getValidatorId(validator1.address)).should.be.equal(validatorId);
                await validatorService.connect(validator3).confirmNewAddress(validatorId);
                (await validatorService.getValidatorId(validator3.address)).should.be.equal(validatorId);
                await validatorService.getValidatorId(validator1.address)
                    .should.be.eventually.rejectedWith("Validator address does not exist");
            });
        });

        it("should reject when someone tries to set new address for validator that doesn't exist", async () => {
            await validatorService.requestForNewAddress(validator2.address)
                .should.be.eventually.rejectedWith("Validator address does not exist");
        });

        it("should reject if validator tries to set new address as null", async () => {
            await validatorService.requestForNewAddress("0x0000000000000000000000000000000000000000")
            .should.be.eventually.rejectedWith("New address cannot be null");
        });

        it("should reject if provided validatorId equals zero", async () => {
            await validatorService.enableValidator(0)
                .should.be.eventually.rejectedWith("Validator with such ID does not exist");
        });

        it("should allow only VALIDATOR_MANAGER_ROLE to enable validator", async () => {
            await validatorService.connect(holder).enableValidator(1)
                .should.be.eventually.rejectedWith("VALIDATOR_MANAGER_ROLE is required");
            const skaleManager = await deploySkaleManager(contractManager);
            const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
            await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, holder.address);
            await validatorService.connect(holder).enableValidator(1);
        });

        it("should allow only VALIDATOR_MANAGER_ROLE to disable validator", async () => {
            await validatorService.enableValidator(1);
            await validatorService.connect(holder).disableValidator(1)
                .should.be.eventually.rejectedWith("VALIDATOR_MANAGER_ROLE is required");
            const skaleManager = await deploySkaleManager(contractManager);
            const VALIDATOR_MANAGER_ROLE = await validatorService.VALIDATOR_MANAGER_ROLE();
            await validatorService.grantRole(VALIDATOR_MANAGER_ROLE, holder.address);
            await validatorService.connect(holder).disableValidator(1);
        });

        it("should return list of trusted validators", async () => {
            const validatorId1 = 1;
            const validatorId3 = 3;
            await validatorService.connect(validator2).registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100);
            await validatorService.connect(validator3).registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100);
            const whitelist = [];
            await validatorService.enableValidator(validatorId1);
            whitelist.push(validatorId1);
            await validatorService.enableValidator(validatorId3);
            whitelist.push(validatorId3);
            let trustedList = (await validatorService.getTrustedValidators()).map(Number);
            assert.deepEqual(whitelist, trustedList);

            await validatorService.disableValidator(validatorId3);
            whitelist.pop();
            trustedList = (await validatorService.getTrustedValidators()).map(Number);
            assert.deepEqual(whitelist, trustedList);
        });

        describe("when holder has enough tokens", async () => {
            let validatorId: number;
            let amount: number;
            let delegationPeriod: number;
            let info: string;
            const month = 60 * 60 * 24 * 31;
            let validatorLinkedNode: number;
            before(async () => {
                validatorLinkedNode = await makeSnapshot();
                validatorId = 1;
                amount = 100;
                delegationPeriod = 2;
                info = "NICE";
                await skaleToken.mint(holder.address, 200, "0x", "0x");
                await skaleToken.mint(validator3.address, 200, "0x", "0x");
            });

            after(async () => {
                await applySnapshot(validatorLinkedNode);
            });

            it("should allow to enable validator in whitelist", async () => {
                await validatorService.connect(validator1).enableValidator(validatorId)
                    .should.be.eventually.rejectedWith("VALIDATOR_MANAGER_ROLE is required");
                await validatorService.enableValidator(validatorId);
            });

            it("should allow to disable validator from whitelist", async () => {
                await validatorService.connect(validator1).disableValidator(validatorId)
                    .should.be.eventually.rejectedWith("VALIDATOR_MANAGER_ROLE is required");
                await validatorService.disableValidator(validatorId)
                    .should.be.eventually.rejectedWith("Validator is already disabled");

                await validatorService.enableValidator(validatorId);
                await validatorService.isAuthorizedValidator(validatorId).should.eventually.be.true;
                await validatorService.disableValidator(validatorId);
                await validatorService.isAuthorizedValidator(validatorId).should.eventually.be.false;
            });

            it("should not allow to send delegation request if validator isn't authorized", async () => {
                await delegationController.connect(holder).delegate(validatorId, amount, delegationPeriod, info)
                    .should.be.eventually.rejectedWith("Validator is not authorized to accept delegation request");
            });

            it("should allow to send delegation request if validator is authorized", async () => {
                await validatorService.enableValidator(validatorId);
                await delegationController.connect(holder).delegate(validatorId, amount, delegationPeriod, info);
            });

            it("should be possible for the validator to enable and disable new delegation requests", async () => {
                await validatorService.enableValidator(validatorId);
                // should be enabled by default
                await delegationController.connect(holder).delegate(validatorId, amount, delegationPeriod, info);

                await validatorService.connect(holder).stopAcceptingNewRequests()
                    .should.be.eventually.rejectedWith("Validator address does not exist");

                await validatorService.connect(validator1).stopAcceptingNewRequests()
                await delegationController.connect(holder).delegate(validatorId, amount, delegationPeriod, info)
                    .should.be.eventually.rejectedWith("The validator is not currently accepting new requests");

                await validatorService.connect(validator1).startAcceptingNewRequests();
                await delegationController.connect(holder).delegate(validatorId, amount, delegationPeriod, info);
            })
        });
    });
});
