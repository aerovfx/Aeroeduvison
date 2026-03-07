#!/usr/bin/env node

/**
 * Advanced script to add language switcher to ALL pages
 * This script will automatically add language switcher components to all remaining pages
 */

const fs = require('fs');
const path = require('path');

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

// Function to check if page already has language switcher
function hasLanguageSwitcher(content) {
  return content.includes('LanguageSwitcher') || 
         content.includes('useLanguage') ||
         content.includes('@/contexts/LanguageContext');
}

// Function to add language switcher to a page
function addLanguageSwitcher(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has language switcher
    if (hasLanguageSwitcher(content)) {
      console.log(`✅ Already has language switcher: ${filePath}`);
      return false;
    }

    // Skip if it's a special page (auth, marketing, etc.)
    if (filePath.includes('/auth/') || 
        filePath.includes('/marketing/') ||
        filePath.includes('/api/') ||
        filePath.includes('/test-')) {
      console.log(`⏭️  Skipping special page: ${filePath}`);
      return false;
    }

    // Skip if it's a layout or component file
    if (filePath.includes('layout.tsx') || 
        filePath.includes('loading.tsx') ||
        filePath.includes('error.tsx') ||
        filePath.includes('not-found.tsx')) {
      console.log(`⏭️  Skipping layout file: ${filePath}`);
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

    // Add language switcher to header
    // Look for common header patterns
    const headerPatterns = [
      // Pattern 1: div with header class
      /<div className="[^"]*header[^"]*"[^>]*>/,
      // Pattern 2: header tag
      /<header[^>]*>/,
      // Pattern 3: div with gradient background
      /<div className="[^"]*bg-gradient[^"]*"[^>]*>/,
      // Pattern 4: div with title and flex layout
      /<div className="[^"]*flex[^"]*"[^>]*>.*<h[1-6]/,
      // Pattern 5: main container div
      /<div className="[^"]*max-w[^"]*"[^>]*>/
    ];

    let headerFound = false;
    for (const pattern of headerPatterns) {
      if (pattern.test(content)) {
        // Find the header and add language switcher
        const headerMatch = content.match(pattern);
        if (headerMatch) {
          const headerStart = headerMatch.index;
          
          // Look for the closing tag
          let headerEnd = -1;
          let depth = 0;
          let i = headerStart;
          
          while (i < content.length) {
            if (content.slice(i, i + 2) === '</') {
              depth--;
              if (depth === 0) {
                headerEnd = i;
                break;
              }
            } else if (content.slice(i, i + 1) === '<' && content.slice(i + 1, i + 2) !== '/') {
              depth++;
            }
            i++;
          }
          
          if (headerEnd !== -1) {
            // Check if already has language switcher in this section
            const headerContent = content.slice(headerStart, headerEnd);
            if (!headerContent.includes('LanguageSwitcher')) {
              const beforeClosing = content.slice(0, headerEnd);
              const afterClosing = content.slice(headerEnd);
              
              // Add language switcher before closing tag
              content = beforeClosing + 
                `\n              <LanguageSwitcherCompact />` + 
                afterClosing;
              modified = true;
              headerFound = true;
              break;
            }
          }
        }
      }
    }

    // If no header found, try to add to the first div with flex layout
    if (!headerFound) {
      const flexDivMatch = content.match(/<div className="[^"]*flex[^"]*"[^>]*>/);
      if (flexDivMatch) {
        const flexStart = flexDivMatch.index;
        const flexEnd = content.indexOf('</div>', flexStart);
        
        if (flexEnd !== -1) {
          const flexContent = content.slice(flexStart, flexEnd);
          if (!flexContent.includes('LanguageSwitcher')) {
            const beforeClosing = content.slice(0, flexEnd);
            const afterClosing = content.slice(flexEnd);
            content = beforeClosing + 
              `\n              <LanguageSwitcherCompact />` + 
              afterClosing;
            modified = true;
          }
        }
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
console.log('🌍 Adding language switcher to ALL pages...\n');

const appDir = path.join(process.cwd(), 'app');
const allPages = findAllPages(appDir);

console.log(`Found ${allPages.length} page files\n`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

allPages.forEach(page => {
  const result = addLanguageSwitcher(page);
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
console.log(`📄 Total processed: ${allPages.length} pages`);

console.log('\n🎉 Language switcher addition completed!');
console.log('\n📝 Next steps:');
console.log('1. Test the language switching on updated pages');
console.log('2. Add more translation keys as needed');
console.log('3. Consider adding language switcher to remaining special pages');
console.log('4. Update documentation with new pages');
