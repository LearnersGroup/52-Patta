#!/bin/bash
set -e
npx expo prebuild --platform ios --no-install
python3 scripts/patch-podfile.py
