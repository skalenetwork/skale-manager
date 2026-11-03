import {BigNumberish, BytesLike, Signer, BaseWallet} from "ethers";
import {ethers} from "hardhat";
import {secp256k1} from "@noble/curves/secp256k1";

export async function getValidatorIdSignature(validatorId: BigNumberish, signer: Signer) {
    return await signer.signMessage(
        ethers.getBytes(
            ethers.solidityPackedKeccak256(
                ["uint"],
                [validatorId]
            )
        )
    );
}

export function getPublicKey(wallet: BaseWallet): [BytesLike, BytesLike] {
    const publicKey = secp256k1.getPublicKey(ethers.getBytes(wallet.privateKey), false);
    return [ethers.hexlify(publicKey.slice(1, 33)), ethers.hexlify(publicKey.slice(33))];
}
