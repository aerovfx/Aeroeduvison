#!/usr/bin/env node

/**
 * Script to add language switcher to main pages
 * This script will automatically add language switcher components to key pages
 */

const fs = require('fs');
const path = require('path');

// Pages to update with language switcher
const pagesToUpdate = [
  'app/page.tsx', // Homepage
  'app/(dashboard)/(routes)/dashboard/page.tsx', // Dashboard
  'app/(dashboard)/(routes)/dashboard/labtwin/page.tsx', // LabTwin
  'app/(dashboard)/(routes)/dashboard/labtwin/labs/page.tsx', // Labs list
  'app/(dashboard)/(routes)/dashboard/analytics/page.tsx', // Analytics
  'app/(dashboard)/(routes)/dashboard/achievements/page.tsx', // Achievements
];

// Function to add language switcher to a page
function addLanguageSwitcher(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already has language switcher
    if (content.includes('LanguageSwitcher') || content.includes('useLanguage')) {
      console.log(`✅ Already has language switcher: ${filePath}`);
      return;
    }

    // Add import for LanguageSwitcher
    if (content.includes("import { useLanguage }")) {
      // Already has useLanguage, just add LanguageSwitcher import
      content = content.replace(
        /import { useLanguage } from '@\/contexts\/LanguageContext';/,
        `import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';`
      );
    } else {
      // Add both imports
      const importMatch = content.match(/import.*from.*['"];?\n/);
      if (importMatch) {
        const insertIndex = importMatch.index + importMatch[0].length;
        content = content.slice(0, insertIndex) + 
          `import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
` + 
          content.slice(insertIndex);
      }
    }

    // Add language hook
    const componentMatch = content.match(/export default function \w+\(\) \{/);
    if (componentMatch) {
      const insertIndex = componentMatch.index + componentMatch[0].length;
      content = content.slice(0, insertIndex) + 
        `\n  const { t } = useLanguage();
` + 
        content.slice(insertIndex);
    }

    // Add language switcher to header (look for common header patterns)
    const headerPatterns = [
      /<div className="[^"]*header[^"]*"[^>]*>/,
      /<header[^>]*>/,
      /<div className="[^"]*bg-gradient[^"]*"[^>]*>/
    ];

    for (const pattern of headerPatterns) {
      if (pattern.test(content)) {
        // Find the header and add language switcher
        const headerMatch = content.match(pattern);
        if (headerMatch) {
          // Look for the closing tag and add switcher before it
          const headerStart = headerMatch.index;
          const headerEnd = content.indexOf('</div>', headerStart);
          if (headerEnd !== -1) {
            const beforeClosing = content.slice(0, headerEnd);
            const afterClosing = content.slice(headerEnd);
            content = beforeClosing + 
              `\n              <LanguageSwitcherCompact />` + 
              afterClosing;
            break;
          }
        }
      }
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Added language switcher to: ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Main execution
console.log('🌍 Adding language switcher to main pages...\n');

pagesToUpdate.forEach(page => {
  const fullPath = path.join(process.cwd(), page);
  addLanguageSwitcher(fullPath);
});

console.log('\n🎉 Language switcher addition completed!');
console.log('\n📝 Next steps:');
console.log('1. Review the changes made to each file');
console.log('2. Test the language switching functionality');
console.log('3. Add more translation keys as needed');
console.log('4. Consider adding language switcher to more pages');
