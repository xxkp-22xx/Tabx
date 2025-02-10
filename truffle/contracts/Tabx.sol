// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TabxExpenseSharing {

    struct User {
        uint256 userName;
        address contributor;
    }

    mapping(uint256 => User) public Users;

    struct group {
        string groupname;
        uint256 totalGroupSpending;
        uint256 personalSpend;
    }

    string public message;

    constructor() {
        message = "Development Stage! CI/CD Pipeline in Progress!";
    }

    function setMessage(string memory newMessage) public {
        message = newMessage;
    }
}
