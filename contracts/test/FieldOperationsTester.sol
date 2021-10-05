// SPDX-License-Identifier: AGPL-3.0-only

/*
    FieldOperationsTester.sol - SKALE Manager
    Copyright (C) 2021-Present SKALE Labs
    @author Artem Payvin

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

pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import "../utils/FieldOperations.sol";


contract FieldOperationsTester {

    using Fp2Operations for Fp2Operations.Fp2Point;
    using G2Operations for G2Operations.G2Point;

    function add(G2Operations.G2Point memory value1, G2Operations.G2Point memory value2)
        external
        view
        returns (G2Operations.G2Point memory)
    {
        require(value1.isG2(), "First value not in G2");
        require(value2.isG2(), "Second value not in G2");
        return value1.addG2(value2);
    }
}
