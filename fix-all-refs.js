#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing React 19 ref warnings...');

// Find all UI component files
const uiFiles = glob.sync('components/ui/*.tsx');
let totalFixed = 0;

uiFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let fileFixed = 0;
  
  // Pattern: ref={ref} before className or other props
  const patterns = [
    // Pattern 1: ref={ref} before className={cn(...)}
    {
      regex: /(\s+)(<[^>]+)\s*\n\s*ref=\{ref\}\s*\n\s*className=\{cn\([^}]+\)\}\s*\n\s*\{\.\.\.props\}/g,
      replacement: '$1$2\n$1className={cn($3)}\n$1ref={ref}\n$1{...props}'
    },
    // Pattern 2: ref={ref} before className={...}
    {
      regex: /(\s+)(<[^>]+)\s*\n\s*ref=\{ref\}\s*\n\s*className=\{([^}]+)\}\s*\n\s*\{\.\.\.props\}/g,
      replacement: '$1$2\n$1className={$3}\n$1ref={ref}\n$1{...props}'
    },
    // Pattern 3: ref={ref} before other single props
    {
      regex: /(\s+)(<[^>]+)\s*\n\s*ref=\{ref\}\s*\n\s*([^=]+)=\{([^}]+)\}\s*\n\s*\{\.\.\.props\}/g,
      replacement: '$1$2\n$1$3={$4}\n$1ref={ref}\n$1{...props}'
    }
  ];
  
  patterns.forEach((pattern, index) => {
    const matches = content.match(pattern.regex);
    if (matches) {
      content = content.replace(pattern.regex, pattern.replacement);
      modified = true;
      fileFixed += matches.length;
      console.log(`  ✓ Fixed ${matches.length} pattern ${index + 1} in ${filePath}`);
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Updated ${filePath} (${fileFixed} fixes)`);
    totalFixed += fileFixed;
  }
});

console.log(`\n🎉 Fixed ${totalFixed} React 19 ref warnings across ${uiFiles.length} files!`);
console.log('💡 Restart your dev server to see the changes.');
