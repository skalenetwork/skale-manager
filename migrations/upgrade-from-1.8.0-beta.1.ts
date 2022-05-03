import { contracts } from "./deploy";
import { upgrade } from "./upgrade";

async function main() {
    await upgrade(
        "1.8.0-beta.1",
        ["ContractManager"].concat(contracts),
        () => Promise.resolve(undefined),
        () => Promise.resolve(undefined)
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
