import {ethers} from "hardhat";

export function stringKeccak256(value: string) {
    return ethers.solidityPackedKeccak256(["string"], [value]);
}
