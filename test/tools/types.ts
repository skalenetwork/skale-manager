enum State {
    PROPOSED,
    ACCEPTED,
    CANCELED,
    REJECTED,
    DELEGATED,
    UNDELEGATION_REQUESTED,
    COMPLETED,
}

enum SchainType {
    SMALL = 1,
    MEDIUM,
    LARGE,
    TEST,
    MEDIUM_TEST
}

export { State, SchainType };
