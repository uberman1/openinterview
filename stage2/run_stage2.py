#!/usr/bin/env python3
"""
Stage 2 - Quality Gate Runner
Orchestrates guardrails verification for protected files
"""

import json
import os
import sys
import subprocess
from datetime import datetime, timezone
from pathlib import Path

def run_command(cmd, description):
    """Run a command and return its output"""
    print(f"\n{'='*60}")
    print(f"{description}")
    print(f"{'='*60}\n")
    
    result = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True
    )
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    
    return result.returncode == 0

def main():
    """Run Stage 2 quality gate"""
    print("╔════════════════════════════════════════════════╗")
    print("║      Stage 2 - Quality Gate (Guardrails)      ║")
    print("╚════════════════════════════════════════════════╝\n")
    
    # Check if baselines exist
    baseline_file = 'stage2/baselines.json'
    if not os.path.exists(baseline_file):
        print("⚠️  No baselines found. Creating baselines first...\n")
        if not run_command('python stage2/lock_baselines.py', 'Creating Baselines'):
            print("\n❌ Failed to create baselines")
            sys.exit(1)
    
    # Verify guardrails
    if not run_command('python stage2/verify_guardrails.py', 'Verifying Guardrails'):
        print("\n❌ Guardrails verification failed")
        sys.exit(1)
    
    # Generate summary
    results_file = 'qa/stage2/verification_results.json'
    if os.path.exists(results_file):
        with open(results_file) as f:
            results = json.load(f)
        
        print(f"\n{'='*60}")
        print("STAGE 2 COMPLETE")
        print(f"{'='*60}")
        print(f"Status:      {results['status']}")
        print(f"Total files: {results['total']}")
        print(f"Verified:    {results['passed']}")
        print(f"Violations:  {results['violations']}")
        print(f"Missing:     {results['missing']}")
        print(f"{'='*60}\n")
    
    # Save to release gate format
    gate_results = {
        'stage2_guardrails': {
            'status': results.get('status', 'UNKNOWN'),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'total_files': results.get('total', 0),
            'passed': results.get('passed', 0),
            'violations': results.get('violations', 0),
            'missing': results.get('missing', 0)
        }
    }
    
    gate_file = 'qa/stage2/gate_results.json'
    with open(gate_file, 'w') as f:
        json.dump(gate_results, f, indent=2)
    
    print(f"📁 Gate results: {gate_file}")
    print("\n🎉 Stage 2 Quality Gate Complete!")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
