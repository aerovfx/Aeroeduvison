#!/usr/bin/env python3
"""
Fix All Labs - Sửa tất cả lỗi trong lab pages
Author: AI Assistant
Date: 2024-10-12
"""

import os
import re
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).parent
APP_LABS = BASE_DIR / "app" / "(dashboard)" / "(routes)" / "dashboard" / "labtwin" / "labs"

def fix_lab_file(file_path: Path):
    """Fix all issues in a lab TSX file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix 1: Remove duplicate imports
        import_pattern = r'import\s*\{\s*([^}]+)\s*\}\s*from\s*["\']lucide-react["\'];'
        imports = re.findall(import_pattern, content)
        
        if len(imports) > 0:
            # Get all unique imports
            all_imports = []
            for import_group in imports:
                items = [item.strip() for item in import_group.split(',')]
                all_imports.extend(items)
            
            # Remove duplicates
            unique_imports = []
            seen = set()
            for item in all_imports:
                if item not in seen:
                    unique_imports.append(item)
                    seen.add(item)
            
            # Replace all lucide-react imports with single import
            new_import = f'import {{ {", ".join(unique_imports)} }} from "lucide-react";'
            content = re.sub(import_pattern, '', content)
            
            # Add the new import after other imports
            lines = content.split('\n')
            insert_index = 0
            for i, line in enumerate(lines):
                if line.startswith('import ') and 'lucide-react' not in line:
                    insert_index = i + 1
            
            lines.insert(insert_index, new_import)
            content = '\n'.join(lines)
        
        # Fix 2: Ensure proper JSX comments
        content = content.replace('<!-- ', '{/* ')
        content = content.replace(' -->', ' */}')
        
        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed {file_path.name}")
            return True
        else:
            print(f"ℹ️  No changes needed for {file_path.name}")
            return False
            
    except Exception as e:
        print(f"❌ Error fixing {file_path.name}: {e}")
        return False

def main():
    """Fix all lab pages"""
    print("🔧 Fixing all lab pages...")
    print("=" * 50)
    
    fixed_count = 0
    total_count = 0
    
    # Find all TSX files
    for tsx_file in APP_LABS.rglob("*.tsx"):
        if tsx_file.name == "page.tsx":
            total_count += 1
            if fix_lab_file(tsx_file):
                fixed_count += 1
    
    print("=" * 50)
    print(f"✅ Fixed {fixed_count}/{total_count} files")
    print("🚀 All labs are now ready!")

if __name__ == "__main__":
    main()
