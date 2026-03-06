#!/bin/bash
echo "🧬 BioGrowth API..."
cd "$(dirname "$0")"
[ ! -f "output/data.json" ] && python3 build.py
python3 api.py




