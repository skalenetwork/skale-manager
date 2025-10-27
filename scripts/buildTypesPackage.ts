// cspell:words viem

import * as fs from "fs";
import * as path from "path";
import {cleanDirectory, ensureDirectory} from "./generateTypes";

const TYPECHAIN_OUTPUT_DIR = "typechain-output";
const TYPES_PACKAGE_DIR = "types-package";
const ARTIFACTS_DIR = "artifacts";

interface BuildConfig {
    version: string;
}

const PACKAGE_JSON_TEMPLATE = {
    name: "@skalenetwork/skale-manager-types",
    version: "__VERSION__",
    description: "TypeScript typings for SKALE Skale Manager smart contracts",
    repository: {
        type: "git",
        url: "https://github.com/skalenetwork/skale-manager.git"
    },
    keywords: [
       "skale",
       "skale-manager",
       "types",
       "skale-network",
       "ethereum"
    ],
    author: "SKALE Labs",
    license: "AGPL-3.0",
    bugs: {
        url: "https://github.com/skalenetwork/skale-manager/issues"
    },
    homepage: "https://github.com/skalenetwork/skale-manager#readme",
    files: [
        "ethers-v5/**/*",
        "ethers-v6/**/*",
        "viem/**/*",
        "abi/**/*"
    ],
    exports: {
        "./ethers-v5": {
            default: "./ethers-v5/index.ts"
        },
        "./ethers-v6": {
            default: "./ethers-v6/index.ts"
        },
        "./viem": {
            default: "./viem/index.ts"
        },
        "./abi/*": "./abi/*.json"
    },
    peerDependencies: {
        ethers: "^5.0.0 || ^6.0.0",
        viem: "^2.0.0"
    },
    peerDependenciesMeta: {
        ethers: {
            optional: true
        },
        viem: {
            optional: true
        }
    }
};

const README_CONTENT = `# @skalenetwork/skale-manager-types

TypeScript type definitions for SKALE Skale Manager smart contracts.

This package provides TypeChain-generated typings for three popular Ethereum libraries:
- **ethers v5** - via \`@skalenetwork/skale-manager-types/ethers-v5\`
- **ethers v6** - via \`@skalenetwork/skale-manager-types/ethers-v6\`
- **viem** - via \`@skalenetwork/skale-manager-types/viem\`
- **Raw ABIs** - via \`@skalenetwork/skale-manager-types/abi/*\`

## Prerequisites

Install the peer dependency for your preferred library:
\`\`\`bash
npm install ethers@^6.0.0  # or ethers@^5.0.0, or viem@^2.0.0
\`\`\`

## Usage

For usage examples, contract documentation, and more details, see the [Skale Manager repository](https://github.com/skalenetwork/skale-manager).

## License

AGPL-3.0
`;


function copyDirectoryRecursive(src: string, dest: string) {
    if (!fs.existsSync(src)) {
        throw new Error(`Source directory does not exist: ${src}`);
    }

    ensureDirectory(dest);

    const entries = fs.readdirSync(src, {withFileTypes: true});

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectoryRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function getVersion(): string {
    // Try to get version from environment variable (set by CI)
    if (process.env.VERSION) {
        return process.env.VERSION;
    }

    // Try to get version from main package.json
    // Currently irrelevant, so commented out
    /*const packageJsonPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        if (packageJson.version) {
            return packageJson.version;
        }
    }*/

    // Default fallback
    return "0.0.1-mock";
}

function copyTemplateFiles(config: BuildConfig) {
    console.log("\nGenerating package files...");

    // Generate package.json
    const packageJson = {...PACKAGE_JSON_TEMPLATE};
    packageJson.version = config.version;
    const packageJsonPath = path.join(TYPES_PACKAGE_DIR, "package.json");
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
    console.log(`✓ Created package.json with version ${config.version}`);

    // Generate README.md
    const readmePath = path.join(TYPES_PACKAGE_DIR, "README.md");
    fs.writeFileSync(readmePath, README_CONTENT);
    console.log("✓ Created README.md");
}

function copyTypechainTypes() {
    console.log("\nCopying TypeChain generated types...");

    const libraries = ["ethers-v5", "ethers-v6"];

    for (const lib of libraries) {
        const src = path.join(TYPECHAIN_OUTPUT_DIR, lib);
        const dest = path.join(TYPES_PACKAGE_DIR, lib);

        if (!fs.existsSync(src)) {
            throw new Error(`TypeChain output not found for ${lib}. Please run generateTypes.ts first.`);
        }

        copyDirectoryRecursive(src, dest);
        console.log(`✓ Copied ${lib} types`);
    }
}

function extractAndCopyABIs() {
    console.log("\nExtracting and copying ABIs...");

    const abiDir = path.join(TYPES_PACKAGE_DIR, "abi");
    ensureDirectory(abiDir);

    // Define the main contracts we want to extract ABIs for
    const contractsDir = path.join(ARTIFACTS_DIR, "contracts");

    if (!fs.existsSync(contractsDir)) {
        console.warn("⚠ Contracts artifacts directory not found. Skipping ABI extraction.");
        return;
    }

    function extractABIsFromDirectory(dir: string) {
        const entries = fs.readdirSync(dir, {withFileTypes: true});

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // Skip test and mock directories
                if (entry.name === "test" || entry.name === "mocks" || entry.name === "interfaces") {
                    continue;
                }
                extractABIsFromDirectory(fullPath);
            } else if (entry.name.endsWith(".json") && !entry.name.endsWith(".dbg.json")) {
                // Read the artifact file
                const artifactContent = JSON.parse(fs.readFileSync(fullPath, "utf-8"));

                if (artifactContent.abi && Array.isArray(artifactContent.abi)) {
                    // Extract contract name from the artifact
                    const contractName = artifactContent.contractName ||
                                       path.basename(entry.name, ".json");

                    // Save the ABI
                    const abiPath = path.join(abiDir, `${contractName}.json`);
                    fs.writeFileSync(abiPath, JSON.stringify(artifactContent.abi, null, 2));
                    console.log(`✓ Extracted ABI for ${contractName}`);
                }
            }
        }
    }

    extractABIsFromDirectory(contractsDir);

    // Also extract ABIs from SKALE dependencies if they exist
    const skaleArtifactsDir = path.join(ARTIFACTS_DIR, "@skalenetwork");
    if (fs.existsSync(skaleArtifactsDir)) {
        extractABIsFromDirectory(skaleArtifactsDir);
    }
}

function generateViemTypes() {
    console.log("\nGenerating Viem types from ABIs...");

    const abiDir = path.join(TYPES_PACKAGE_DIR, "abi");
    const viemDir = path.join(TYPES_PACKAGE_DIR, "viem");

    if (!fs.existsSync(abiDir)) {
        throw new Error("ABI directory not found. Please ensure ABIs are extracted first.");
    }

    ensureDirectory(viemDir);

    // Read all ABI files
    const abiFiles = fs.readdirSync(abiDir).filter(f => f.endsWith(".json"));

    if (abiFiles.length === 0) {
        console.error("⚠ No ABI files found while generating viem constants.");
        return;
    }

    // Generate individual contract exports
    const exports: string[] = [];

    for (const abiFile of abiFiles) {
        const contractName = path.basename(abiFile, ".json");
        const abiPath = path.join(abiDir, abiFile);
        const abi = JSON.parse(fs.readFileSync(abiPath, "utf-8"));

        // Create a TypeScript file that exports the ABI with proper typing for viem
        const tsContent = `// Auto-generated file - do not edit manually
import type { Abi } from 'viem';

export const ${contractName}Abi = ${JSON.stringify(abi, null, 2)} as const satisfies Abi;
`;

        const tsPath = path.join(viemDir, `${contractName}.ts`);
        fs.writeFileSync(tsPath, tsContent);

        exports.push(`export { ${contractName}Abi } from './${contractName}';`);
        console.log(`✓ Generated viem types for ${contractName}`);
    }

    // Generate index.ts that re-exports everything
    const indexContent = `// Auto-generated file - do not edit manually
${exports.join('\n')}
`;

    fs.writeFileSync(path.join(viemDir, "index.ts"), indexContent);
    console.log("✓ Generated viem/index.ts");
}

function validatePackage() {
    console.log("\nValidating package structure...");

    const requiredPaths = [
        "package.json",
        "README.md",
        "ethers-v5",
        "ethers-v6",
        "viem",
        "abi"
    ];

    for (const relativePath of requiredPaths) {
        const fullPath = path.join(TYPES_PACKAGE_DIR, relativePath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Required path missing: ${relativePath}`);
        }
        console.log(`✓ ${relativePath} exists`);
    }

    // Check that each types directory has an index file
    for (const lib of ["ethers-v5", "ethers-v6", "viem"]) {
        const indexPath = path.join(TYPES_PACKAGE_DIR, lib, "index.ts");
        const indexDtsPath = path.join(TYPES_PACKAGE_DIR, lib, "index.d.ts");

        if (!fs.existsSync(indexPath) && !fs.existsSync(indexDtsPath)) {
            console.error(`⚠ Error: No index file found for ${lib}`);
        }
    }

    console.log("\n✓ Package structure is valid");
}

function printPackageInfo() {
    const packageJsonPath = path.join(TYPES_PACKAGE_DIR, "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    console.log("\n========================================");
    console.log("Package Information");
    console.log("========================================");
    console.log(`Name:    ${packageJson.name}`);
    console.log(`Version: ${packageJson.version}`);
    console.log(`Path:    ${path.resolve(TYPES_PACKAGE_DIR)}`);
    console.log("========================================\n");
}

async function main() {
    console.log("========================================");
    console.log("Building @skalenetwork/skale-manager-types");
    console.log("========================================\n");

    // Get version
    const version = getVersion();
    console.log(`Package version: ${version}\n`);

    const config: BuildConfig = {version};

    // Clean output directory
    cleanDirectory(TYPES_PACKAGE_DIR);
    ensureDirectory(TYPES_PACKAGE_DIR);

    // Copy template files
    copyTemplateFiles(config);

    // Copy TypeChain types
    copyTypechainTypes();

    // Extract and copy ABIs
    extractAndCopyABIs();

    // Generate viem types from ABIs
    generateViemTypes();

    // Validate package
    validatePackage();

    // Print package info
    printPackageInfo();

    console.log("✓ Package built successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n✗ Error building package:");
        console.error(error);
        process.exit(1);
    });
