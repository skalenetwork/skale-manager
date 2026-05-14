import {NodeRotation, SchainsInternal} from "../../typechain-types"

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
