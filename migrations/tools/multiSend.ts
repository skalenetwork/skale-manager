import { BigNumber } from "ethers";

function padWithZeros(value: string, targetLength: number) {
    return ("0".repeat(targetLength) + value).slice(-targetLength);
}

export function encodeTransaction(operation: 0 | 1, to: string, value: BigNumber | number, data: string) {
    /// operation as a uint8 with 0 for a call or 1 for a delegatecall (=> 1 byte),
    /// to as a address (=> 20 bytes),
    /// value as a uint256 (=> 32 bytes),
    /// data length as a uint256 (=> 32 bytes),
    /// data as bytes.

    let _operation;
    if (operation === 0) {
        _operation = "00";
    } else if (operation === 1) {
        _operation = "01";
    } else {
        throw Error(`Operation has an incorrect value`);
    }

    let _to = to;
    if (to.startsWith("0x")) {
        _to = _to.slice(2);
    }
    _to = padWithZeros(_to, 20 * 2);

    const _value = padWithZeros(BigNumber.from(value).toHexString().slice(2), 32 * 2);

    let _data = data;
    if (data.startsWith("0x")) {
        _data = _data.slice(2);
    }
    if (_data.length % 2 !== 0) {
        _data = "0" + _data;
    }

    const _dataLength = padWithZeros((_data.length / 2).toString(16), 32 * 2);

    return "0x" + [
        _operation,
        _to,
        _value,
        _dataLength,
        _data,
    ].join("");
}