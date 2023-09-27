import {ethers} from "hardhat";

export async function makeSnapshot() {
    return parseInt(await ethers.provider.send("evm_snapshot", []) as string, 16);
}

export async function applySnapshot(snapshot: number) {
    await ethers.provider.send("evm_revert", ["0x" + snapshot.toString(16)]);
}
