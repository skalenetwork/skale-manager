import Web3 = require("web3");

let requistId = 0xd2;

function responseCallback(error: Error | null, val?: any) {
    if (error !== null) {
        console.log(error, val);
    }
}

export function skipTime(web3: Web3, seconds: number) {
    web3.currentProvider.send(
        {
            id: requistId++,
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [seconds],
        },
        responseCallback);

    web3.currentProvider.send(
        {
            id: requistId++,
            jsonrpc: "2.0",
            method: "evm_mine",
            params: [],
        },
        responseCallback);
}

export async function currentTime(web3: Web3) {
    return (await web3.eth.getBlock("latest")).timestamp;
}

export const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
