// cspell:words viem
import {runTypeChain, glob} from "typechain";
import {exec} from "child_process";
import {promisify} from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);
const OUTPUT_DIR = "typechain-output";

interface TypeChainConfig {
    name: string;
    target: string;
    outDir: string;
}

const configs: TypeChainConfig[] = [
    {
        name: "ethers-v5",
        target: "ethers-v5",
        outDir: path.join(OUTPUT_DIR, "ethers-v5")
    },
    {
        name: "ethers-v6",
        target: "ethers-v6",
        outDir: path.join(OUTPUT_DIR, "ethers-v6")
    }
];

async function cleanDirectory(dir: string) {
    if (fs.existsSync(dir)) {
        console.log(`Cleaning directory: ${dir}`);
        fs.rmSync(dir, {recursive: true, force: true});
    }
}

async function ensureDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true});
    }
}

async function generateTypes(config: TypeChainConfig) {
    console.log(`\n========================================`);
    console.log(`Generating TypeChain types for ${config.name}`);
    console.log(`========================================\n`);

    // Clean output directory
    await cleanDirectory(config.outDir);
    await ensureDirectory(config.outDir);

    // Find all artifacts
    const cwd = process.cwd();
    const allFiles = glob(cwd, [
        './artifacts/contracts/**/!(*.dbg).json',
        './artifacts/@skalenetwork/**/!(*.dbg).json'
    ]);

    console.log(`Found ${allFiles.length} artifact files`);

    // Run TypeChain programmatically
    try {
        const result = await runTypeChain({
            cwd,
            filesToProcess: allFiles,
            allFiles,
            outDir: config.outDir,
            target: config.target,
        });

        console.log(`✓ Successfully generated types for ${config.name}`);
        console.log(`  Generated ${result.filesGenerated} files`);
    } catch (error) {
        console.error(`✗ Failed to generate types for ${config.name}:`, error);
        throw error;
    }
}

async function main() {
    console.log("Starting TypeChain type generation for multiple libraries...\n");

    // Ensure contracts are compiled
    console.log("Compiling contracts...");
    try {
        const {stdout, stderr} = await execAsync("yarn hardhat compile");
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
    } catch (error) {
        console.error("Failed to compile contracts:", error);
        process.exit(1);
    }

    // Clean main output directory
    await cleanDirectory(OUTPUT_DIR);
    await ensureDirectory(OUTPUT_DIR);

    // Generate types for each configuration
    for (const config of configs) {
        await generateTypes(config);
    }

    console.log("\n========================================");
    console.log("✓ All TypeChain types generated successfully!");
    console.log("========================================\n");
    console.log(`Output directory: ${OUTPUT_DIR}/`);
    console.log(`  - ethers-v5/`);
    console.log(`  - ethers-v6/`);
    console.log("\nNote: Viem types will be generated from ABIs in the buildTypesPackage script.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
