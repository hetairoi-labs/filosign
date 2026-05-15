// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @notice USDC-shaped ERC20 for local Hardhat: 6 decimals, EIP-2612 permit, owner-gated `mint`.
contract MockUSDCToken is ERC20Permit, Ownable {
    constructor(address initialOwner)
        ERC20("Mock USD Coin", "USDC")
        ERC20Permit("Mock USD Coin")
        Ownable(initialOwner)
    {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
