import { ContractManager, FieldOperationsTester } from "../../../../typechain";
import { deployWithLibraryWithConstructor } from "../factory";

const deployFieldOperationsTester: (contractManager: ContractManager) => Promise<FieldOperationsTester>
    = deployWithLibraryWithConstructor("FieldOperationsTester", ["Fp2Operations", "G1Operations", "G2Operations"],
                            async (contractManager: ContractManager) => {
                                return undefined;
                            });

export { deployFieldOperationsTester };