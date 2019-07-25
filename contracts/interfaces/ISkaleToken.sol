pragma solidity ^0.5.0;

interface ISkaleToken {
    function transfer(address to, uint256 value) external returns (bool success);
    function mint(address to, uint value) external returns (bool success);
    function CAP() external view returns (uint);
}