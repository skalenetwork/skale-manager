import { ConstantsHolderInstance,
    ContractManagerInstance,
    DelegationServiceInstance,
    SkaleTokenInstance,
    ValidatorServiceInstance } from "../../types/truffle-contracts";

import { skipTime } from "../utils/time";

import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { deployConstantsHolder } from "../utils/deploy/constantsHolder";
import { deployContractManager } from "../utils/deploy/contractManager";
import { deployDelegationService } from "../utils/deploy/delegation/delegationService";
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
    public lastBountyCollectionMonth: BigNumber;

    constructor(arrayData: [string, string, string, string, BigNumber, BigNumber, BigNumber, BigNumber]) {
        this.name = arrayData[0];
        this.validatorAddress = arrayData[1];
        this.requestedAddress = arrayData[2];
        this.description = arrayData[3];
        this.feeRate = new BigNumber(arrayData[4]);
        this.registrationTime = new BigNumber(arrayData[5]);
        this.minimumDelegationAmount = new BigNumber(arrayData[6]);
        this.lastBountyCollectionMonth = new BigNumber(arrayData[7]);

    }
}

contract("ValidatorService", ([owner, holder, validator1, validator2, validator3, nodeAddress]) => {
    let contractManager: ContractManagerInstance;
    let delegationService: DelegationServiceInstance;
    let validatorService: ValidatorServiceInstance;
    let constantsHolder: ConstantsHolderInstance;
    let skaleToken: SkaleTokenInstance;

    const defaultAmount = 100 * 1e18;

    beforeEach(async () => {
        if (await web3.eth.getCode("0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24") === "0x") {
            await web3.eth.sendTransaction({ from: "0x7E6CE355Ca303EAe3a858c172c3cD4CeB23701bc", to: "0xa990077c3205cbDf861e17Fa532eeB069cE9fF96", value: "80000000000000000"});
            await web3.eth.sendSignedTransaction("0xf90a388085174876e800830c35008080b909e5608060405234801561001057600080fd5b506109c5806100206000396000f3fe608060405234801561001057600080fd5b50600436106100a5576000357c010000000000000000000000000000000000000000000000000000000090048063a41e7d5111610078578063a41e7d51146101d4578063aabbb8ca1461020a578063b705676514610236578063f712f3e814610280576100a5565b806329965a1d146100aa5780633d584063146100e25780635df8122f1461012457806365ba36c114610152575b600080fd5b6100e0600480360360608110156100c057600080fd5b50600160a060020a038135811691602081013591604090910135166102b6565b005b610108600480360360208110156100f857600080fd5b5035600160a060020a0316610570565b60408051600160a060020a039092168252519081900360200190f35b6100e06004803603604081101561013a57600080fd5b50600160a060020a03813581169160200135166105bc565b6101c26004803603602081101561016857600080fd5b81019060208101813564010000000081111561018357600080fd5b82018360208201111561019557600080fd5b803590602001918460018302840111640100000000831117156101b757600080fd5b5090925090506106b3565b60408051918252519081900360200190f35b6100e0600480360360408110156101ea57600080fd5b508035600160a060020a03169060200135600160e060020a0319166106ee565b6101086004803603604081101561022057600080fd5b50600160a060020a038135169060200135610778565b61026c6004803603604081101561024c57600080fd5b508035600160a060020a03169060200135600160e060020a0319166107ef565b604080519115158252519081900360200190f35b61026c6004803603604081101561029657600080fd5b508035600160a060020a03169060200135600160e060020a0319166108aa565b6000600160a060020a038416156102cd57836102cf565b335b9050336102db82610570565b600160a060020a031614610339576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b6103428361092a565b15610397576040805160e560020a62461bcd02815260206004820152601a60248201527f4d757374206e6f7420626520616e204552433136352068617368000000000000604482015290519081900360640190fd5b600160a060020a038216158015906103b85750600160a060020a0382163314155b156104ff5760405160200180807f455243313832305f4143434550545f4d4147494300000000000000000000000081525060140190506040516020818303038152906040528051906020012082600160a060020a031663249cb3fa85846040518363ffffffff167c01000000000000000000000000000000000000000000000000000000000281526004018083815260200182600160a060020a0316600160a060020a031681526020019250505060206040518083038186803b15801561047e57600080fd5b505afa158015610492573d6000803e3d6000fd5b505050506040513d60208110156104a857600080fd5b5051146104ff576040805160e560020a62461bcd02815260206004820181905260248201527f446f6573206e6f7420696d706c656d656e742074686520696e74657266616365604482015290519081900360640190fd5b600160a060020a03818116600081815260208181526040808320888452909152808220805473ffffffffffffffffffffffffffffffffffffffff19169487169485179055518692917f93baa6efbd2244243bfee6ce4cfdd1d04fc4c0e9a786abd3a41313bd352db15391a450505050565b600160a060020a03818116600090815260016020526040812054909116151561059a5750806105b7565b50600160a060020a03808216600090815260016020526040902054165b919050565b336105c683610570565b600160a060020a031614610624576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b81600160a060020a031681600160a060020a0316146106435780610646565b60005b600160a060020a03838116600081815260016020526040808220805473ffffffffffffffffffffffffffffffffffffffff19169585169590951790945592519184169290917f605c2dbf762e5f7d60a546d42e7205dcb1b011ebc62a61736a57c9089d3a43509190a35050565b600082826040516020018083838082843780830192505050925050506040516020818303038152906040528051906020012090505b92915050565b6106f882826107ef565b610703576000610705565b815b600160a060020a03928316600081815260208181526040808320600160e060020a031996909616808452958252808320805473ffffffffffffffffffffffffffffffffffffffff19169590971694909417909555908152600284528181209281529190925220805460ff19166001179055565b600080600160a060020a038416156107905783610792565b335b905061079d8361092a565b156107c357826107ad82826108aa565b6107b85760006107ba565b815b925050506106e8565b600160a060020a0390811660009081526020818152604080832086845290915290205416905092915050565b6000808061081d857f01ffc9a70000000000000000000000000000000000000000000000000000000061094c565b909250905081158061082d575080155b1561083d576000925050506106e8565b61084f85600160e060020a031961094c565b909250905081158061086057508015155b15610870576000925050506106e8565b61087a858561094c565b909250905060018214801561088f5750806001145b1561089f576001925050506106e8565b506000949350505050565b600160a060020a0382166000908152600260209081526040808320600160e060020a03198516845290915281205460ff1615156108f2576108eb83836107ef565b90506106e8565b50600160a060020a03808316600081815260208181526040808320600160e060020a0319871684529091529020549091161492915050565b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff161590565b6040517f01ffc9a7000000000000000000000000000000000000000000000000000000008082526004820183905260009182919060208160248189617530fa90519096909550935050505056fea165627a7a72305820377f4a2d4301ede9949f163f319021a6e9c687c292a5e2b2c4734c126b524e6c00291ba01820182018201820182018201820182018201820182018201820182018201820a01820182018201820182018201820182018201820182018201820182018201820");
        }
        contractManager = await deployContractManager();

        constantsHolder = await deployConstantsHolder(contractManager);
        skaleToken = await deploySkaleToken(contractManager);
        delegationService = await deployDelegationService(contractManager);
        validatorService = await deployValidatorService(contractManager);
    });

    it("should register new validator", async () => {
        const { logs } = await delegationService.registerValidator(
            "ValidatorName",
            "Really good validator",
            500,
            100,
            {from: validator1});
        assert.equal(logs.length, 1, "No ValidatorRegistered Event emitted");
        assert.equal(logs[0].event, "ValidatorRegistered");
        const validatorId = logs[0].args.validatorId;
        const validator: Validator = new Validator(
            await validatorService.validators(validatorId));
        assert.equal(validator.name, "ValidatorName");
        assert.equal(validator.validatorAddress, validator1);
        assert.equal(validator.description, "Really good validator");
        assert.equal(validator.feeRate.toNumber(), 500);
        assert.equal(validator.minimumDelegationAmount.toNumber(), 100);
        assert.isTrue(await validatorService.checkValidatorAddressToId(validator1, validatorId));
    });

    describe("when validator registered", async () => {
        beforeEach(async () => {
            await delegationService.registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100,
                {from: validator1});
        });
        it("should reject when validator tried to register new one with the same address", async () => {
            await delegationService.registerValidator(
                "ValidatorName",
                "Really good validator",
                500,
                100,
                {from: validator1})
                .should.be.eventually.rejectedWith("Validator with such address already exists");

        });

        it("should link new node address for validator", async () => {
            const validatorId = 1;
            await delegationService.linkNodeAddress(nodeAddress, {from: validator1});
            const id = new BigNumber(await validatorService.getValidatorId(nodeAddress, {from: validator1})).toNumber();
            assert.equal(id, validatorId);
        });

        it("should reject if validator tried to override node address of another validator or itself", async () => {
            const validatorId = 1;
            await delegationService.registerValidator(
                "Second Validator",
                "Bad validator",
                500,
                100,
                {from: validator2});
            await delegationService.linkNodeAddress(nodeAddress, {from: validator1});
            await delegationService.linkNodeAddress(nodeAddress, {from: validator2})
                .should.be.eventually.rejectedWith("Validator cannot override node address");
            await delegationService.linkNodeAddress(nodeAddress, {from: validator1})
                .should.be.eventually.rejectedWith("Validator cannot override node address");
            const id = new BigNumber(await validatorService.getValidatorId(nodeAddress, {from: validator1})).toNumber();
            assert.equal(id, validatorId);
        });

        it("should unlink node address for validator", async () => {
            const validatorId = 1;
            await delegationService.linkNodeAddress(nodeAddress, {from: validator1});
            await delegationService.registerValidator(
                "Second Validator",
                "Not bad validator",
                500,
                100,
                {from: validator2});
            await delegationService.unlinkNodeAddress(nodeAddress, {from: validator2})
                .should.be.eventually.rejectedWith("Validator hasn't permissions to unlink node");
            const id = new BigNumber(await validatorService.getValidatorId(nodeAddress, {from: validator1})).toNumber();
            assert.equal(id, validatorId);

            await delegationService.unlinkNodeAddress(nodeAddress, {from: validator1});
            await validatorService.getValidatorId(nodeAddress, {from: validator1})
                .should.be.eventually.rejectedWith("Validator with such address doesn't exist");
        });

        describe("when validator requests for a new address", async () => {
            beforeEach(async () => {
                await delegationService.requestForNewAddress(validator3, {from: validator1});
            });

            it("should reject when hacker tries to change validator address", async () => {
                const validatorId = 1;
                await delegationService.confirmNewAddress(validatorId, {from: validator2})
                    .should.be.eventually.rejectedWith("The validator cannot be changed because it isn't the actual owner");
            });

            it("should set new address for validator", async () => {
                const validatorId = new BigNumber(1);
                assert.deepEqual(validatorId, new BigNumber(await validatorService.getValidatorId(validator1)));
                await delegationService.confirmNewAddress(validatorId, {from: validator3});
                assert.deepEqual(validatorId, new BigNumber(await validatorService.getValidatorId(validator3)));
                await validatorService.getValidatorId(validator1)
                    .should.be.eventually.rejectedWith("Validator with such address doesn't exist");

            });
        });

        it("should reject when someone tries to set new address for validator that doesn't exist", async () => {
            await delegationService.requestForNewAddress(validator2)
                .should.be.eventually.rejectedWith("Validator with such address doesn't exist");
        });

        it("should reject if validator tries to set new address as null", async () => {
            await delegationService.requestForNewAddress("0x0000000000000000000000000000000000000000")
            .should.be.eventually.rejectedWith("New address cannot be null");
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
                await delegationService.delegate(validatorId, amount, delegationPeriod, info, {from: holder})
                    .should.be.eventually.rejectedWith("Validator is not authorized to accept request");
            });

            it("should allow to send delegation request if validator is authorized", async () => {
                await validatorService.enableValidator(validatorId, {from: owner});
                await delegationService.delegate(validatorId, amount, delegationPeriod, info, {from: holder});
            });

            it("should not allow to create node if new epoch isn't started", async () => {
                await validatorService.enableValidator(validatorId, {from: owner});
                await delegationService.delegate(validatorId, amount, delegationPeriod, info, {from: holder});
                const delegationId = 0;
                await delegationService.acceptPendingDelegation(delegationId, {from: validator1});

                await validatorService.checkPossibilityCreatingNode(validator1)
                    .should.be.eventually.rejectedWith("Validator has to meet Minimum Staking Requirement");
            });

            it("should allow to create node if new epoch is started", async () => {
                await validatorService.enableValidator(validatorId, {from: owner});
                await delegationService.delegate(validatorId, amount, delegationPeriod, info, {from: holder});
                const delegationId = 0;
                await delegationService.acceptPendingDelegation(delegationId, {from: validator1});
                skipTime(web3, 2592000);

                await validatorService.checkPossibilityCreatingNode(validator1)
                    .should.be.eventually.rejectedWith("Validator has to meet Minimum Staking Requirement");

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
                await delegationService.delegate(validatorId, amount, delegationPeriod, info, {from: holder});
                await delegationService.delegate(validatorId, amount, delegationPeriod, info, {from: validator3});
                const delegationId1 = 0;
                const delegationId2 = 1;
                await delegationService.acceptPendingDelegation(delegationId1, {from: validator1});
                await delegationService.acceptPendingDelegation(delegationId2, {from: validator1});
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
