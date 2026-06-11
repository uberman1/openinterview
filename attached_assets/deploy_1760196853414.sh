#!/usr/bin/env bash
set -euo pipefail

echo "[1/4] Applying patch (idempotent)"
git apply --reject --whitespace=fix subscription_mock.patch || true

echo "[2/4] Installing mock driver"
mkdir -p subscription_pack
cp -f subscription_pack/mock_stripe.py ./subscription_pack/mock_stripe.py

echo "[3/4] Run Subscription pack (non-mock)"
python subscription_pack/run.py || { echo "Non-mock run failed"; exit 1; }

echo "[4/4] Run Subscription pack (mock mode)"
export STRIPE_MOCK=1
python subscription_pack/run.py || { echo "Mock run failed"; exit 1; }

echo "Done. Check qa/subscription/v0.1.1/ and test2.html."
