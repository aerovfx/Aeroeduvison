#!/usr/bin/env node

/**
 * Script to add language switcher to auth pages and other important pages
 * This script will add language switcher to pages that were skipped by the main script
 */

const fs = require('fs');
const path = require('path');

// Pages to update (auth pages and other important pages)
const pagesToUpdate = [
  'app/auth/login/page.tsx',
  'app/auth/register/page.tsx', 
  'app/auth/signin/page.tsx',
  'app/auth/signup/page.tsx',
  'app/auth/error/page.tsx',
  'app/test-simple/page.tsx',
  'app/test/page.tsx',
  'app/streaming/page.tsx',
  'app/competition/page.tsx',
  'app/hybrid-test/page.tsx',
  'app/debug-auth/page.tsx',
  'app/clear-session/page.tsx',
  'app/bubble-sheet-simple/page.tsx',
  'app/bubble-sheet-demo/page.tsx',
  'app/blocking/page.tsx',
  'app/advanced-bubble-sheet/page.tsx',
];

// Function to add language switcher to a page
function addLanguageSwitcher(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has language switcher
    if (content.includes('LanguageSwitcher') || content.includes('useLanguage')) {
      console.log(`✅ Already has language switcher: ${filePath}`);
      return false;
    }

    let modified = false;

    // Add imports
    if (!content.includes("import { useLanguage }")) {
      // Find the last import statement
      const importRegex = /import.*from.*['"];?\n/g;
      const imports = content.match(importRegex);
      
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length;
        
        content = content.slice(0, insertIndex) + 
          `import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
` + 
          content.slice(insertIndex);
        modified = true;
      } else {
        // No imports found, add at the beginning
        content = `import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
` + content;
        modified = true;
      }
    }

    // Add language hook
    if (!content.includes('const { t } = useLanguage()')) {
      const componentMatch = content.match(/export default function \w+\(\) \{/);
      if (componentMatch) {
        const insertIndex = componentMatch.index + componentMatch[0].length;
        content = content.slice(0, insertIndex) + 
          `\n  const { t } = useLanguage();
` + 
          content.slice(insertIndex);
        modified = true;
      }
    }

    // Add language switcher to the page
    // Look for common patterns to add the switcher
    const patterns = [
      // Pattern 1: div with min-h-screen
      /<div className="[^"]*min-h-screen[^"]*"[^>]*>/,
      // Pattern 2: div with p-8 or similar padding
      /<div className="[^"]*p-\d+[^"]*"[^>]*>/,
      // Pattern 3: div with flex
      /<div className="[^"]*flex[^"]*"[^>]*>/,
      // Pattern 4: h1 tag
      /<h1[^>]*>/,
    ];

    let switcherAdded = false;
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        const match = content.match(pattern);
        if (match) {
          const matchIndex = match.index;
          
          // Find the opening tag and add switcher after it
          const tagEnd = content.indexOf('>', matchIndex) + 1;
          
          // Check if switcher already exists in this section
          const nextDiv = content.indexOf('</div>', tagEnd);
          if (nextDiv !== -1) {
            const sectionContent = content.slice(tagEnd, nextDiv);
            if (!sectionContent.includes('LanguageSwitcher')) {
              content = content.slice(0, tagEnd) + 
                `\n        <div className="absolute top-4 right-4">
          <LanguageSwitcherCompact />
        </div>` + 
                content.slice(tagEnd);
              modified = true;
              switcherAdded = true;
              break;
            }
          }
        }
      }
    }

    // If no pattern matched, try to add to the very beginning of the return statement
    if (!switcherAdded) {
      const returnMatch = content.match(/return\s*\(/);
      if (returnMatch) {
        const returnIndex = returnMatch.index + returnMatch[0].length;
        content = content.slice(0, returnIndex) + 
          `\n    <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcherCompact />
      </div>
` + 
          content.slice(returnIndex);
        
        // Close the wrapper div at the end
        const lastDiv = content.lastIndexOf('</div>');
        if (lastDiv !== -1) {
          content = content.slice(0, lastDiv) + 
            `\n    </div>` + 
            content.slice(lastDiv);
        }
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Added language switcher to: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  No suitable location found in: ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🌍 Adding language switcher to auth and important pages...\n');

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

pagesToUpdate.forEach(page => {
  const fullPath = path.join(process.cwd(), page);
  const result = addLanguageSwitcher(fullPath);
  if (result === true) {
    successCount++;
  } else if (result === false) {
    skipCount++;
  } else {
    errorCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Successfully added: ${successCount} pages`);
console.log(`⏭️  Skipped: ${skipCount} pages`);
console.log(`❌ Errors: ${errorCount} pages`);
console.log(`📄 Total processed: ${pagesToUpdate.length} pages`);

console.log('\n🎉 Language switcher addition completed!');
console.log('\n📝 Next steps:');
console.log('1. Test the language switching on updated pages');
console.log('2. Verify auth pages work correctly');
console.log('3. Check responsive design on mobile');
console.log('4. Update documentation if needed');
