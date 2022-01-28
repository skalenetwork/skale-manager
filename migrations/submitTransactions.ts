import { createMultiSendTransaction, sendSafeTransaction } from "./tools/gnosis-safe";
import { ethers } from "hardhat";
import { promises as fs } from "fs";

async function main() {
    if (!process.env.TRANSACTIONS || !process.env.SAFE) {
        console.log("Example of usage:");
        console.log("SAFE=0x13fD1622F0E7e50A87B79cb296cbAf18362631C0",
            "TRANSACTIONS=data/transactions-1.8.0-mainnet.json",
            "npx hardhat run migrations/submitTransactions.ts --network mainnet");
        process.exit(1);
    }
    if (!process.env.PRIVATE_KEY) {
        console.log("Private key is not set");
        process.exit(1);
    }

    const safe = process.env.SAFE;
    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey.startsWith("0x")) {
        privateKey = "0x" + privateKey;
    }
    const safeTransactions = JSON.parse(await fs.readFile(process.env.TRANSACTIONS, "utf-8")) as string[];

    const safeTx = await createMultiSendTransaction(ethers, safe, privateKey, safeTransactions);
    const chainId = (await ethers.provider.getNetwork()).chainId;
    await sendSafeTransaction(safe, chainId, safeTx);
    console.log("Done");
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}