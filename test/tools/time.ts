import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";


export async function skipTime(ethers: HardhatEthersHelpers, seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
}

export async function skipTimeToDate(ethers: HardhatEthersHelpers, day: number, monthIndex: number) {
    const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
    const now = new Date(timestamp * 1000);
    const targetTime = new Date(Date.UTC(now.getFullYear(), monthIndex, day));
    while (targetTime < now) {
        targetTime.setFullYear(now.getFullYear() + 1);
    }
    const diffInSeconds = Math.round(targetTime.getTime() / 1000) - timestamp;
    await skipTime(ethers, diffInSeconds);
}

export async function currentTime(ethers: HardhatEthersHelpers) {
    return (await ethers.provider.getBlock("latest")).timestamp;
}

export const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export async function isLeapYear(ethers: HardhatEthersHelpers) {
    const timestamp = await currentTime(ethers);
    const now = new Date(timestamp * 1000);
    return now.getFullYear() % 4 === 0;
}
