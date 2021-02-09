import Web3 from "web3";
import { providers } from "ethers";


export async function skipTime(ethers: {provider: providers.JsonRpcProvider}, seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
}

export async function skipTimeToDate(ethers: {provider: providers.JsonRpcProvider}, day: number, monthIndex: number) {
    const timestamp = (await ethers.provider.getBlock("latest")).timestamp;
    const now = new Date(timestamp * 1000);
    const targetTime = new Date(Date.UTC(now.getFullYear(), monthIndex, day));
    while (targetTime < now) {
        targetTime.setFullYear(now.getFullYear() + 1);
    }
    const diffInSeconds = Math.round(targetTime.getTime() / 1000) - timestamp;
    await skipTime(ethers, diffInSeconds);
}

export async function currentTime(web3: Web3) {
    return parseInt((await web3.eth.getBlock("latest")).timestamp.toString(16), 16);
}

export const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export async function isLeapYear(web3: Web3) {
    const timestamp = await currentTime(web3);
    const now = new Date(timestamp * 1000);
    return now.getFullYear() % 4 === 0;
}
