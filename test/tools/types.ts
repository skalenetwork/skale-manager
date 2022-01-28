export enum State {
    PROPOSED,
    ACCEPTED,
    CANCELED,
    REJECTED,
    DELEGATED,
    UNDELEGATION_REQUESTED,
    COMPLETED,
}

export enum SchainType {
    SMALL = 1,
    MEDIUM,
    LARGE,
    TEST,
    MEDIUM_TEST
}

export const schainParametersType = "tuple(uint lifetime, uint8 typeOfSchain, uint16 nonce, string name, address originator, tuple(string name, bytes value)[] options)"
