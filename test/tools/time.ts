import {ethers} from "hardhat";
import {ContractManager} from "../../typechain-types";
import {deployTimeHelpers} from "./deploy/delegation/timeHelpers";
import {BigNumberish} from "ethers";


export async function skipTime(seconds: BigNumberish) {
    const secondsNumber = Number.parseInt(seconds.toString());
    await ethers.provider.send("evm_increaseTime", [secondsNumber]);
    await ethers.provider.send("evm_mine", []);
}

export async function skipTimeToDate(day: number, monthIndex: number) {
    const block = await ethers.provider.getBlock("latest");
    if (!block) {
        throw new Error();
    }
    const timestamp = block.timestamp;
    const now = new Date(timestamp * 1000);
    const targetTime = new Date(Date.UTC(now.getFullYear(), monthIndex, day));
    while (targetTime < now) {
        targetTime.setFullYear(now.getFullYear() + 1);
    }
    const diffInSeconds = Math.round(targetTime.getTime() / 1000) - timestamp;
    await skipTime(diffInSeconds);
}

export async function currentTime() {
    const latestBlock = await ethers.provider.getBlock("latest");
    if (latestBlock) {
        return BigInt(latestBlock.timestamp);
    }
    throw new Error("Can't get latest block");
}

export const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export async function isLeapYear() {
    const timestamp = Number(await currentTime());
    const now = new Date(timestamp * 1000);
    return now.getFullYear() % 4 === 0;
}

export async function nextMonth(contractManager: ContractManager, monthsAmount: BigNumberish = 1) {
    const timeHelpers = await deployTimeHelpers(contractManager);
    const currentEpoch = await timeHelpers.getCurrentMonth();
    await skipTime(await timeHelpers.monthToTimestamp(currentEpoch + BigInt(monthsAmount)) - await currentTime());
}

export async function getTransactionTimestamp(transactionHash: string) {
    const receipt = await ethers.provider.getTransactionReceipt(transactionHash);
    if (!receipt) {
        throw new Error();
    }
    const blockNumber = receipt.blockNumber;
    const block = await ethers.provider.getBlock(blockNumber);
    if (!block) {
        throw new Error();
    }
    return block.timestamp;
}
