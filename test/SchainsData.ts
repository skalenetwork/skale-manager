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

contract('ContractManager', ([owner, holder]) => {
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

        describe('on registered schain', async function() {
            this.beforeEach(async function() {
                await schainsData.setSchainIndex(schainNameHash, holder);
                await schainsData.addSchainForNode(5, schainNameHash);
                await schainsData.setSchainPartOfNode(schainNameHash, 2);
            });

            it('should delete schain', async function() {
                await schainsData.removeSchain(schainNameHash, holder);
                await schainsData.schains(schainNameHash).should.be.empty;
            });

            it('should remove schain from node', async function() {
                await schainsData.removeSchainForNode(5, 0);
                assert(new BigNumber(await schainsData.getLengthOfSchainsForNode(5)).isEqualTo(0));
            });

            it('should get schain part of node', async function() {
                let part = new BigNumber(await schainsData.getSchainsPartOfNode(schainNameHash));
                assert(part.isEqualTo(2));
            });

            it('should return amount of created schains by user', async function() {
                assert(new BigNumber(await schainsData.getSchainListSize(holder)).isEqualTo(1));
                assert(new BigNumber(await schainsData.getSchainListSize(owner)).isEqualTo(0));
            })

            it('should get schains ids by user', async function() {
                await schainsData.getSchainIdsByAddress(holder).should.eventually.be.deep.equal([schainNameHash]);
            })

            it('should return schains by node', async function() {
                await schainsData.getSchainIdsForNode(5).should.eventually.be.deep.equal([schainNameHash]);
            })

            it('shoudl return number of schains per node', async function() {
                let count = new BigNumber(await schainsData.getLengthOfSchainsForNode(5));
                assert (count.isEqualTo(1));
            });

        });

        it('shoudl return list of schains', async function() {
            await schainsData.getSchains().should.eventually.deep.equal([schainNameHash]);
        });

        it('should check if schain name is available', async function() {
            await schainsData.isSchainNameAvailable('TestSchain').should.be.eventually.false;
            await schainsData.isSchainNameAvailable('D2WroteThisTest').should.be.eventually.true;
        })

        it('should check if schain is expired', async function() {
            await schainsData.isTimeExpired(schainNameHash).should.be.eventually.false;

            web3.currentProvider.send(
                {
                    jsonrpc: "2.0", 
                    method: "evm_increaseTime", 
                    params: [6],
                    id: 0
                }, 
                function(error: Error | null, val?: any) { });                
            
            // do any transaction to create new block
            await schainsData.setSchainIndex(schainNameHash, holder);            

            await schainsData.isTimeExpired(schainNameHash).should.be.eventually.true;            
        });

        it('should check if user is an owner of schain', async function() {
            await schainsData.isOwnerAddress(owner, schainNameHash).should.be.eventually.false;
            await schainsData.isOwnerAddress(holder, schainNameHash).should.be.eventually.true;
        });

    });

    it('should calculate schainId from schainName', async function() {
        await schainsData.getSchainIdFromSchainName('D2WroteThisTest').should.be.eventually.equal(web3.utils.soliditySha3('D2WroteThisTest'));
    });    

});