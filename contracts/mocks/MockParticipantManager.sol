// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockParticipantManager {
    mapping(address => bool) private participants;

    // Function to mock the setting of participant status
    function mockSetParticipant(address participant, bool status) external {
        participants[participant] = status;
    }

    // Function to add a participant
    function addParticipant(address participant) external {
        require(!participants[participant], "Already a participant");
        participants[participant] = true;
    }

    // Function to remove a participant
    function removeParticipant(address participant) external {
        require(participants[participant], "Not a participant");
        participants[participant] = false;
    }

    // Function that checks if an address is a participant
    function isParticipant(address participant) external view returns (bool) {
        return participants[participant];
    }

    // Optionally: Function to simulate participant checks for more advanced tests
    function simulateCheck(address participant, bool expected) external view {
        require(participants[participant] == expected, "Participant status mismatch");
    }
}
