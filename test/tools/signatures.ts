import {BigNumberish, BytesLike, Signer, Wallet} from "ethers";
import {ethers} from "hardhat";
import {ec} from "elliptic";

const secp256k1EC = new ec("secp256k1");

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
    const publicKey = secp256k1EC.keyFromPrivate(wallet.privateKey.slice(2)).getPublic();
    const pubA = ethers.utils.hexZeroPad(ethers.utils.hexlify(publicKey.getX().toBuffer()), 32);
    const pubB = ethers.utils.hexZeroPad(ethers.utils.hexlify(publicKey.getY().toBuffer()), 32);
    return [pubA, pubB];
}
