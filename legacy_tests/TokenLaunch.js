const init = require("./Init.js");
const Tx = require("ethereumjs-tx").Transaction;
const Web3 = require('web3');
const transfers = require("./transfers.json");



async function sendTransaction(web3Inst, account, privateKey, data, receiverContract) {
    // console.log("Transaction generating started!");
    const nonce = await web3Inst.eth.getTransactionCount(account);
    const rawTx = {
        from: web3Inst.utils.toChecksumAddress(account),
        nonce: "0x" + nonce.toString(16),
        data: data,
        to: receiverContract,
        gasPrice: 10000000000,
        gas: 8000000,
    };
    let tx;
    if (init.network === "unique") {
        console.log('RINKEBY')
        tx = new Tx(rawTx, {chain: "rinkeby"});
    } else {
        tx = new Tx(rawTx);
    }
    tx.sign(privateKey);
    const serializedTx = tx.serialize();
    console.log("Transaction sent!")
    const txReceipt = await web3Inst.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')); //.on('receipt', receipt => {
    console.log("Transaction done!");
    console.log("Gas used: ", txReceipt.gasUsed);
    console.log('------------------------------');
    return true;
}

async function approveBatchOfTransfers() {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.TokenLaunchManager.methods.approveBatchOfTransfers(transfers.walletAddress, transfers.value).encodeABI();
    contractAddress = init.jsonData['token_launch_manager_address'];
    console.log("------------------------------");
    console.log("approveBatchOfTransfers");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
    process.exit();
}

async function mint() {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.SkaleToken.methods.mint(init.jsonData['token_launch_manager_address'], 1e9, "0x", "0x").encodeABI();
    console.log("------------------------------");
    console.log("mint");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, init.jsonData['skale_token_address']);
    process.exit();
}


async function getApproved(walletAddress) {
    let res = await init.TokenLaunchManager.methods.approved(walletAddress).call();
    console.log(res);
    process.exit();
}

async function grantSeller(address) {
    console.log(init.mainAccount)
    const seller_role = await init.TokenLaunchManager.methods.SELLER_ROLE().call();
    console.log(seller_role);
    console.log("Is this address has seller role: ",await init.TokenLaunchManager.methods.hasRole(seller_role, address).call());
    const grantRoleABI = init.TokenLaunchManager.methods.grantRole(seller_role, address).encodeABI(); //.send({from: init.mainAccoun$
    contractAddress = init.jsonData['token_launch_manager_address'];
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, grantRoleABI, contractAddress);
    console.log("Is this address has seller role after transaction: ", await init.TokenLaunchManager.methods.hasRole(seller_role, address).call());
    console.log();
    console.log("Transaction was successful:", success);
    console.log("Exiting...");
    process.exit();
}

async function getApprovedEvents(blockNumber) {
    const events = await init.TokenLaunchManager.getPastEvents("Approved", { fromBlock: blockNumber, toBlock: "latest"});
    console.log(events.length);
    return events;
}

async function getTokensRetrievedEvents(blockNumber) {
    const events = await init.TokenLaunchManager.getPastEvents("TokensRetrieved", { fromBlock: blockNumber, toBlock: "latest"});
    console.log(events.length);
    return events;
}

async function getLockedEvents(blockNumber) {
    const events = await init.TokenLaunchLocker.getPastEvents("Locked", { fromBlock: blockNumber, toBlock: "latest"});
    console.log(events.length);
    return events;
}

async function getUnlockedEvents(blockNumber) {
    const events = await init.TokenLaunchLocker.getPastEvents("Unlocked", { fromBlock: blockNumber, toBlock: "latest"});
    console.log(events.length);
    return events;
}

async function getUnretrievedAddresses(blockNumber) {
    const eventsApproved = await getApprovedEvents(blockNumber);
    const approved = new Map();
    for (let i = 0; i < eventsApproved.length; i++) {
        if (approved.has(eventsApproved[i].returnValues[0])) {
            approved.set(
                eventsApproved[i].returnValues[0],
                init.web3.utils.toBN(
                    approved.get(eventsApproved[i].returnValues[0])
                ).add(
                    init.web3.utils.toBN(
                        eventsApproved[i].returnValues[1]
                    )
                ).toString()
            );
        } else {
            approved.set(eventsApproved[i].returnValues[0], eventsApproved[i].returnValues[1]);
        }
    }
    console.log("Size of Map", approved.size);
    const eventsRetrieved = await getTokensRetrievedEvents(blockNumber);
    for (let i = 0; i < eventsRetrieved.length; i++) {
        if (approved.has(eventsRetrieved[i].returnValues[0])) {
            if (init.web3.utils.toBN(approved.get(eventsRetrieved[i].returnValues[0])).gt(init.web3.utils.toBN(eventsRetrieved[i].returnValues[1]))) {
                approved.set(
                    eventsRetrieved[i].returnValues[0],
                    init.web3.utils.toBN(
                        approved.get(eventsRetrieved[i].returnValues[0])
                    ).sub(
                        init.web3.utils.toBN(
                            eventsRetrieved[i].returnValues[1]
                        )
                    ).toString()
                );
            } else if (init.web3.utils.toBN(approved.get(eventsRetrieved[i].returnValues[0])).eq(init.web3.utils.toBN(eventsRetrieved[i].returnValues[1]))) {
                approved.delete(eventsRetrieved[i].returnValues[0]);
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    }
    console.log("New size of Map", approved.size);
    console.log("Map of unretrieved addresses: ", approved.keys());
    // console.log(approved);
    let sum = "0";
    for (let value of approved.values()) {
        sum = init.web3.utils.toBN(sum).add(init.web3.utils.toBN(value)).toString();
    }
    console.log("Amount of SKL in TokenLaunchManager:", sum);
}

async function getStillLockedAddresses(blockNumber) {
    const eventsLocked = await getLockedEvents(blockNumber);
    const approved = new Map();
    for (let i = 0; i < eventsLocked.length; i++) {
        if (approved.has(eventsLocked[i].returnValues[0])) {
            approved.set(
                eventsLocked[i].returnValues[0],
                init.web3.utils.toBN(
                    approved.get(eventsLocked[i].returnValues[0])
                ).add(
                    init.web3.utils.toBN(
                        eventsLocked[i].returnValues[1]
                    )
                ).toString()
            );
        } else {
            approved.set(eventsLocked[i].returnValues[0], eventsLocked[i].returnValues[1]);
        }
    }
    console.log("Size of Map", approved.size);
    const eventsUnlocked = await getUnlockedEvents(blockNumber);
    for (let i = 0; i < eventsUnlocked.length; i++) {
        if (approved.has(eventsUnlocked[i].returnValues[0])) {
            if (init.web3.utils.toBN(approved.get(eventsUnlocked[i].returnValues[0])).gt(init.web3.utils.toBN(eventsUnlocked[i].returnValues[1]))) {
                approved.set(
                    eventsUnlocked[i].returnValues[0],
                    init.web3.utils.toBN(
                        approved.get(eventsUnlocked[i].returnValues[0])
                    ).sub(
                        init.web3.utils.toBN(
                            eventsUnlocked[i].returnValues[1]
                        )
                    ).toString()
                );
            } else if (init.web3.utils.toBN(approved.get(eventsUnlocked[i].returnValues[0])).eq(init.web3.utils.toBN(eventsUnlocked[i].returnValues[1]))) {
                approved.delete(eventsUnlocked[i].returnValues[0]);
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    }
    console.log("New size of Map", approved.size);
    const delegatedWPOU = new Map();
    const delegatedWOPOU = new Map();
    const delegatedWOPOUNS = new Map();
    const notDelegatedAtAll = new Map();
    for (let value of approved.keys()) {
        console.log();
        console.log("Address:", value);
        console.log("Locked:", approved.get(value));
        const len = await init.DelegationController.methods.getDelegationsByHolderLength(value).call();
        console.log("Amount of delegations", len);
        let sum = "0";
        let mintime = 1000000;
        for (let i = 0; i < len; i++) {
            const del = await init.DelegationController.methods.delegationsByHolder(value, i).call();
            const delData = await init.DelegationController.methods.getDelegation(del).call();
            const amount = delData[2];
            const timeStarted = delData[5];
            const timeCreated = delData[4];
            console.log("Delegation: ", del, " with amount ", amount, " created at ", new Date(timeCreated * 1000), " and started at ", timeStarted);
            if (Number(timeStarted) > 0) {
                sum = init.web3.utils.toBN(sum).add(init.web3.utils.toBN(amount)).toString();
                const sumx2 = init.web3.utils.toBN(sum).mul(init.web3.utils.toBN("2")).toString();
                if (init.web3.utils.toBN(sumx2).gte(init.web3.utils.toBN(approved.get(value)))) {
                    if (mintime > timeStarted) {
                        mintime = timeStarted;
                    }
                }
            }
        }
        console.log("Sum of all delegations:", sum);
        if (init.web3.utils.toBN(sum).gt(init.web3.utils.toBN("0"))) {
            if (mintime < 1000000) {
                console.log("Proof of use is started at", mintime, "month");
                if (mintime <= 10) {
                    delegatedWPOU.set(value, approved.get(value));
                    console.log("Address potentially unlocked");
                } else {
                    delegatedWOPOU.set(value, approved.get(value));
                    console.log("Address still locked but will be unlock soon");
                }
            } else {
                delegatedWOPOUNS.set(value, approved.get(value));
                console.log("Unlocking mechanism did not started");
            }
        } else {
            notDelegatedAtAll.set(value, approved.get(value));
            console.log("Did not delegated at all");
        }
        console.log();
    }
    console.log("Not delegated at all:", notDelegatedAtAll.size);
    console.log("Delegated with POU not started:", delegatedWOPOUNS.size);
    console.log("Delegated with POU not Finished:", delegatedWOPOU.size);
    console.log("Delegated with POU Finished:", delegatedWPOU.size);
    console.log("All unlocked addresses:", approved.size);
    process.exit();
}

if (process.argv[2] == 'approveBatchOfTransfers') {
    approveBatchOfTransfers();
} else if (process.argv[2] == 'getApproved') {
    getApproved(process.argv[3]);
} else if (process.argv[2] == 'mint') {
    mint();
} else if (process.argv[2] == 'grantSeller') {
    grantSeller(process.argv[3]);
} else if (process.argv[2] == 'getApprovedEvents') {
    getApprovedEvents(process.argv[3]);
} else if (process.argv[2] == 'getTokensRetrievedEvents') {
    getTokensRetrievedEvents(process.argv[3]);
} else if (process.argv[2] == 'getUnretrievedAddresses') {
    getUnretrievedAddresses(process.argv[3]);
} else if (process.argv[2] == 'getLockedEvents') {
    getLockedEvents(process.argv[3]);
} else if (process.argv[2] == 'getUnlockedEvents') {
    getUnlockedEvents(process.argv[3]);
} else if (process.argv[2] == 'getStillLockedAddresses') {
    getStillLockedAddresses(process.argv[3]);
} else {
    console.log("Recheck name");
    process.exit();
}