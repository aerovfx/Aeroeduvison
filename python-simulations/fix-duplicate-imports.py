#!/usr/bin/env python3
"""
Fix Duplicate Imports - Sửa lỗi duplicate imports trong các lab pages
Author: AI Assistant
Date: 2024-10-12
"""

import os
import re
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
PROJECT_ROOT = BASE_DIR.parent
APP_LABS = PROJECT_ROOT / "app" / "(dashboard)" / "(routes)" / "dashboard" / "labtwin" / "labs"

def fix_duplicate_imports(file_path: Path):
    """Fix duplicate imports in a TSX file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all import statements
        import_pattern = r'import\s*\{\s*([^}]+)\s*\}\s*from\s*["\']lucide-react["\'];'
        imports = re.findall(import_pattern, content)
        
        if len(imports) > 1:
            # Combine all imports
            all_imports = []
            for import_group in imports:
                # Split by comma and clean up
                items = [item.strip() for item in import_group.split(',')]
                all_imports.extend(items)
            
            # Remove duplicates while preserving order
            unique_imports = []
            seen = set()
            for item in all_imports:
                if item not in seen:
                    unique_imports.append(item)
                    seen.add(item)
            
            # Create new import statement
            new_import = f'import {{ {", ".join(unique_imports)} }} from "lucide-react";'
            
            # Replace all import statements with the new one
            content = re.sub(import_pattern, '', content)
            
            # Add the new import after the other imports
            lines = content.split('\n')
            insert_index = 0
            for i, line in enumerate(lines):
                if line.startswith('import ') and 'lucide-react' not in line:
                    insert_index = i + 1
            
            lines.insert(insert_index, new_import)
            content = '\n'.join(lines)
            
            # Write back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✅ Fixed imports in {file_path.name}")
            return True
        else:
            print(f"ℹ️  No duplicate imports in {file_path.name}")
            return False
            
    except Exception as e:
        print(f"❌ Error fixing {file_path.name}: {e}")
        return False

def main():
    """Fix all lab pages"""
    print("🔧 Fixing duplicate imports in lab pages...")
    print("=" * 50)
    
    fixed_count = 0
    total_count = 0
    
    # Find all TSX files
    for tsx_file in APP_LABS.rglob("*.tsx"):
        if tsx_file.name == "page.tsx":
            total_count += 1
            if fix_duplicate_imports(tsx_file):
                fixed_count += 1
    
    print("=" * 50)
    print(f"✅ Fixed {fixed_count}/{total_count} files")
    print("🚀 Ready to build!")

if __name__ == "__main__":
    main()
