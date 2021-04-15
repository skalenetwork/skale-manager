import { contracts, getContractKeyInAbiFile, getContractFactory } from "./deploy";
import { SchainsInternal } from "../typechain";
import { encodeTransaction } from "./tools/multiSend";
import chalk from "chalk";
import { upgrade } from "./upgrade";

async function main() {

    await upgrade(
        "1.8.0-develop.8",
        ["ContractManager"].concat(contracts),
        async (safeTransactions, abi, contractManager) => undefined,
        async (safeTransactions, abi) => {

            // Initialize schain types
            const schainsInternalName = "SchainsInternal";
            const schainsInternalFactory = await getContractFactory(schainsInternalName);
            const schainsInternalAddress = abi[getContractKeyInAbiFile(schainsInternalName) + "_address"];
            if (schainsInternalAddress) {
                console.log(chalk.yellowBright("Prepare transactions to initialize schains types"));
                const schainsInternal = (schainsInternalFactory.attach(schainsInternalAddress)) as SchainsInternal;
                console.log(chalk.yellowBright("Number of Schain types will be set to 0"));
                safeTransactions.push(encodeTransaction(
                    0,
                    schainsInternal.address,
                    0,
                    schainsInternal.interface.encodeFunctionData("setNumberOfSchainTypes", [0]),
                ));

                console.log(chalk.yellowBright("Schain Type Small will be added"));
                safeTransactions.push(encodeTransaction(
                    0,
                    schainsInternal.address,
                    0,
                    schainsInternal.interface.encodeFunctionData("addSchainType", [1, 16]),
                ));

                console.log(chalk.yellowBright("Schain Type Medium will be added"));
                safeTransactions.push(encodeTransaction(
                    0,
                    schainsInternal.address,
                    0,
                    schainsInternal.interface.encodeFunctionData("addSchainType", [4, 16]),
                ));

                console.log(chalk.yellowBright("Schain Type Large will be added"));
                safeTransactions.push(encodeTransaction(
                    0,
                    schainsInternal.address,
                    0,
                    schainsInternal.interface.encodeFunctionData("addSchainType", [128, 16]),
                ));
            }
        });
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
