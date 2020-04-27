/*
    PartialDifferencesTester.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Dmytro Stebaiev

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

pragma solidity 0.5.16;

import "../delegation/PartialDifferences.sol";


contract PartialDifferencesTester {
    using PartialDifferences for PartialDifferences.Sequence;
    using PartialDifferences for PartialDifferences.Value;

    PartialDifferences.Sequence[] sequences;
    PartialDifferences.Value[] values;

    function createSequence() external returns (uint id) {
        id = sequences.length;
        ++sequences.length;
    }

    function latestSequence() external view returns (uint id) {
        require(sequences.length > 0, "There are no sequences");
        return sequences.length - 1;
    }

    function addToSequence(uint sequence, uint diff, uint month) external {
        require(sequence < sequences.length, "Sequence does not exist");
        sequences[sequence].addToSequence(diff, month);
    }

    function subtractFromSequence(uint sequence, uint diff, uint month) external {
        require(sequence < sequences.length, "Sequence does not exist");
        sequences[sequence].subtractFromSequence(diff, month);
    }

    function getAndUpdateSequenceItem(uint sequence, uint month) external returns (uint) {
        require(sequence < sequences.length, "Sequence does not exist");
        return sequences[sequence].getAndUpdateValueInSequence(month);
    }

    function reduceSequence(
        uint sequence,
        uint a,
        uint b,
        uint month) external
    {
        require(sequence < sequences.length, "Sequence does not exist");
        FractionUtils.Fraction memory reducingCoefficient = FractionUtils.createFraction(a, b);
        return sequences[sequence].reduceSequence(reducingCoefficient, month);
    }
}