import { ContractManagerInstance,
         DelegationControllerInstance,
         DelegationServiceInstance,
         SkaleTokenInstance,
         TokenLaunchManagerInstance,
         ValidatorServiceInstance} from "../../types/truffle-contracts";

import { skipTime, skipTimeToDate } from "../utils/time";

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "../utils/deploy/contractManager";
import { deployDelegationController } from "../utils/deploy/delegation/delegationController";
import { deployDelegationService } from "../utils/deploy/delegation/delegationService";
import { deployTokenLaunchManager } from "../utils/deploy/delegation/tokenLaunchManager";
import { deployValidatorService } from "../utils/deploy/delegation/validatorService";
import { deploySkaleToken } from "../utils/deploy/skaleToken";
chai.should();
chai.use(chaiAsPromised);

contract("TokenLaunchManager", ([owner, holder, delegation, validator, seller, hacker]) => {
    let contractManager: ContractManagerInstance;
    let skaleToken: SkaleTokenInstance;
    let TokenLaunchManager: TokenLaunchManagerInstance;
    let delegationService: DelegationServiceInstance;
    let validatorService: ValidatorServiceInstance;
    let delegationController: DelegationControllerInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        skaleToken = await deploySkaleToken(contractManager);
        TokenLaunchManager = await deployTokenLaunchManager(contractManager);
        delegationService = await deployDelegationService(contractManager);
        validatorService = await deployValidatorService(contractManager);
        delegationController = await deployDelegationController(contractManager);

        // each test will start from Nov 10
        await skipTimeToDate(web3, 10, 11);
        await skaleToken.mint(owner, TokenLaunchManager.address, 1000, "0x", "0x");
        await delegationService.registerValidator("Validator", "D2 is even", 150, 0, {from: validator});
        await validatorService.enableValidator(1, {from: owner});
    });

    it("should register seller", async () => {
        await TokenLaunchManager.registerSeller(seller);
    });

    it("should not register seller if sender is not owner", async () => {
        await TokenLaunchManager.registerSeller(seller, {from: hacker}).should.be.eventually.rejectedWith("Ownable: caller is not the owner.");
    });

    describe("when seller is registered", async () => {
        beforeEach(async () => {
            await TokenLaunchManager.registerSeller(seller);
        });

        it("should not allow to approve transfer if sender is not seller", async () => {
            await TokenLaunchManager.approve([holder], [10], {from: hacker})
                .should.be.eventually.rejectedWith("Not authorized");
        });

        it("should fail if parameter arrays are with different lengths", async () => {
            await TokenLaunchManager.approve([holder, hacker], [10], {from: seller})
                .should.be.eventually.rejectedWith("Wrong input arrays length");
        });

        it("should not allow to approve transfers with more then total money amount in sum", async () => {
            await TokenLaunchManager.approve([holder, hacker], [500, 501], {from: seller})
                .should.be.eventually.rejectedWith("Balance is too low");
        });

        it("should not allow to retrieve funds if it was not approved", async () => {
            await TokenLaunchManager.retrieve({from: hacker})
                .should.be.eventually.rejectedWith("Transfer is not approved");
        });

        it("should allow seller to approve transfer to buyer", async () => {
            await TokenLaunchManager.approve([holder], [10], {from: seller});
            await TokenLaunchManager.retrieve({from: holder});
            (await skaleToken.balanceOf(holder)).toNumber().should.be.equal(10);
            await skaleToken.transfer(hacker, "1", {from: holder}).should.be.eventually.rejectedWith("Token should be unlocked for transferring");
        });

        describe("when holder bought tokens", async () => {
            const validatorId = 1;
            const totalAmount = 100;

            beforeEach(async () => {
                await TokenLaunchManager.approve([holder], [totalAmount], {from: seller});
                await TokenLaunchManager.retrieve({from: holder});
            });

            it("should be able to delegate part of tokens", async () => {
                const amount = 50;
                const delegationPeriod = 3;
                await delegationService.delegate(validatorId, amount, delegationPeriod, "D2 is even", {from: holder});
                const delegationId = 0;
                await delegationController.acceptPendingDelegation(delegationId, {from: validator});

                await skaleToken.transfer(hacker, 1, {from: holder})
                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                await skaleToken.approve(hacker, 1, {from: holder});
                await skaleToken.transferFrom(holder, hacker, 1, {from: hacker})
                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");
                await skaleToken.send(hacker, 1, "0x", {from: holder})
                    .should.be.eventually.rejectedWith("Token should be unlocked for transferring");

                const month = 60 * 60 * 24 * 31;
                skipTime(web3, month);

                await delegationService.requestUndelegation(delegationId, {from: holder});

                skipTime(web3, month * delegationPeriod);

                await skaleToken.transfer(hacker, totalAmount - amount, {from: holder});
                (await skaleToken.balanceOf(hacker)).toNumber().should.be.equal(totalAmount - amount);

                // TODO: move undelegated tokens too
            });
        });
    });
});
