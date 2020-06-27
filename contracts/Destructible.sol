pragma solidity 0.6.10;


/**
 * @title Destructible
 * @dev Base contract that can be destroyed by owner. All funds in contract will be sent to the owner.
 * TODO: Remove before production
 */
contract Destructible {

    address public destructOwner;

    /**
     * @dev Transfers the current balance to the owner and terminates the contract.
     TODO: Remove before production
     */
    function destroyAndSend(address payable recipient) external {
        require(msg.sender == destructOwner, "No way!");
        selfdestruct(recipient);
    }

    function setOwner(address ownerAddress) external {
      require(msg.sender == destructOwner, "Only owner can set owner");
      _setOwner(ownerAddress);
    }

    function _setOwner(address ownerAddress) internal {
      require(ownerAddress != address(0), "Owner is not set");
      destructOwner = ownerAddress;
    }
}
