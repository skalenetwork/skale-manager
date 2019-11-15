pragma solidity ^0.5.3;

interface IValidatorsFunctionality {
    function addValidator(uint nodeIndex) external;
    function upgradeValidator(uint nodeIndex) external;
    function sendVerdict(
        uint fromValidatorIndex,
        uint toNodeIndex,
        uint32 downtime,
        uint32 latency) external;
    function calculateMetrics(uint nodeIndex) external returns (uint32, uint32);
    function deleteValidatorByRoot(uint nodeIndex) external;
}