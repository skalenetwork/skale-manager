import { BigNumberish, BytesLike, Signer, Wallet } from "ethers";
import { ethers } from "hardhat";
import * as elliptic from "elliptic";

const EC = elliptic.ec;
const ec = new EC("secp256k1");

export async function getValidatorIdSignature(validatorId: BigNumberish, signer: Signer) {
    return await signer.signMessage(
        ethers.utils.arrayify(
            ethers.utils.solidityKeccak256(
                ["uint"],
                [validatorId]
            )
        )
    );
}

export function getPublicKey(wallet: Wallet): [BytesLike, BytesLike] {
    const publicKey = ec.keyFromPrivate(wallet.privateKey.slice(2)).getPublic();
    return [ethers.utils.hexlify(publicKey.x.toBuffer()), ethers.utils.hexlify(publicKey.y.toBuffer())]
}
