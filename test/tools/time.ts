import { ethers } from "hardhat";
import { ContractManager } from "../../typechain-types";
import { deployTimeHelpers } from "./deploy/delegation/timeHelpers";
import { BigNumberish } from "ethers";


export async function skipTime(seconds: BigNumberish) {
    const secondsNumber = Number.parseInt(seconds.toString());
    await ethers.provider.send("evm_increaseTime", [secondsNumber]);
    await ethers.provider.send("evm_mine", []);
}

export async function skipTimeToDate(day: number, monthIndex: number) {
    const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
    const now = new Date(timestamp * 1000);
    const targetTime = new Date(Date.UTC(now.getFullYear(), monthIndex, day));
    while (targetTime < now) {
        targetTime.setFullYear(now.getFullYear() + 1);
    }
    const diffInSeconds = Math.round(targetTime.getTime() / 1000) - timestamp;
    await skipTime(diffInSeconds);
}

export async function currentTime() {
    return (await ethers.provider.getBlock("latest")).timestamp;
}

export const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export async function isLeapYear() {
    const timestamp = await currentTime();
    const now = new Date(timestamp * 1000);
    return now.getFullYear() % 4 === 0;
}

export async function nextMonth(contractManager: ContractManager, monthsAmount = 1) {
    const timeHelpers = await deployTimeHelpers(contractManager);
    const currentEpoch = await timeHelpers.getCurrentMonth();
    await skipTime((await timeHelpers.monthToTimestamp(currentEpoch.add(monthsAmount))).toNumber() - await currentTime())
}
