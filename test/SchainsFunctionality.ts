import { SchainsFunctionalityContract,
         SchainsFunctionalityInstance,
         ContractManagerContract, 
         ContractManagerInstance, 
         SchainsFunctionality1Contract,
         SchainsFunctionality1Instance,
         ConstantsHolderContract,
         ConstantsHolderInstance,
         SchainsDataContract,
         SchainsDataInstance,
         NodesDataContract,
         NodesDataInstance,
         NodesFunctionalityContract,
         NodesFunctionalityInstance} from '../types/truffle-contracts'

const SchainsFunctionality: SchainsFunctionalityContract = artifacts.require('./SchainsFunctionality')
const SchainsFunctionality1: SchainsFunctionality1Contract = artifacts.require('./SchainsFunctionality1');
const ContractManager: ContractManagerContract = artifacts.require('./ContractManager')
const ConstantsHolder: ConstantsHolderContract = artifacts.require('./ConstantsHolder')
const SchainsData: SchainsDataContract = artifacts.require('./SchainsData')
const NodesData: NodesDataContract = artifacts.require('./NodesData')
const NodesFunctionality: NodesFunctionalityContract = artifacts.require('./NodesFunctionality')

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.should();
chai.use(chaiAsPromised);

contract('SchainsFunctionality', ([owner, holder, validator]) => {
    let contractManager: ContractManagerInstance;
    let constantsHolder: ConstantsHolderInstance;
    let schainsFunctionality: SchainsFunctionalityInstance;
    let schainsFunctionality1: SchainsFunctionality1Instance;
    let schainsData: SchainsDataInstance;
    let nodesData: NodesDataInstance;
    let nodesFunctionality: NodesFunctionalityInstance;

    beforeEach(async function() {        
        contractManager = await ContractManager.new({from: owner});   

        constantsHolder = await ConstantsHolder.new(
            contractManager.address, 
            {from: owner, gas: 8000000}
        );
        await contractManager.setContractsAddress("Constants", constantsHolder.address);

        nodesData = await NodesData.new(
            5260000, 
            contractManager.address, 
            {from: owner, gas: 8000000}
        );
        await contractManager.setContractsAddress("NodesData", nodesData.address);

        nodesFunctionality = await NodesFunctionality.new(
            contractManager.address, 
            {from: owner, gas: 8000000}
        );
        await contractManager.setContractsAddress("NodesFunctionality", nodesFunctionality.address);

        schainsData = await SchainsData.new(
            "SchainsFunctionality1", 
            contractManager.address, 
            {from: owner, gas: 8000000});
        await contractManager.setContractsAddress("SchainsData", schainsData.address);

        schainsFunctionality = await SchainsFunctionality.new(
            "SkaleManager", 
            "SchainsData", 
            contractManager.address, 
            {from: owner, gas: 7900000}
        );
        await contractManager.setContractsAddress("SchainsFunctionality", schainsFunctionality.address);

        schainsFunctionality1 = await SchainsFunctionality1.new(
            "SchainsFunctionality", 
            "SchainsData", 
            contractManager.address, 
            {from: owner, gas: 7000000}
        );
        await contractManager.setContractsAddress("SchainsFunctionality1", schainsFunctionality1.address);
    });

    describe('should add schain', async () => {
        it('should fail when money are not enough', async () => {
            await schainsFunctionality.addSchain(
                holder, 
                5,
                '0x10' + '0000000000000000000000000000000000000000000000000000000000000005' + '01' + '0000' + 'd2', 
                {from: owner}
            ).should.be.eventually.rejectedWith("Not enough money to create Schain")
        });

        it('should fail when schain type is wrong', async () => {
            await schainsFunctionality.addSchain(
                holder, 
                5,
                '0x10' + '0000000000000000000000000000000000000000000000000000000000000005' + '06' + '0000' + 'd2', 
                {from: owner}
            ).should.be.eventually.rejectedWith("Invalid type of Schain")
        });

        it('should fail when data parameter is too short', async () => {
            await schainsFunctionality.addSchain(
                holder, 
                5,
                '0x10' + '0000000000000000000000000000000000000000000000000000000000000005' + '06' + '0000', 
                {from: owner}
            ).should.be.eventually.rejectedWith("Incorrect bytes data config")
        });

        it('should fail when nodes count is too low', async () => {
            await schainsFunctionality.addSchain(
                holder, 
                3952894150981,
                '0x10' + '0000000000000000000000000000000000000000000000000000000000000005' + '01' + '0000' + 'd2', 
                {from: owner}
            ).should.be.eventually.rejectedWith("Not enough nodes to create Schain");
        })

        describe('when nodes are registered', async () => {

            beforeEach(async () => {
                const nodesCount = 129
                for (let index of Array.from(Array(nodesCount).keys())) {
                    const hexIndex = ('0' + index.toString(16)).slice(-2);
                    await nodesFunctionality.createNode(validator, "100000000000000000000",
                        '0x00' +
                        '2161' + 
                        '0000' + 
                        '7f0000' + hexIndex +
                        '7f0000' + hexIndex +
                        '1122334455667788990011223344556677889900112233445566778899001122' + 
                        '1122334455667788990011223344556677889900112233445566778899001122' +
                        'd2' + hexIndex
                    );
                }
            });

            it('successfully', async () => {
                await schainsFunctionality.addSchain(                    
                    holder, 
                    3952894150981,
                    '0x10' + '0000000000000000000000000000000000000000000000000000000000000005' + '01' + '0000' + 'd2', 
                    {from: owner}
                )
            })

        });        
    });    

    describe('should calculate schain price', async () => {
        it('of tiny schain', async () => {        
            let price = await schainsFunctionality.getSchainPrice(1, 5);
            let correct_price = web3.utils.toBN(3952894150981);            

            expect(price.eq(correct_price)).to.be.true;
        });

        it('of small schain', async () => {        
            let price = await schainsFunctionality.getSchainPrice(2, 5);
            let correct_price = web3.utils.toBN(63246306415705);

            expect(price.eq(correct_price)).to.be.true;
        });

        it('of medium schain', async () => {        
            let price = await schainsFunctionality.getSchainPrice(3, 5);
            let correct_price = web3.utils.toBN(505970451325642);                                 

            expect(price.eq(correct_price)).to.be.true;
        });

        it('of test schain', async () => {        
            let price = await schainsFunctionality.getSchainPrice(4, 5);
            let correct_price = web3.utils.toBN(1000000000000000000);                        

            expect(price.eq(correct_price)).to.be.true;
        });

        it('of medium test schain', async () => {
            let price = await schainsFunctionality.getSchainPrice(5, 5);
            let correct_price = web3.utils.toBN(31623153207852);

            expect(price.eq(correct_price)).to.be.true;
        });

        it('should revert on wrong schain type', async() => {
            await schainsFunctionality.getSchainPrice(6, 5).should.be.eventually.rejectedWith("Bad schain type");
        });
    });

    
});