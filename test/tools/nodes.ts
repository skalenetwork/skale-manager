import {ethers} from "hardhat";
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
    domainName: string
}

export const registerNodes = async (amount: BigNumberish, validator: Signer, nodes: Nodes, validatorService: ValidatorService) => {
    const nodesData: NodeData[] = [];
    const registeredNodesNumber = await nodes.getNumberOfNodes();
    for (let i = registeredNodesNumber; i < registeredNodesNumber + ethers.toBigInt(amount); ++i) {
        const wallet = HDNodeWallet.createRandom();
        nodesData.push({
            id: i,
            wallet: wallet,
            port: i + 1n,
            nonce: 0n,
            ip: ethers.toBeHex(i + 1n, 4),
            publicIp: ethers.toBeHex(i + 1n, 4),
            publicKey: getPublicKey(wallet),
            name: `node#${i}`,
            domainName: `node#${i}.d2.org`
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
