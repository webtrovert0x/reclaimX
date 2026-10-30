#!/usr/bin/env bash
set -e

CONTRACT_ADDRESS="${1:-0x7feDd4981CF2448366c3de1099B43823D4Deac13}"
CONSTRUCTOR_ARGS="00000000000000000000000055da37abbf8c9141ada4dd1c2ef7211c0483ec1600000000000000000000000000000000000000000000000000b1a2bc2ec50000"
EXPLORER_API="${2:-https://scan.botchain.ai/api}"

echo "Verifying ContractRecoveryHub on BOTScan (BOT Chain Mainnet)..."
echo "Contract: $CONTRACT_ADDRESS"

forge verify-contract "$CONTRACT_ADDRESS" contracts/ContractRecoveryHub.sol:ContractRecoveryHub \
  --verifier blockscout \
  --verifier-url "$EXPLORER_API" \
  --compiler-version "v0.8.20+commit.a1b79de6" \
  --constructor-args "$CONSTRUCTOR_ARGS" \
  --watch
