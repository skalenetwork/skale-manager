pragma solidity 0.6.6;

import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";

import "../SkaleToken.sol";
import "../Permissions.sol";
import "../SkaleToken.sol";


contract SkaleManagerMock is Permissions, IERC777Recipient {

    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    constructor (address contractManager) public {
        Permissions.initialize(contractManager);
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
    }

    function payBounty(uint validatorId, uint amount) external {
        SkaleToken skaleToken = SkaleToken(_contractManager.getContract("SkaleToken"));
        // solhint-disable-next-line check-send-result
        skaleToken.send(_contractManager.getContract("Distributor"), amount, abi.encode(validatorId));
    }

    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    )
        external override allow("SkaleToken")
        // solhint-disable-next-line no-empty-blocks
    {
        
    }
}