let fs = require("fs");
const fsPromises = fs.promises;

let Web3 = require('web3');
const Tx = require('ethereumjs-tx');

let configFile = require('../truffle-config.js');

const gasMultiplierParameter = 'gas_multiplier';
const argv = require('minimist')(process.argv.slice(2), {string: [gasMultiplierParameter]});
const gas_multiplier = argv[gasMultiplierParameter] === undefined ? 1 : Number(argv[gasMultiplierParameter])

let SkaleToken = artifacts.require('./SkaleToken.sol');
let SkaleManager = artifacts.require('./SkaleManager.sol');
let ManagerData = artifacts.require('./ManagerData.sol');
let NodesData = artifacts.require('./NodesData.sol');
let NodesFunctionality = artifacts.require('./NodesFunctionality.sol');
let ValidatorsData = artifacts.require('./ValidatorsData.sol');
let ValidatorsFunctionality = artifacts.require('./ValidatorsFunctionality.sol');
let SchainsData = artifacts.require('./SchainsData.sol');
let SchainsFunctionality = artifacts.require('./SchainsFunctionality.sol');
let SchainsFunctionalityInternal = artifacts.require('./SchainsFunctionalityInternal.sol');
let ContractManager = artifacts.require('./ContractManager.sol');
let ConstantsHolder = artifacts.require('./ConstantsHolder.sol');
let SkaleDKG = artifacts.require('./SkaleDKG.sol');
let SkaleVerifier = artifacts.require('./SkaleVerifier.sol');
let Decryption = artifacts.require('./Decryption.sol');
let ECDH = artifacts.require('./ECDH.sol');
let Pricing = artifacts.require('./Pricing.sol');
let SkaleBalances = artifacts.require('./SkaleBalances.sol');
let DelegationService = artifacts.require('./DelegationService.sol');
let DelegationRequestManager = artifacts.require('./DelegationRequestManager.sol');
let DelegationPeriodManager = artifacts.require('./DelegationPeriodManager.sol');
let ValidatorService = artifacts.require('./ValidatorService.sol');
let DelegationController = artifacts.require('./DelegationController.sol');

let gasLimit = 6900000;

async function deploy(deployer, network) {
    if (network == "test" || network == "coverage") {
        let web3 = new Web3(new Web3.providers.HttpProvider("http://" + configFile.networks[network].host + ":" + configFile.networks[network].port));
        if (await web3.eth.getCode("0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24") == "0x") {
            await web3.eth.sendTransaction({ from: configFile.networks[network].from, to: "0xa990077c3205cbDf861e17Fa532eeB069cE9fF96", value: "80000000000000000"});
            await web3.eth.sendSignedTransaction("0xf90a388085174876e800830c35008080b909e5608060405234801561001057600080fd5b506109c5806100206000396000f3fe608060405234801561001057600080fd5b50600436106100a5576000357c010000000000000000000000000000000000000000000000000000000090048063a41e7d5111610078578063a41e7d51146101d4578063aabbb8ca1461020a578063b705676514610236578063f712f3e814610280576100a5565b806329965a1d146100aa5780633d584063146100e25780635df8122f1461012457806365ba36c114610152575b600080fd5b6100e0600480360360608110156100c057600080fd5b50600160a060020a038135811691602081013591604090910135166102b6565b005b610108600480360360208110156100f857600080fd5b5035600160a060020a0316610570565b60408051600160a060020a039092168252519081900360200190f35b6100e06004803603604081101561013a57600080fd5b50600160a060020a03813581169160200135166105bc565b6101c26004803603602081101561016857600080fd5b81019060208101813564010000000081111561018357600080fd5b82018360208201111561019557600080fd5b803590602001918460018302840111640100000000831117156101b757600080fd5b5090925090506106b3565b60408051918252519081900360200190f35b6100e0600480360360408110156101ea57600080fd5b508035600160a060020a03169060200135600160e060020a0319166106ee565b6101086004803603604081101561022057600080fd5b50600160a060020a038135169060200135610778565b61026c6004803603604081101561024c57600080fd5b508035600160a060020a03169060200135600160e060020a0319166107ef565b604080519115158252519081900360200190f35b61026c6004803603604081101561029657600080fd5b508035600160a060020a03169060200135600160e060020a0319166108aa565b6000600160a060020a038416156102cd57836102cf565b335b9050336102db82610570565b600160a060020a031614610339576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b6103428361092a565b15610397576040805160e560020a62461bcd02815260206004820152601a60248201527f4d757374206e6f7420626520616e204552433136352068617368000000000000604482015290519081900360640190fd5b600160a060020a038216158015906103b85750600160a060020a0382163314155b156104ff5760405160200180807f455243313832305f4143434550545f4d4147494300000000000000000000000081525060140190506040516020818303038152906040528051906020012082600160a060020a031663249cb3fa85846040518363ffffffff167c01000000000000000000000000000000000000000000000000000000000281526004018083815260200182600160a060020a0316600160a060020a031681526020019250505060206040518083038186803b15801561047e57600080fd5b505afa158015610492573d6000803e3d6000fd5b505050506040513d60208110156104a857600080fd5b5051146104ff576040805160e560020a62461bcd02815260206004820181905260248201527f446f6573206e6f7420696d706c656d656e742074686520696e74657266616365604482015290519081900360640190fd5b600160a060020a03818116600081815260208181526040808320888452909152808220805473ffffffffffffffffffffffffffffffffffffffff19169487169485179055518692917f93baa6efbd2244243bfee6ce4cfdd1d04fc4c0e9a786abd3a41313bd352db15391a450505050565b600160a060020a03818116600090815260016020526040812054909116151561059a5750806105b7565b50600160a060020a03808216600090815260016020526040902054165b919050565b336105c683610570565b600160a060020a031614610624576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b81600160a060020a031681600160a060020a0316146106435780610646565b60005b600160a060020a03838116600081815260016020526040808220805473ffffffffffffffffffffffffffffffffffffffff19169585169590951790945592519184169290917f605c2dbf762e5f7d60a546d42e7205dcb1b011ebc62a61736a57c9089d3a43509190a35050565b600082826040516020018083838082843780830192505050925050506040516020818303038152906040528051906020012090505b92915050565b6106f882826107ef565b610703576000610705565b815b600160a060020a03928316600081815260208181526040808320600160e060020a031996909616808452958252808320805473ffffffffffffffffffffffffffffffffffffffff19169590971694909417909555908152600284528181209281529190925220805460ff19166001179055565b600080600160a060020a038416156107905783610792565b335b905061079d8361092a565b156107c357826107ad82826108aa565b6107b85760006107ba565b815b925050506106e8565b600160a060020a0390811660009081526020818152604080832086845290915290205416905092915050565b6000808061081d857f01ffc9a70000000000000000000000000000000000000000000000000000000061094c565b909250905081158061082d575080155b1561083d576000925050506106e8565b61084f85600160e060020a031961094c565b909250905081158061086057508015155b15610870576000925050506106e8565b61087a858561094c565b909250905060018214801561088f5750806001145b1561089f576001925050506106e8565b506000949350505050565b600160a060020a0382166000908152600260209081526040808320600160e060020a03198516845290915281205460ff1615156108f2576108eb83836107ef565b90506106e8565b50600160a060020a03808316600081815260208181526040808320600160e060020a0319871684529091529020549091161492915050565b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff161590565b6040517f01ffc9a7000000000000000000000000000000000000000000000000000000008082526004820183905260009182919060208160248189617530fa90519096909550935050505056fea165627a7a72305820377f4a2d4301ede9949f163f319021a6e9c687c292a5e2b2c4734c126b524e6c00291ba01820182018201820182018201820182018201820182018201820182018201820a01820182018201820182018201820182018201820182018201820182018201820");
        }
    }
    // await deployer.deploy(ContractManager, {gas: gasLimit}).then(async function(contractManagerInstance) {
    //     await deployer.deploy(SkaleToken, contractManagerInstance.address, [], {gas: gasLimit});
    //     await contractManagerInstance.setContractsAddress("SkaleToken", SkaleToken.address).then(function(res) {
    //         console.log("Contract Skale Token with address", SkaleToken.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(ConstantsHolder, contractManagerInstance.address, {gas: gasLimit});
    //     await contractManagerInstance.setContractsAddress("Constants", ConstantsHolder.address).then(function(res) {
    //         console.log("Contract Constants with address", ConstantsHolder.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(NodesData, 5260000, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("NodesData", NodesData.address).then(function(res) {
    //         console.log("Contract Nodes Data with address", NodesData.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(NodesFunctionality, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("NodesFunctionality", NodesFunctionality.address).then(function(res) {
    //         console.log("Contract Nodes Functionality with address", NodesFunctionality.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(ValidatorsData, "ValidatorsFunctionality", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("ValidatorsData", ValidatorsData.address).then(function(res) {
    //         console.log("Contract Validators Data with address", ValidatorsData.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(ValidatorsFunctionality, "SkaleManager", "ValidatorsData", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("ValidatorsFunctionality", ValidatorsFunctionality.address).then(function(res) {
    //         console.log("Contract Validators Functionality with address", ValidatorsFunctionality.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SchainsData, "SchainsFunctionalityInternal", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SchainsData", SchainsData.address).then(function(res) {
    //         console.log("Contract Schains Data with address", SchainsData.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SchainsFunctionality, "SkaleManager", "SchainsData", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SchainsFunctionality", SchainsFunctionality.address).then(function(res) {
    //         console.log("Contract Schains Functionality with address", SchainsFunctionality.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SchainsFunctionalityInternal, "SchainsFunctionality", "SchainsData", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SchainsFunctionalityInternal", SchainsFunctionalityInternal.address).then(function(res) {
    //         console.log("Contract Schains Functionality Internal with address", SchainsFunctionalityInternal.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(Decryption, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("Decryption", Decryption.address).then(function(res) {
    //         console.log("Contract Decryption with address", Decryption.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(ECDH, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("ECDH", ECDH.address).then(function(res) {
    //         console.log("Contract ECDH with address", ECDH.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SkaleDKG, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SkaleDKG", SkaleDKG.address).then(function(res) {
    //         console.log("Contract SkaleDKG with address", SkaleDKG.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SkaleVerifier, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SkaleVerifier", SkaleVerifier.address).then(function(res) {
    //         console.log("Contract SkaleVerifier with address", SkaleVerifier.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(ManagerData, "SkaleManager", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("ManagerData", ManagerData.address).then(function(res) {
    //         console.log("Contract Manager Data with address", ManagerData.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SkaleManager, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SkaleManager", SkaleManager.address).then(function(res) {
    //         console.log("Contract Skale Manager with address", SkaleManager.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(Pricing, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("Pricing", Pricing.address).then(function(res) {
    //         console.log("Contract Pricing with address", Pricing.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SkaleBalances, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SkaleBalances", SkaleBalances.address).then(function(res) {
    //         console.log("Contract SkaleBalances with address", SkaleBalances.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(DelegationService, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("DelegationService", DelegationService.address).then(function(res) {
    //         console.log("Contract DelegationService with address", DelegationService.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(DelegationRequestManager, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("DelegationRequestManager", DelegationRequestManager.address).then(function(res) {
    //         console.log("Contract DelegationRequestManager with address", DelegationRequestManager.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(DelegationPeriodManager, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("DelegationPeriodManager", DelegationPeriodManager.address).then(function(res) {
    //         console.log("Contract DelegationPeriodManager with address", DelegationPeriodManager.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(ValidatorService, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("ValidatorService", ValidatorService.address).then(function(res) {
    //         console.log("Contract ValidatorService with address", ValidatorService.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(DelegationController, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("DelegationController", DelegationController.address).then(function(res) {
    //         console.log("Contract DelegationController with address", DelegationController.address, "registred in Contract Manager");
    //         console.log();
    //     });

    //     //
    //     console.log('Deploy done, writing results...');
    //     let jsonObject = {
    //         skale_token_address: SkaleToken.address,
    //         skale_token_abi: SkaleToken.abi,
    //         nodes_data_address: NodesData.address,
    //         nodes_data_abi: NodesData.abi,
    //         nodes_functionality_address: NodesFunctionality.address,
    //         nodes_functionality_abi: NodesFunctionality.abi,
    //         validators_data_address: ValidatorsData.address,
    //         validators_data_abi: ValidatorsData.abi,
    //         validators_functionality_address: ValidatorsFunctionality.address,
    //         validators_functionality_abi: ValidatorsFunctionality.abi,
    //         schains_data_address: SchainsData.address,
    //         schains_data_abi: SchainsData.abi,
    //         schains_functionality_address: SchainsFunctionality.address,
    //         schains_functionality_abi: SchainsFunctionality.abi,
    //         manager_data_address: ManagerData.address,
    //         manager_data_abi: ManagerData.abi,
    //         skale_manager_address: SkaleManager.address,
    //         skale_manager_abi: SkaleManager.abi,
    //         constants_address: ConstantsHolder.address,
    //         constants_abi: ConstantsHolder.abi,
    //         decryption_address: Decryption.address,
    //         decryption_abi: Decryption.abi,
    //         skale_dkg_address: SkaleDKG.address,
    //         skale_dkg_abi: SkaleDKG.abi,
    //         skale_verifier_address: SkaleVerifier.address,
    //         skale_verifier_abi: SkaleVerifier.abi,
    //         contract_manager_address: ContractManager.address,
    //         contract_manager_abi: ContractManager.abi,
    //         pricing_address: Pricing.address,
    //         pricing_abi: Pricing.abi,
    //         skale_balances_address: SkaleBalances.address,
    //         skale_balances_abi: SkaleBalances.abi,
    //         delegation_service_address: DelegationService.address,
    //         delegation_service_abi: DelegationService.abi,
    //         delegation_request_manager_address: DelegationRequestManager.address,
    //         delegation_request_manager_abi: DelegationRequestManager.abi,
    //         delegation_period_manager_address: DelegationPeriodManager.address,
    //         delegation_period_manager_abi: DelegationPeriodManager.abi,
    //         validator_service_address: ValidatorService.address,
    //         validator_service_abi: ValidatorService.abi,
    //         delegation_controller_address: DelegationController.address,
    //         delegation_controller_abi: DelegationController.abi
    //     };

    //     await fsPromises.writeFile(`data/${network}.json`, JSON.stringify(jsonObject));
    //     await sleep(10000);
    //     console.log(`Done, check ${network}.json file in data folder.`);
    // });

    
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = deploy;
