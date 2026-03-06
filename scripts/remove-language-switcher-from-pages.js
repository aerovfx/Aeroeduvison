#!/usr/bin/env node

/**
 * Script to remove language switcher from individual pages
 * Since we now have language switcher in the header layout
 */

const fs = require('fs');
const path = require('path');

// Function to recursively find all page.tsx files in dashboard
function findAllDashboardPages(dir, pages = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findAllDashboardPages(filePath, pages);
    } else if (file === 'page.tsx') {
      pages.push(filePath);
    }
  }
  
  return pages;
}

// Function to remove language switcher from a page
function removeLanguageSwitcher(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if doesn't have language switcher
    if (!content.includes('LanguageSwitcher') && !content.includes('useLanguage')) {
      console.log(`⏭️  No language switcher found: ${filePath}`);
      return false;
    }

    let modified = false;

    // Remove LanguageSwitcher imports
    if (content.includes("import { LanguageSwitcherCompact }")) {
      content = content.replace(/import { LanguageSwitcherCompact } from '@\/components\/ui\/language-switcher';\n?/g, '');
      modified = true;
    }

    // Remove useLanguage import if it's only used for language switcher
    if (content.includes("import { useLanguage }")) {
      // Check if useLanguage is used for anything other than language switcher
      const useLanguageMatches = content.match(/useLanguage/g);
      const languageSwitcherMatches = content.match(/LanguageSwitcher/g);
      
      if (useLanguageMatches && languageSwitcherMatches && useLanguageMatches.length === languageSwitcherMatches.length) {
        content = content.replace(/import { useLanguage } from '@\/contexts\/LanguageContext';\n?/g, '');
        modified = true;
      }
    }

    // Remove language switcher components from JSX
    if (content.includes('<LanguageSwitcherCompact')) {
      // Remove the entire div containing LanguageSwitcherCompact
      content = content.replace(/<div[^>]*>\s*<LanguageSwitcherCompact[^>]*\/>\s*<\/div>\n?/g, '');
      content = content.replace(/<LanguageSwitcherCompact[^>]*\/>\n?/g, '');
      modified = true;
    }

    // Remove useLanguage hook if it's not used elsewhere
    if (content.includes('const { t } = useLanguage()')) {
      // Check if 't' is used anywhere else in the component
      const tMatches = content.match(/\bt\(/g);
      if (!tMatches || tMatches.length === 0) {
        content = content.replace(/const { t } = useLanguage\(\);\n?/g, '');
        modified = true;
      }
    }

    // Clean up empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Removed language switcher from: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  No changes needed: ${filePath}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🧹 Removing language switcher from individual pages (now in header)...\n');

const dashboardDir = path.join(process.cwd(), 'app', '(dashboard)');
const allPages = findAllDashboardPages(dashboardDir);

console.log(`Found ${allPages.length} dashboard pages\n`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

allPages.forEach(page => {
  const result = removeLanguageSwitcher(page);
  if (result === true) {
    successCount++;
  } else if (result === false) {
    skipCount++;
  } else {
    errorCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Successfully removed: ${successCount} pages`);
console.log(`⏭️  Skipped: ${skipCount} pages`);
console.log(`❌ Errors: ${errorCount} pages`);
console.log(`📄 Total processed: ${allPages.length} pages`);

console.log('\n🎉 Language switcher cleanup completed!');
console.log('\n📝 Next steps:');
console.log('1. Test that language switcher works from header');
console.log('2. Verify all pages still work correctly');
console.log('3. Check responsive design');
console.log('4. Update documentation');
