pragma solidity 0.6.6;

import "../SkaleToken.sol";


contract SkaleTokenInternalTester is SkaleToken {

    constructor(address contractManager, address[] memory defOps) public
    SkaleToken(contractManager, defOps)
    // solhint-disable-next-line no-empty-blocks
    { }

    function getMsgData() external view returns (bytes memory) {
        return _msgData();
    }
}