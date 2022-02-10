import { contracts } from "./deploy";
import { upgrade } from "@skalenetwork/upgrade-tools";
import { getDeployedVersion, setNewVersion } from "./upgrade";

async function main() {
    await upgrade(
        "skale-manager",
        "1.8.0-beta.1",
        getDeployedVersion,
        setNewVersion,
        ["ContractManager"].concat(contracts),
        ["SkaleManager"],
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
