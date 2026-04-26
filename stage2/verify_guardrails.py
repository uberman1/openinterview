#!/usr/bin/env python3
"""
Stage 2 - Verify Guardrails
Byte-level verification of protected files against locked baselines
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

def load_baselines():
    """Load baseline hashes"""
    config = load_config()
    baseline_file = config.get('baseline_file', 'stage2/baselines.json')
    
    if not os.path.exists(baseline_file):
        print(f"❌ Baseline file not found: {baseline_file}")
        print("Run 'python stage2/lock_baselines.py' to create baselines first.")
        sys.exit(1)
    
    with open(baseline_file) as f:
        return json.load(f)

def verify_guardrails():
    """Verify all protected files against baselines"""
    config = load_config()
    baselines = load_baselines()
    
    print("🔍 Stage 2 - Verifying Guardrails\n")
    print(f"Verifying {len(baselines)} protected files...\n")
    
    violations = []
    missing = []
    passed = []
    
    for filepath, baseline in baselines.items():
        current_hash = compute_sha256(filepath)
        
        if current_hash is None:
            missing.append(filepath)
            print(f"❌ MISSING: {filepath}")
        elif current_hash != baseline['sha256']:
            violations.append({
                'file': filepath,
                'expected': baseline['sha256'],
                'actual': current_hash
            })
            print(f"❌ MODIFIED: {filepath}")
            print(f"   Expected: {baseline['sha256'][:16]}...")
            print(f"   Actual:   {current_hash[:16]}...")
        else:
            passed.append(filepath)
            print(f"✅ VERIFIED: {filepath}")
    
    # Summary
    print(f"\n{'='*60}")
    print("VERIFICATION SUMMARY")
    print(f"{'='*60}")
    print(f"✅ Passed:   {len(passed)}")
    print(f"❌ Modified: {len(violations)}")
    print(f"❌ Missing:  {len(missing)}")
    print(f"{'='*60}")
    
    # Results JSON
    results = {
        'status': 'PASS' if (not violations and not missing) else 'FAIL',
        'total': len(baselines),
        'passed': len(passed),
        'violations': len(violations),
        'missing': len(missing),
        'details': {
            'violations': violations,
            'missing': missing
        }
    }
    
    # Save results
    results_file = 'qa/stage2/verification_results.json'
    os.makedirs(os.path.dirname(results_file), exist_ok=True)
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📁 Results saved to: {results_file}")
    
    # Exit with error if violations or missing files
    if violations or missing:
        print("\n❌ GUARDRAILS VERIFICATION FAILED!")
        print("\nProtected files have been modified or are missing.")
        print("Restore the original files or update baselines with:")
        print("  python stage2/lock_baselines.py")
        sys.exit(1)
    
    print("\n🎉 All guardrails verified successfully!")
    return results

if __name__ == '__main__':
    try:
        verify_guardrails()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
