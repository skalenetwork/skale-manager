import {ethers} from "hardhat";
import {bn254} from "@noble/curves/bn254";
import {secp256k1} from "@noble/curves/secp256k1";
import {NodeRotation, SchainsInternal, SkaleDKG} from "../../typechain-types"
import {NodeData} from "./nodes";

const Fr = bn254.fields.Fr;

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

export const formatG2PointForContract = (point: typeof bn254.G2.Point.BASE) => {
    const {x, y} = point.toAffine();
    return {
        x: {a: x.c0, b: x.c1},
        y: {a: y.c0, b: y.c1}
    };
}

// Returns a generator of pseudo-random 32-byte values: keccak256(seed, counter)
const createDeterministicRandom = (seed: string) => {
    let counter = 0n;
    return () => ethers.getBytes(
        ethers.solidityPackedKeccak256(["string", "uint256"], [seed, counter++])
    );
}

const randomScalar = (random: () => Uint8Array) => {
    let scalar = 0n;
    while (scalar === 0n) {
        scalar = Fr.create(ethers.toBigInt(random()));
    }
    return scalar;
}

const evaluatePolynomial = (coefficients: bigint[], x: bigint) =>
    coefficients.reduceRight((result, coefficient) => Fr.add(Fr.mul(result, x), coefficient), 0n);

// Matches SkaleDkgResponse: share XOR sha256(x coordinate of ECDH(ephemeral key, node key))
const encryptShare = (share: bigint, ephemeralPrivateKey: Uint8Array, receiver: NodeData) => {
    const receiverPublicKey = ethers.getBytes(ethers.concat(["0x04", ...receiver.publicKey]));
    const sharedKey = secp256k1.getSharedSecret(ephemeralPrivateKey, receiverPublicKey).slice(1);
    return ethers.toBeHex(share ^ ethers.toBigInt(ethers.sha256(sharedKey)), 32);
}

export const generateKeys = async (
    schainHash: string,
    nodesData: NodeData[],
    skaleDKG: SkaleDKG,
    schainsInternal: SchainsInternal,
    nodeRotation: NodeRotation,
    seed: string = schainHash
): Promise<typeof bn254.G2.Point.BASE> => {
    const random = createDeterministicRandom(seed);
    const groupNodesIds = await schainsInternal.getNodesInGroup(schainHash);
    const participants = groupNodesIds.map(id => {
        const node = nodesData.find(data => data.id === id);
        if (!node) {
            throw new Error(`Node ${id} is not found in nodes data`);
        }
        return node;
    });

    const n = BigInt(participants.length);
    const t = Number((n * 2n + 1n) / 3n);
    const {rotationCounter} = await nodeRotation.getRotation(schainHash);
    const secretKeyShares = participants.map(() => 0n);
    let commonPublicKey = bn254.G2.Point.ZERO;

    for (const dealer of participants) {
        const coefficients = Array.from({length: t}, () => randomScalar(random));
        const verificationVector = coefficients.map(coefficient => bn254.G2.Point.BASE.multiply(coefficient));
        commonPublicKey = commonPublicKey.add(verificationVector[0]);

        const ephemeralPrivateKey = random();
        const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, false);
        const secretKeyContribution = participants.map((receiver, index) => {
            const share = evaluatePolynomial(coefficients, BigInt(index + 1));
            secretKeyShares[index] = Fr.add(secretKeyShares[index], share);
            return {
                publicKey: [
                    ethers.hexlify(ephemeralPublicKey.slice(1, 33)),
                    ethers.hexlify(ephemeralPublicKey.slice(33))
                ] as [string, string],
                share: encryptShare(share, ephemeralPrivateKey, receiver)
            };
        });

        await skaleDKG.connect(dealer.wallet).broadcast(
            schainHash,
            dealer.id,
            verificationVector.map(formatG2PointForContract),
            secretKeyContribution,
            rotationCounter
        );
    }

    for (const node of participants) {
        await skaleDKG.connect(node.wallet).alright(schainHash, node.id);
    }

    participants.forEach((node, index) => node.secretKeyShares.set(schainHash, secretKeyShares[index]));

    return commonPublicKey;
}
