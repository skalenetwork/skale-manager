pragma solidity ^0.5.0;


/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
function coverage_0x3c783d81(bytes32 c__0x3c783d81) public pure {}


    address public owner;

    /**
     * @dev The Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    constructor() public {coverage_0x3c783d81(0x3c32ce56363de1ffea549ee4a131e25a057076057a2d820f8c90e157fc41f062); /* function */ 

coverage_0x3c783d81(0x0d31bf681da14ad2a76a85571b7629c8cf2180a4cac546bc552f5bac1022beff); /* line */ 
        coverage_0x3c783d81(0x1c74df2f99262a3039d82db8db258f9997fe24448cb33364353136a6f1d68d85); /* statement */ 
owner = msg.sender;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {coverage_0x3c783d81(0xde7af1221ef3361d4f8684e6dd3371bb30403b54976fa3b2c38419f31280ee9f); /* function */ 

coverage_0x3c783d81(0x7f7a5ec199520e93f6f7860ae73722a2c5aac84b87f3e3b6831b17123171c175); /* line */ 
        coverage_0x3c783d81(0xdddf9b346a5e3c7a33f935f4becd3bd5429c22e6548416dbbc3ac856c09b59db); /* assertPre */ 
coverage_0x3c783d81(0x23c74944dceb774047ce9bc61b2cd3fd395330a24ffe7bdd93c4a93a75c188c0); /* statement */ 
require(msg.sender == owner, "Sender is not owner");coverage_0x3c783d81(0x71d31b9cdc34cb9397c1e8a99182873f768d6937d6e331368e5202d548d46502); /* assertPost */ 

coverage_0x3c783d81(0xeb6368959d844788dd7a317c17112f0338cda2b78fb7362b900a3da93e902b51); /* line */ 
        _;
    }


    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) external onlyOwner {coverage_0x3c783d81(0x1eeff29b087822001e179bf7c885acd1cef0e0bf6015a7f319a262e4b87641b9); /* function */ 

coverage_0x3c783d81(0x0219dc9c873b63ac626d07ed4527f8c5ba09d7d42f68b75867fa242ac3dc5ff3); /* line */ 
        coverage_0x3c783d81(0xe4ec043cd92b2ae2d5ecb6d3559634f1046122c417a312a43376c118a99350b9); /* assertPre */ 
coverage_0x3c783d81(0xabed5f7b57e762830a40b35956723a4c628611fc4a11ed03fba774f8ef9c8965); /* statement */ 
require(newOwner != address(0), "New owner is not set");coverage_0x3c783d81(0x8958415c164488e964cbc48f9b0a89d64f36880cdfca68e6fae2f649f45096df); /* assertPost */ 

coverage_0x3c783d81(0x67cdf2e15474b3ddb6d4d8eb39db770fcf0cfc8cee9d8786a60b575fbcac9a63); /* line */ 
        coverage_0x3c783d81(0x43e37308bb58c1414e626ea8dd87c1bf8e042115d19abc2e4618fe599d9ce1a0); /* statement */ 
owner = newOwner;
    }

}
