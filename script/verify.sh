#!/usr/bin/env bash
set -e

CONTRACT_ADDRESS="0x8baf11bb2f5c35d81fd21cd40eae0c205113cba1"
CONSTRUCTOR_ARGS="000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb9226600000000000000000000000000000000000000000000000000b1a2bc2ec50000"
EXPLORER_API="https://scan.bohr.life/api"

echo "Verifying ContractRecoveryHub on BohrScan..."
echo "Contract: $CONTRACT_ADDRESS"

forge verify-contract "$CONTRACT_ADDRESS" contracts/ContractRecoveryHub.sol:ContractRecoveryHub \
  --verifier blockscout \
  --verifier-url "$EXPLORER_API" \
  --compiler-version "v0.8.20+commit.a1b79de6" \
  --constructor-args "$CONSTRUCTOR_ARGS" \
  --watch
