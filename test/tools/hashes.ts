import {ethers} from "hardhat";

export function stringKeccak256(value: string) {
    return ethers.utils.solidityKeccak256(["string"], [value]);
}