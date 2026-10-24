// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {ContractRecoveryHub} from "../contracts/ContractRecoveryHub.sol";

contract DeployHubScript is Script {
    function run() external returns (ContractRecoveryHub hub) {
        uint256 deployerPrivateKey = vm.envOr(
            "DEPLOYER_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );

        address deployer = vm.addr(deployerPrivateKey);
        uint256 initialPrice = vm.envOr("INITIAL_DEEP_SCAN_PRICE", uint256(0.05 ether)); // 0.05 BOT default

        console2.log("Deployer address:", deployer);
        console2.log("Initial Deep Scan Price (wei):", initialPrice);

        vm.startBroadcast(deployerPrivateKey);

        hub = new ContractRecoveryHub(deployer, initialPrice);

        vm.stopBroadcast();

        console2.log("--------------------------------------------------");
        console2.log("ContractRecoveryHub successfully deployed!");
        console2.log("Hub Address:", address(hub));
        console2.log("Owner:", hub.owner());
        console2.log("--------------------------------------------------");
    }
}
