// import * as Web3 from 'web3'

import Web3 = require('web3');

let requist_id = 0xd2;

export function skipTime(web3: Web3, seconds: number) {
    web3.currentProvider.send(
        {
            id: requist_id++,
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [seconds],
        },
        (error: Error | null, val?: any) =>  { }
    );    

    web3.currentProvider.send(
        {
            id: requist_id++,
            jsonrpc: "2.0",
            method: "evm_mine",
            params: [],
        },
        (error: Error | null, val?: any) =>  { }
    );                
}
