#!/usr/bin/env python3
"""
Update test2.html infrastructure tracking with Stage 2 guardrails section
"""

import os
from datetime import datetime, timezone

def update_test2_stage2():
    """Add Stage 2 guardrails section to test2.html"""
    
    html_path = 'public/test2.html'
    
    if not os.path.exists(html_path):
        print(f"❌ {html_path} not found")
        return False
    
    with open(html_path, 'r') as f:
        content = f.read()
    
    # Check if Stage 2 section already exists
    if 'id="quality-gate-stage2"' in content:
        print("✅ Stage 2 section already exists in test2.html")
        return True
    
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # Stage 2 section HTML
    stage2_section = f'''
      <section id="quality-gate-stage2" class="gate-section">
        <h3>Quality Gate – Stage 2 (Guardrails)</h3>
        <table>
          <thead>
            <tr>
              <th>Version</th>
              <th>Description</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr data-version="v0.2.0" data-ts="{timestamp}">
              <td>v0.2.0</td>
              <td>Stage 2 Guardrails: Byte-level verification of 13 protected files (HTML, CSS, JS) via SHA-256 hashing.</td>
              <td>{timestamp}</td>
            </tr>
          </tbody>
        </table>
      </section>'''
    
    # Find insertion point (after Bundle C section or before closing main tag)
    if 'id="quality-gate-governance"' in content:
        # Insert after Bundle C
        insert_marker = '</section>\n    </section>'  # After governance section
        if insert_marker in content:
            content = content.replace(insert_marker, f'</section>{stage2_section}\n    </section>', 1)
        else:
            # Fallback: insert before closing main
            content = content.replace('</main>', f'{stage2_section}\n  </main>')
    else:
        # Insert before closing main
        content = content.replace('</main>', f'{stage2_section}\n  </main>')
    
    # Write updated content
    with open(html_path, 'w') as f:
        f.write(content)
    
    print(f"✅ Added Stage 2 section to {html_path}")
    print(f"   Timestamp: {timestamp}")
    return True

if __name__ == '__main__':
    try:
        if update_test2_stage2():
            print("\n🎉 Infrastructure tracking updated successfully!")
        else:
            exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        exit(1)
