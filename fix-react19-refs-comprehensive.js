#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all UI component files
const uiFiles = glob.sync('components/ui/*.tsx');

console.log(`Found ${uiFiles.length} UI component files to check...`);

uiFiles.forEach(filePath => {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern 1: ref={ref} before {...props}
  const pattern1 = /(\s+)(\w+)\.(\w+)\s*\n\s*ref=\{ref\}\s*\n\s*className=\{([^}]+)\}\s*\n\s*\{\.\.\.props\}/g;
  const replacement1 = '$1$2.$3\n$1className={$4}\n$1ref={ref}\n$1{...props}';
  
  if (pattern1.test(content)) {
    content = content.replace(pattern1, replacement1);
    modified = true;
    console.log(`  ✓ Fixed pattern 1 in ${filePath}`);
  }
  
  // Pattern 2: ref={ref} before className in single line
  const pattern2 = /(\s+)(\w+)\.(\w+)\s*\n\s*ref=\{ref\}\s*\n\s*className=\{([^}]+)\}\s*\n\s*\{\.\.\.props\}/g;
  const replacement2 = '$1$2.$3\n$1className={$4}\n$1ref={ref}\n$1{...props}';
  
  if (pattern2.test(content)) {
    content = content.replace(pattern2, replacement2);
    modified = true;
    console.log(`  ✓ Fixed pattern 2 in ${filePath}`);
  }
  
  // Pattern 3: ref={ref} before other props in single line
  const pattern3 = /(\s+)(\w+)\.(\w+)\s*\n\s*ref=\{ref\}\s*\n\s*className=\{([^}]+)\}\s*\n\s*\{\.\.\.props\}/g;
  const replacement3 = '$1$2.$3\n$1className={$4}\n$1ref={ref}\n$1{...props}';
  
  if (pattern3.test(content)) {
    content = content.replace(pattern3, replacement3);
    modified = true;
    console.log(`  ✓ Fixed pattern 3 in ${filePath}`);
  }
  
  // Pattern 4: Generic ref={ref} before {...props} (most common)
  const pattern4 = /(\s+)(<[^>]+)\s*\n\s*ref=\{ref\}\s*\n\s*className=\{([^}]+)\}\s*\n\s*\{\.\.\.props\}/g;
  const replacement4 = '$1$2\n$1className={$3}\n$1ref={ref}\n$1{...props}';
  
  if (pattern4.test(content)) {
    content = content.replace(pattern4, replacement4);
    modified = true;
    console.log(`  ✓ Fixed pattern 4 in ${filePath}`);
  }
  
  // Pattern 5: ref={ref} before className={cn(...)}
  const pattern5 = /(\s+)(<[^>]+)\s*\n\s*ref=\{ref\}\s*\n\s*className=\{cn\([^}]+\)\}\s*\n\s*\{\.\.\.props\}/g;
  const replacement5 = '$1$2\n$1className={cn($3)}\n$1ref={ref}\n$1{...props}';
  
  if (pattern5.test(content)) {
    content = content.replace(pattern5, replacement5);
    modified = true;
    console.log(`  ✓ Fixed pattern 5 in ${filePath}`);
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Updated ${filePath}`);
  } else {
    console.log(`  ⏭️  No changes needed in ${filePath}`);
  }
});

console.log('\n🎉 React 19 ref fixes completed!');
