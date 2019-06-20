import { SchainsDataContract,
         SchainsDataInstance,
         ContractManagerContract, 
         ContractManagerInstance} from '../types/truffle-contracts'

const ContractManager: ContractManagerContract = artifacts.require('./ContractManager')
const SchainsData: SchainsDataContract = artifacts.require('./SchainsData')

import chai = require('chai');
import * as chaiAsPromised from 'chai-as-promised'
import BigNumber from 'bignumber.js';
chai.should();
chai.use(chaiAsPromised);

class Schain {
    name: string;
    owner: string;
    indexInOwnerList: BigNumber;
    partOfNode: number;
    lifetime: BigNumber;
    startDate: BigNumber;
    deposit: BigNumber;
    index: BigNumber;

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

contract('ContractManager', ([owner, holder, receiver, nilAddress, accountWith99]) => {  
    let contractManager: ContractManagerInstance;
    let schainsData: SchainsDataInstance;

    beforeEach(async function() {
        contractManager = await ContractManager.new({from: owner});
        schainsData = await SchainsData.new("SchainsFunctionality", contractManager.address, {from: owner});
      });

    it('should initialize schain', async function() {
        schainsData.initializeSchain("TestSchain", holder, 5, 5);

        let schain: Schain = new Schain(await schainsData.schains(web3.utils.soliditySha3("TestSchain")));        
        schain.name.should.be.equal("TestSchain");
        schain.owner.should.be.equal(holder);
        assert(schain.lifetime.isEqualTo(5));    
        assert(schain.deposit.isEqualTo(5));
    });

    describe('on existing schain', async function() {
        const schainNameHash = web3.utils.soliditySha3('TestSchain');

        beforeEach(async function() {
            schainsData.initializeSchain('TestSchain', holder, 5, 5);            
        })

        it('should register shain index for owner', async function() {            
            await schainsData.setSchainIndex(schainNameHash, holder);

            let schain = new Schain(await schainsData.schains(schainNameHash));
            assert(schain.indexInOwnerList.isEqualTo(0));
            
            await schainsData.schainIndexes(holder, 0).should.eventually.equal(schainNameHash);            
        }); 
        
        it('should be able to add schain to node', async function() {
            await schainsData.addSchainForNode(5, schainNameHash);            
            await schainsData.getSchainIdsForNode(5).should.eventually.deep.equal([schainNameHash])
        })

        it('should set amount of resources that schains occupied', async function() {
            await schainsData.addSchainForNode(5, schainNameHash);   
            await schainsData.addGroup(schainNameHash, 1, schainNameHash);
            await schainsData.setNodeInGroup(schainNameHash, 5);
            await schainsData.setSchainPartOfNode(schainNameHash, 2);
            
            expect(new Schain(await schainsData.schains(schainNameHash)).partOfNode).to.be.equal(2);
            let totalResources = new BigNumber(await schainsData.sumOfSchainsResources());            
            assert(totalResources.isEqualTo(64));
        });

        it('should change schain lifetime', async function() {
            await schainsData.changeLifetime(schainNameHash, 7, 8);
            let schain = new Schain(await schainsData.schains(schainNameHash));            
            assert(schain.lifetime.isEqualTo(12));
            assert(schain.deposit.isEqualTo(13));
        });
    });

});