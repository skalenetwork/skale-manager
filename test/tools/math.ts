export function bigintAbs(value: bigint) {
    if (value >= 0) {
        return value;
    }
    return -value;
}
