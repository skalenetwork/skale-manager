import { contracts } from "./deploy";
import { upgrade } from "./upgrade";

async function main() {
    await upgrade(
        "1.8.0-beta.1",
        ["ContractManager"].concat(contracts),
        async (safeTransactions, abi, contractManager) => undefined,
        async (safeTransactions, abi) => undefined
    );
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
