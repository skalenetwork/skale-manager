import { ContractManagerInstance, WalletsContract } from "../../../types/truffle-contracts";

const Wallets: WalletsContract = artifacts.require("./Wallets");
const name = "Wallets";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await Wallets.new();
    await instance.initialize(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

export async function deployWallets(contractManager: ContractManagerInstance) {
    try {
        return Wallets.at(await contractManager.getContract(name));
    } catch (e) {
        return await deploy(contractManager);
    }
}
