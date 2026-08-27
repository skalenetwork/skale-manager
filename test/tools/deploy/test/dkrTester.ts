import {ContractManager, DKRTester} from "../../../../typechain-types";
import {ethers, upgrades} from "hardhat";

export const deployDKRTester = async (contractManager: ContractManager) => {
    const contractFactory = await ethers.getContractFactory("DKRTester");
    const dkrTester = await upgrades.deployProxy(
        contractFactory,
        [await ethers.resolveAddress(contractManager)],
        {initializer: "initializeTester"}
    ) as unknown as DKRTester;
    await contractManager.setContractsAddress("DKR", dkrTester);
    return dkrTester;
};
