#!/usr/bin/env python3
"""
Stage 2 - Lock Baselines
Creates SHA-256 hashes of protected files for byte-level verification
"""

import json
import hashlib
import os
import sys
from pathlib import Path
import yaml

def compute_sha256(filepath):
    """Compute SHA-256 hash of a file"""
    sha256 = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            for block in iter(lambda: f.read(4096), b''):
                sha256.update(block)
        return sha256.hexdigest()
    except FileNotFoundError:
        return None

def load_config():
    """Load guardrails configuration"""
    config_path = Path(__file__).parent / 'guardrails.yml'
    with open(config_path) as f:
        return yaml.safe_load(f)

def lock_baselines():
    """Create baseline hashes for all protected files"""
    config = load_config()
    protected_files = config.get('protected_files', [])
    
    baselines = {}
    missing_files = []
    
    print("🔒 Stage 2 - Locking Baselines\n")
    print(f"Processing {len(protected_files)} protected files...\n")
    
    for filepath in protected_files:
        file_hash = compute_sha256(filepath)
        
        if file_hash is None:
            missing_files.append(filepath)
            print(f"❌ MISSING: {filepath}")
        else:
            baselines[filepath] = {
                'sha256': file_hash,
                'size': os.path.getsize(filepath)
            }
            print(f"✅ LOCKED: {filepath}")
            print(f"   Hash: {file_hash[:16]}...")
    
    # Save baselines
    baseline_file = config.get('baseline_file', 'stage2/baselines.json')
    os.makedirs(os.path.dirname(baseline_file), exist_ok=True)
    
    with open(baseline_file, 'w') as f:
        json.dump(baselines, f, indent=2)
    
    print(f"\n📁 Baselines saved to: {baseline_file}")
    print(f"✅ Locked: {len(baselines)} files")
    
    if missing_files:
        print(f"❌ Missing: {len(missing_files)} files")
        print("\nMissing files:")
        for filepath in missing_files:
            print(f"  - {filepath}")
        sys.exit(1)
    
    print("\n🎉 All baselines locked successfully!")
    return baselines

if __name__ == '__main__':
    try:
        lock_baselines()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
