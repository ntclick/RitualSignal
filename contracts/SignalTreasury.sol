// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SignalTreasury
 * @dev Ritual Chain Native Micropayment Treasury Contract.
 * Manages native RITUAL fee collection for RitualSignal trading oracle queries.
 */
contract SignalTreasury {
    address public owner;
    uint256 public totalCollected;
    uint256 public constant MIN_FEE = 0.05 ether; // 0.05 RITUAL default fee

    mapping(string => bool) public paidQueries;

    event PaymentReceived(address indexed payer, string user, string pair, uint256 amount);
    event Withdraw(address indexed owner, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized: caller is not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Pay for 1 signal query using native RITUAL.
     */
    function payForSignal(string calldata user, string calldata pair) external payable {
        require(msg.value >= MIN_FEE, "Insufficient payment: minimum 0.05 RITUAL");
        
        string memory queryKey = string(abi.encodePacked(user, ":", pair));
        paidQueries[queryKey] = true;
        totalCollected += msg.value;

        emit PaymentReceived(msg.sender, user, pair, msg.value);
    }

    /**
     * @dev Checks if query is paid on-chain.
     */
    function isQueryPaid(string calldata user, string calldata pair) external view returns (bool) {
        string memory queryKey = string(abi.encodePacked(user, ":", pair));
        return paidQueries[queryKey];
    }

    /**
     * @dev Allows owner to withdraw native RITUAL funds.
     */
    function withdraw(address payable recipient) external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        address target = recipient == address(0) ? owner : recipient;
        (bool success, ) = target.call{value: balance}("");
        require(success, "Transfer failed");
        emit Withdraw(target, balance);
    }

    receive() external payable {
        totalCollected += msg.value;
    }
}
