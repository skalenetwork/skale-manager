pragma solidity 0.6.6;

interface ISkaleDKG {
    function openChannel(bytes32 groupIndex) external;
    function reopenChannel(bytes32 groupIndex) external;
    function deleteChannel(bytes32 groupIndex) external;
    function isChannelOpened(bytes32 groupIndex) external view returns (bool);
}
