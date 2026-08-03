// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SignalOracle
 * @dev Ritual Chain AI Trading Signal Oracle.
 * Calls Ritual LLM Precompile (0x0802) in short-running async mode (fulfilled replay).
 * Stores settled signal reports on-chain.
 */
contract SignalOracle {
    address public constant LLM_PRECOMPILE = 0x0000000000000000000000000000000000000802;

    struct SignalReport {
        string requestId;
        string symbol;
        string pair;
        string verdict;
        uint256 confidence;
        string reportJson;
        address evaluator;
        uint256 timestamp;
    }

    struct ConvoHistory {
        string provider;
        string path;
        string keyRef;
    }

    address public owner;
    address public defaultTeeExecutor;
    
    // requestId => SignalReport
    mapping(string => SignalReport) public signalsByRequestId;
    SignalReport public lastSignal;

    event SignalEvaluated(
        string indexed requestId,
        string symbol,
        string pair,
        string verdict,
        uint256 confidence,
        address indexed evaluator
    );

    event RawLLMExecution(
        string indexed requestId,
        bool hasError,
        string errorMessage
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    constructor(address _teeExecutor) {
        owner = msg.sender;
        defaultTeeExecutor = _teeExecutor != address(0) 
            ? _teeExecutor 
            : 0xB42e435c4252A5a2E7440e37B609F00c61a0c91B;
    }

    function setDefaultTeeExecutor(address _teeExecutor) external onlyOwner {
        defaultTeeExecutor = _teeExecutor;
    }

    /**
     * @dev Executes LLM Precompile 0x0802 with encoded calldata payload and records the raw output.
     */
    function evaluateSignal(
        bytes calldata llmPayload,
        string calldata requestId,
        string calldata symbol,
        string calldata pair
    ) external returns (bool hasError, bytes memory completionData, string memory errorMessage) {
        (bool success, bytes memory returnData) = LLM_PRECOMPILE.call(llmPayload);
        require(success, "Precompile call failed at EVM level");

        (
            hasError,
            completionData,
            , // modelMetadata
            errorMessage,
            // updatedConvoHistory
        ) = abi.decode(returnData, (bool, bytes, bytes, string, ConvoHistory));

        emit RawLLMExecution(requestId, hasError, errorMessage);

        if (!hasError) {
            SignalReport storage r = signalsByRequestId[requestId];
            r.requestId = requestId;
            r.symbol = symbol;
            r.pair = pair;
            r.evaluator = msg.sender;
            r.timestamp = block.timestamp;
            r.reportJson = string(completionData);
        }

        return (hasError, completionData, errorMessage);
    }

    /**
     * @dev Saves structured signal report JSON into on-chain contract state.
     */
    function recordSignal(
        string calldata requestId,
        string calldata symbol,
        string calldata pair,
        string calldata verdict,
        uint256 confidence,
        string calldata reportJson
    ) external {
        SignalReport storage r = signalsByRequestId[requestId];
        r.requestId = requestId;
        r.symbol = symbol;
        r.pair = pair;
        r.verdict = verdict;
        r.confidence = confidence;
        r.reportJson = reportJson;
        r.evaluator = msg.sender;
        r.timestamp = block.timestamp;

        lastSignal = r;

        emit SignalEvaluated(requestId, symbol, pair, verdict, confidence, msg.sender);
    }

    /**
     * @dev Retrieves settled signal report by requestId.
     */
    function getSignal(string calldata requestId) external view returns (
        SignalReport memory
    ) {
        return signalsByRequestId[requestId];
    }
}
