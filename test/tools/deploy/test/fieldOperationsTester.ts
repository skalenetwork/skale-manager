import { ContractManager, FieldOperationsTester } from "../../../../typechain-types";
import { deployWithLibraryWithConstructor } from "../factory";

export const deployFieldOperationsTester = deployWithLibraryWithConstructor(
    "FieldOperationsTester",
    ["Fp2Operations", "G1Operations", "G2Operations"],
    async (contractManager: ContractManager) => {
        return undefined;
    }
) as (contractManager: ContractManager) => Promise<FieldOperationsTester>;
