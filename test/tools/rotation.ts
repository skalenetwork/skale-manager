import {NodeRotation, SchainsInternal} from "../../typechain-types"
import {NodeData} from "./nodes";

export const getBroadcastingNodes = async (schainHash: string, schainsInternal: SchainsInternal, nodeRotation: NodeRotation) => {
    const nodes = await schainsInternal.getNodesInGroup(schainHash);
    const broadcastingNodes = [];
    for (const node of nodes) {
        if (await nodeRotation.shouldSendBroadcast(schainHash, node)) {
            broadcastingNodes.push(node);
        }
    }
    return broadcastingNodes;
}

export const generateKeys = async (schainHash: string, nodesData: NodeData[]) => {
    console.log(schainHash);
    console.log(nodesData);
}
