#!/usr/bin/env node

/**
 * Add Translations to Remaining Pages Script
 * This script will add useLanguage hook to pages that don't have it yet
 */

const fs = require('fs');
const path = require('path');

// Function to add translations to a specific page
function addTranslationsToPage(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has useLanguage
    if (content.includes('useLanguage')) {
      console.log(`✅ Already has translations: ${filePath}`);
      return false;
    }

    // Skip test files
    if (filePath.includes('/test') || filePath.includes('test-')) {
      console.log(`⏭️  Skipping test file: ${filePath}`);
      return false;
    }

    // Add useLanguage import
    if (!content.includes("import { useLanguage }")) {
      const importMatch = content.match(/import.*from.*['"];?\n/g);
      if (importMatch && importMatch.length > 0) {
        const lastImport = importMatch[importMatch.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length;
        
        content = content.slice(0, insertIndex) + 
          `import { useLanguage } from '@/contexts/LanguageContext';
` + 
          content.slice(insertIndex);
      }
    }

    // Add useLanguage hook
    const componentMatch = content.match(/export default function \w+\(\) \{/);
    if (componentMatch) {
      const insertIndex = componentMatch.index + componentMatch[0].length;
      content = content.slice(0, insertIndex) + 
        `\n  const { t } = useLanguage();
` + 
        content.slice(insertIndex);
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Added translations to: ${filePath}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Function to recursively find all page.tsx files
function findAllPages(dir, pages = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findAllPages(filePath, pages);
    } else if (file === 'page.tsx') {
      pages.push(filePath);
    }
  }
  
  return pages;
}

// Main execution
console.log('🌍 Adding translations to remaining pages...\n');

const appDir = path.join(process.cwd(), 'app');
const allPages = findAllPages(appDir);

console.log(`Found ${allPages.length} page files\n`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

allPages.forEach(page => {
  const result = addTranslationsToPage(page);
  if (result === true) {
    successCount++;
  } else if (result === false) {
    skipCount++;
  } else {
    errorCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Successfully added translations: ${successCount} pages`);
console.log(`⏭️  Skipped: ${skipCount} pages`);
console.log(`❌ Errors: ${errorCount} pages`);
console.log(`📄 Total processed: ${allPages.length} pages`);

console.log('\n🎉 Translation setup completed!');
console.log('\n📝 Next steps:');
console.log('1. Run auto-translate-ui again to translate the newly added pages');
console.log('2. Test language switching on all pages');
console.log('3. Add more specific translations as needed');
console.log('4. Test with real content');
