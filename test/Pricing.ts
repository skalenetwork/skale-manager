import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";

import { ContractManagerContract,
    ContractManagerInstance,
    PricingContract,
    PricingInstance,
    SchainsDataContract,
    SchainsDataInstance} from "../types/truffle-contracts";
import { totalmem } from "os";



const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const Pricing: PricingContract = artifacts.require("./Pricing");
const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");


chai.should();
chai.use(chaiAsPromised);

class Schain {
    public name: string;
    public owner: string;
    public indexInOwnerList: BigNumber;
    public partOfNode: number;
    public lifetime: BigNumber;
    public startDate: BigNumber;
    public deposit: BigNumber;
    public index: BigNumber;

    constructor(arrayData: [string, string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber]) {
        this.name = arrayData[0];
        this.owner = arrayData[1];
        this.indexInOwnerList = new BigNumber(arrayData[2]);
        this.partOfNode = new BigNumber(arrayData[3]).toNumber();
        this.lifetime = new BigNumber(arrayData[4]);
        this.startDate = new BigNumber(arrayData[5]);
        this.deposit = new BigNumber(arrayData[6]);
        this.index = new BigNumber(arrayData[7]);
    }
}


contract("Pricing", ([owner, holder]) => {
    let contractManager: ContractManagerInstance;
    let pricing: PricingInstance;
    let schainsData: SchainsDataInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: owner});
        pricing = await Pricing.new(contractManager.address, {from: owner});
        schainsData = await SchainsData.new("SchainsFunctionality", contractManager.address, {from: owner});
        await contractManager.setContractsAddress("SchainsData", schainsData.address);

    });

    describe("on existing schain", async () => {
        const bobSchainHash = web3.utils.soliditySha3("BobSchain");
        const davidSchainHash = web3.utils.soliditySha3("DavidSchain");
        const jacobSchainHash = web3.utils.soliditySha3("JacobSchain");

        beforeEach(async () => {
            schainsData.initializeSchain("BobSchain", holder, 10, 2);
            schainsData.initializeSchain("DavidSchain", holder, 10, 4);
            schainsData.initializeSchain("JacobSchain", holder, 10, 8);
        })

        it("should increase number of schains", async () => {
            const numberOfSchains = new BigNumber(await schainsData.numberOfSchains());
            assert(numberOfSchains.isEqualTo(3));
        })

        it("should add schain to node", async () => {
            await schainsData.addSchainForNode(1, bobSchainHash);
            await schainsData.addSchainForNode(2, davidSchainHash);
            await schainsData.addSchainForNode(3, jacobSchainHash);

            await schainsData.addGroup(bobSchainHash, 1, bobSchainHash);
            await schainsData.addGroup(davidSchainHash, 1, davidSchainHash);
            await schainsData.addGroup(jacobSchainHash, 1, jacobSchainHash);
            await schainsData.setNodeInGroup(bobSchainHash, 1);
            await schainsData.setNodeInGroup(davidSchainHash, 2);
            await schainsData.setNodeInGroup(jacobSchainHash, 3);
            console.log('------------------')
            const res = await schainsData.setSchainPartOfNode(bobSchainHash, 4);
            console.log(res.tx)
            console.log('------------------')
            await schainsData.setSchainPartOfNode(davidSchainHash, 8);
            await schainsData.setSchainPartOfNode(jacobSchainHash, 128);

            expect(new Schain(await schainsData.schains(bobSchainHash)).partOfNode).to.be.equal(4);
            expect(new Schain(await schainsData.schains(davidSchainHash)).partOfNode).to.be.equal(8);
            expect(new Schain(await schainsData.schains(jacobSchainHash)).partOfNode).to.be.equal(128);

            const totalResources = new BigNumber(await schainsData.sumOfSchainsResources());
            assert(totalResources.isEqualTo(49));
            await pricing.getTotalLoadPercentage();
    
            // console.log(res);

        })


    })
})