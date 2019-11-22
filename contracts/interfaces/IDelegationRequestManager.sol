pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

interface IDelegationRequestManager {
    struct DelegationRequest {
        address tokenAddress;
        uint validatorId;
        uint delegationMonths;
        uint unlockedUntill;
        string description;
    }

    function delegationRequests(uint requestId) external view returns (DelegationRequest memory);
    function createRequest(
        uint validatorId,
        uint delegationPeriod,
        string calldata info
    ) external returns(uint requestId);
    function acceptRequest(uint _requestId) external;
    function cancelRequest(uint _requestId) external;
}
