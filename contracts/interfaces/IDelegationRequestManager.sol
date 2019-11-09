pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

interface IDelegationRequestManager {
    enum DelegationStatus {Accepted, Rejected, Undefined, Proceed, Expired}
    struct DelegationRequest {
        address tokenAddress;
        address validatorAddress;
        uint delegationMonths;
        uint unlockedUntill;
        DelegationStatus status;
    }

    function delegationRequests(uint requestId) external view returns (DelegationRequest memory);
    function getDelegationRequestStatus(uint requestId) external view returns (DelegationStatus);
    function getDelegationRequestTokenAddress(uint requestId) external view returns (address);
    function setDelegationRequestStatus(uint requestId, DelegationStatus) external;

}
