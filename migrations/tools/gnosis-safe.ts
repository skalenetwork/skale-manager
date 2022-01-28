import axios from "axios";
import { TypedDataUtils } from "ethers-eip712";
import * as ethUtil from 'ethereumjs-util';
import chalk from "chalk";
import type { ethers } from "ethers";
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";

type Ethers = typeof ethers & HardhatEthersHelpers;

enum Network {
    MAINNET = 1,
    RINKEBY = 4,
    GANACHE = 1337,
    HARDHAT = 31337,
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const ADDRESSES = {
    multiSend: {
        [Network.MAINNET]: "0x8D29bE29923b68abfDD21e541b9374737B49cdAD",
        [Network.RINKEBY]: "0x8D29bE29923b68abfDD21e541b9374737B49cdAD",
    },
}

const URLS = {
    safe_transaction: {
        [Network.MAINNET]: "https://safe-transaction.mainnet.gnosis.io",
        [Network.RINKEBY]: "https://safe-transaction.rinkeby.gnosis.io",
    },
    safe_relay: {
        [Network.MAINNET]: "https://safe-relay.mainnet.gnosis.io",
        [Network.RINKEBY]: "https://safe-relay.rinkeby.gnosis.io",
    }
}

interface SafeInfoResponse{
    address: string,
    nonce: number,
    threshold: number,
    owners:	string[],
    masterCopy:	string,
    modules: string[],
    fallbackHandler: string,
    guard: string,
    version: string
}

interface SafeMultisigEstimateTx{
    safe: string,
    to:	string,
    value: number,
    data?: string
    operation: number
    gasToken?: string
}

interface SafeMultisigEstimateTxResponseV2 {
    safeTxGas: string,
    baseGas: string,
    dataGas: string,
    operationalGas: string,
    gasPrice: string,
    lastUsedNonce: number,
    gasToken: string,
    refundReceiver: string
}

interface SafeMultisigTransaction {
    safe: string,
    to: string,
    value: number,
    data?: string,
    operation: number,
    gasToken?: string,
    safeTxGas: number,
    baseGas: number,
    gasPrice: number,
    refundReceiver?: string,
    nonce: number,
    contractTransactionHash: string,
    sender:	string,
    signature?:	string,
    origin?: string
}

function getMultiSendAddress(chainId: number) {
    if (chainId === Network.MAINNET) {
        return ADDRESSES.multiSend[chainId];
    } else if (chainId === Network.RINKEBY) {
        return ADDRESSES.multiSend[chainId];
    } else if ([Network.GANACHE, Network.HARDHAT].includes(chainId)) {
        return ZERO_ADDRESS;
    } else {
        throw Error(`Can't get multiSend contract at network with chainId = ${chainId}`);
    }
}

export function getSafeTransactionUrl(chainId: number) {
    if (chainId === Network.MAINNET) {
        return URLS.safe_transaction[chainId];
    } else if (chainId === 4) {
        return URLS.safe_transaction[chainId];
    } else {
        throw Error(`Can't get safe-transaction url at network with chainId = ${chainId}`);
    }
}

export function getSafeRelayUrl(chainId: number) {
    if (chainId === 1) {
        return URLS.safe_relay[chainId];
    } else if (chainId === 4) {
        return URLS.safe_relay[chainId];
    } else {
        throw Error(`Can't get safe-relay url at network with chainId = ${chainId}`);
    }
}

function concatTransactions(transactions: string[]) {
    return "0x" + transactions.map( (transaction) => {
        if (transaction.startsWith("0x")) {
            return transaction.slice(2);
        } else {
            return transaction;
        }
    }).join("");
}

export async function createMultiSendTransaction(ethers: Ethers, safeAddress: string, privateKey: string, transactions: string[]) {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const multiSendAddress = getMultiSendAddress(chainId);
    const multiSendAbi = [{"constant":false,"inputs":[{"internalType":"bytes","name":"transactions","type":"bytes"}],"name":"multiSend","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}];
    const multiSend = new ethers.Contract(multiSendAddress, new ethers.utils.Interface(multiSendAbi), ethers.provider);

    let nonce = 0;
    try {
        const nonceResponse = await axios.get<SafeInfoResponse>(`${getSafeTransactionUrl(chainId)}/api/v1/safes/${safeAddress}/`);
        nonce = nonceResponse.data.nonce;
    } catch (e) {
        if (!(e instanceof Error) || !e.toString().startsWith("Error: Can't get safe-transaction url")) {
            throw e;
        }
    }

    const tx = {
        "safe": safeAddress,
        "to": multiSend.address,
        "value": 0, // Value in wei
        "data": multiSend.interface.encodeFunctionData("multiSend", [ concatTransactions(transactions) ]),
        "operation": 1,  // 0 CALL, 1 DELEGATE_CALL
        "gasToken": ZERO_ADDRESS, // Token address (hold by the Safe) to be used as a refund to the sender, if `null` is Ether
        "safeTxGas": 0,  // Max gas to use in the transaction
        "baseGas": 0,  // Gas costs not related to the transaction execution (signature check, refund payment...)
        "gasPrice": 0,  // Gas price used for the refund calculation
        "refundReceiver": ZERO_ADDRESS, // Address of receiver of gas payment (or `null` if tx.origin)
        "nonce": nonce,  // Nonce of the Safe, transaction cannot be executed until Safe's nonce is not equal to this nonce
    }

    const typedData = {
        types: {
            EIP712Domain: [
                {name: "verifyingContract", type: "address"},
            ],
            SafeTx: [
                { type: "address", name: "to" },
                { type: "uint256", name: "value" },
                { type: "bytes", name: "data" },
                { type: "uint8", name: "operation" },
                { type: "uint256", name: "safeTxGas" },
                { type: "uint256", name: "baseGas" },
                { type: "uint256", name: "gasPrice" },
                { type: "address", name: "gasToken" },
                { type: "address", name: "refundReceiver" },
                { type: "uint256", name: "nonce" },
            ]
        },
        primaryType: 'SafeTx' as const,
        domain: {
          verifyingContract: safeAddress
        },
        message: {
          ...tx,
          data: ethers.utils.arrayify(tx.data)
        }
    }

    const digest = TypedDataUtils.encodeDigest(typedData)
    const digestHex = ethers.utils.hexlify(digest)

    const privateKeyBuffer = ethUtil.toBuffer(privateKey);
    const { r, s, v } = ethUtil.ecsign(ethUtil.toBuffer(digestHex), privateKeyBuffer);
    const signature = ethUtil.toRpcSig(v, r, s).toString();

    const txToSend: SafeMultisigTransaction = {
        ...tx,
        "contractTransactionHash": digestHex,  // Contract transaction hash calculated from all the field
        // Owner of the Safe proposing the transaction. Must match one of the signatures
        "sender": ethers.utils.getAddress(ethUtil.bufferToHex(ethUtil.privateToAddress(privateKeyBuffer))),
        "signature": signature,  // One or more ethereum ECDSA signatures of the `contractTransactionHash` as an hex string
        "origin": "Upgrade skale-manager"  // Give more information about the transaction, e.g. "My Custom Safe app"
    }

    return txToSend;
}

export async function sendSafeTransaction(safe: string, chainId: number, safeTx: SafeMultisigTransaction) {
    try {
        console.log("Estimate gas");
        const estimateRequest: SafeMultisigEstimateTx = safeTx;

        try {
            const estimateResponse = await axios.post<SafeMultisigEstimateTxResponseV2>(
                `${getSafeRelayUrl(chainId)}/api/v2/safes/${safe}/transactions/estimate/`,
                estimateRequest
            );
            console.log(chalk.cyan(`Recommend to set gas limit to ${
                parseInt(estimateResponse.data.safeTxGas, 10) + parseInt(estimateResponse.data.baseGas, 10)}`));
        } catch (e) {
            console.log(chalk.red("Failed to estimate gas"));
            console.log(e);
        }

        console.log(chalk.green("Send transaction to gnosis safe"));
        await axios.post(`${getSafeTransactionUrl(chainId)}/api/v1/safes/${safe}/multisig-transactions/`, safeTx)
    } catch (e) {
        if (axios.isAxiosError(e)) {
            if (e.response) {
                console.log(JSON.stringify(e.response.data, null, 4))
                console.log(chalk.red(`Request failed with ${e.response.status} code`));
            } else {
                console.log(chalk.red("Request failed with unknown reason"));
            }
        }
        throw e;
    }
}