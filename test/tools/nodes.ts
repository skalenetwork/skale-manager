import {ethers} from "hardhat";
import {setBalance} from "@nomicfoundation/hardhat-network-helpers";
import {BigNumberish, BytesLike, HDNodeWallet, Signer} from "ethers";
import {Nodes, ValidatorService} from "../../typechain-types";
import {getPublicKey, getValidatorIdSignature} from "./signatures";

export interface NodeData {
    id: bigint,
    wallet: HDNodeWallet;
    port: bigint,
    nonce: bigint,
    ip: BytesLike,
    publicIp: BytesLike,
    publicKey: [BytesLike, BytesLike],
    name: string,
    domainName: string,
    // schainHash => BLS secret key share
    secretKeyShares: Map<string, bigint>
}

export const getSecretKeyShare = (node: NodeData, schainHash: string) => {
    const share = node.secretKeyShares.get(schainHash);
    if (share === undefined) {
        throw new Error(`Node ${node.id} has no key share for schain ${schainHash}`);
    }
    return share;
}

export const registerNodes = async (amount: BigNumberish, validator: Signer, nodes: Nodes, validatorService: ValidatorService) => {
    const nodesData: NodeData[] = [];
    const registeredNodesNumber = await nodes.getNumberOfNodes();
    for (let i = registeredNodesNumber; i < registeredNodesNumber + ethers.toBigInt(amount); ++i) {
        const wallet = HDNodeWallet.fromSeed(ethers.toBeHex(i, 32)).connect(ethers.provider);
        await setBalance(wallet.address, ethers.parseEther("10"));
        nodesData.push({
            id: i,
            wallet: wallet,
            port: i + 1n,
            nonce: 0n,
            ip: ethers.toBeHex(i + 1n, 4),
            publicIp: ethers.toBeHex(i + 1n, 4),
            publicKey: getPublicKey(wallet),
            name: `node#${i}`,
            domainName: `node#${i}.d2.org`,
            secretKeyShares: new Map()
        });
    }

    const validatorId = await validatorService.getValidatorId(validator);
    for (const node of nodesData) {
            await validatorService.connect(validator).linkNodeAddress(
                node.wallet,
                await getValidatorIdSignature(validatorId, node.wallet)
            );
            await nodes.createNode(
                node.wallet,
                {
                    name: node.name,
                    ip: node.ip,
                    publicIp: node.publicIp,
                    port: node.port,
                    publicKey: node.publicKey,
                    nonce: node.nonce,
                    domainName: node.domainName
                }
            )
        }

    return nodesData;
}
