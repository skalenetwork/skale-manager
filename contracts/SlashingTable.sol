pragma solidity 0.6.6;

import "./Permissions.sol";

/**
 * @title Slashing Table
 * @dev This contract manages slashing conditions and penalties.
 */
contract SlashingTable is Permissions {
    mapping (uint => uint) private _penalties;

    /**
     * @dev Sets a penalty for a given offense
     * Only the owner can set penalties.
     *
     * @param offense string
     * @param penalty uint amount of slashing for the specified penalty
     */
    function setPenalty(string calldata offense, uint penalty) external onlyOwner {
        _penalties[uint(keccak256(abi.encodePacked(offense)))] = penalty;
    }

    /**
     * @dev Returns the penalty for a given offense
     *
     * @param offense string
     * @return uint amount of slashing for the specified penalty
     */
    function getPenalty(string calldata offense) external view returns (uint) {
        uint penalty = _penalties[uint(keccak256(abi.encodePacked(offense)))];
        return penalty;
    }

    function initialize(address contractManager) public override initializer {
        Permissions.initialize(contractManager);
    }
}
