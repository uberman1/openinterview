#!/usr/bin/env bash
set -e
python3 password_option1_patch.py
python3 password_qa/run_tests.py
