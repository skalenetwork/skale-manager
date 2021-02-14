import { providers } from "ethers";
import { ethers } from "hardhat";

export async function getSnapshot() {
    return await ethers.provider.send("evm_snapshot", []);
}

export async function revertSnapshot(snapshotId: any) {
    await ethers.provider.send("evm_revert", [snapshotId]);
}
