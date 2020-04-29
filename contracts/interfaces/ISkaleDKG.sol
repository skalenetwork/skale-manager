pragma solidity 0.5.16;

interface ISkaleDKG {
    function openChannel(bytes32 groupIndex) external;
    function deleteChannel(bytes32 groupIndex) external;
    function isChannelOpened(bytes32 groupIndex) external view returns (bool);
}
