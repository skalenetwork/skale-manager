import {ethers} from "hardhat";
import {ContractManager, PaymasterController} from "../../../typechain-types";
import {deployFunctionFactory} from "./factory";
import {deployImaMock} from "./test/imaMock";

export const deployPaymasterController = deployFunctionFactory<PaymasterController>(
    "PaymasterController",
    async (contractManager: ContractManager) => {
        const ima = await deployImaMock(contractManager);

        // Initialize
        const paymasterControllerFactory = await ethers.getContractFactory("PaymasterController");
        const paymasterController = await paymasterControllerFactory.attach(
            await contractManager.getContract("PaymasterController")
        ) as unknown as PaymasterController;
        await paymasterController.setImaAddress(ima);
        await paymasterController.setMarionetteAddress(paymasterController);
        await paymasterController.setPaymasterAddress(paymasterController);
        await paymasterController.setPaymasterChainHash(ethers.solidityPackedKeccak256(["string"], ["d2"]));
    },
);
