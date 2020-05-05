pragma solidity 0.6.6;

import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Sender.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "../Permissions.sol";
import "../SkaleToken.sol";
import "../delegation/DelegationController.sol";


contract ReentrancyTester is Permissions, IERC777Recipient, IERC777Sender {

    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    bool private _reentrancyCheck = false;
    bool private _burningAttack = false;
    uint private _amount = 0;

    constructor (address _contractManager) public {
        Permissions.initialize(_contractManager);
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensSender"), address(this));
    }

    function tokensReceived(
        address /* operator */,
        address /* from */,
        address /* to */,
        uint256 amount,
        bytes calldata /* userData */,
        bytes calldata /* operatorData */
    )
        external override
    {
        if (_reentrancyCheck) {
            SkaleToken skaleToken = SkaleToken(contractManager.getContract("SkaleToken"));

            require(
                skaleToken.transfer(contractManager.getContract("SkaleToken"), amount),
                "Transfer is not successful");
        }
    }

    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override
    {
        if (_burningAttack) {
            DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));
            delegationController.delegate(
                1,
                _amount,
                3,
                "D2 is even");
        }
    }

    function prepareToReentracyCheck() external {
        _reentrancyCheck = true;
    }

    function prepareToBurningAttack() external {
        _burningAttack = true;
    }

    function burningAttack() external {
        SkaleToken skaleToken = SkaleToken(contractManager.getContract("SkaleToken"));

        _amount = skaleToken.balanceOf(address(this));

        skaleToken.burn(_amount, "");
    }
}