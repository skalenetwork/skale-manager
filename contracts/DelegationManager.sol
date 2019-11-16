/*
    SkaleToken.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Vadim Yavorsky
    SKALE Manager is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    SKALE Manager is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    You should have received a copy of the GNU Affero General Public License
    along with SKALE Manager.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./Permissions.sol";
import "./interfaces/IDelegationRequestManager.sol";


contract DelegationManager is Permissions {

    mapping (address => address) public delegations;
    mapping (address => uint) public effectiveDelegationsTotal;
    mapping (address => uint) public delegationsTotal;

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function delegate(uint _requestId) public {
        IDelegationRequestManager delegationRequestManager = IDelegationRequestManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationRequestManager")))
        );
        IDelegationRequestManager.DelegationRequest memory delegationRequest = delegationRequestManager.delegationRequests(_requestId);
        IDelegationRequestManager.DelegationStatus status = delegationRequest.status;
        require(address(0) != delegationRequest.tokenAddress, "Request with such id doesn't exist"); // ???
        require(msg.sender == delegationRequest.tokenAddress, "Message sender hasn't permissions to invoke delegation");
        require(status != IDelegationRequestManager.DelegationStatus.Rejected, "Validator rejected request for delegation");
        require(status != IDelegationRequestManager.DelegationStatus.Undefined, "Validator didn't accepted request for delegation");
        require(delegations[delegationRequest.tokenAddress] == address(0), "");
        //Check that validatorAddress is a registered validator
        //check that request is unlocked (1 week)
        //Call Token.lock(lockTime)
        delegations[delegationRequest.tokenAddress] = delegationRequest.validatorAddress;
        // delegationTotal[validatorAddress] =+ token.value * DelegationPeriodManager.getStakeMultipler(monthCount);
        delegationRequestManager.setDelegationRequestStatus(_requestId, IDelegationRequestManager.DelegationStatus.Proceed);

    }

    function unDelegate(address tokenAddress) public {
        require(delegations[tokenAddress] != address(0), "Token with such address wasn't delegated");
        // Call Token.unlock(lockTime)
    }
}