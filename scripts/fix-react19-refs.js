const fs = require('fs');
const path = require('path');

// List of UI component files that might have ref issues
const uiFiles = [
  'components/ui/select.tsx',
  'components/ui/textarea.tsx',
  'components/ui/table.tsx',
  'components/ui/sheet.tsx',
  'components/ui/separator.tsx',
  'components/ui/progress.tsx',
  'components/ui/popover.tsx',
  'components/ui/label.tsx',
  'components/ui/input.tsx',
  'components/ui/dropdown-menu.tsx',
  'components/ui/dialog.tsx',
  'components/ui/command.tsx',
  'components/ui/checkbox.tsx',
  'components/ui/card.tsx',
  'components/ui/button.tsx',
  'components/ui/alert-dialog.tsx'
];

function fixRefOrder(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern to match JSX elements with ref={ref} followed by other props
    // This will match patterns like: <Component ref={ref} prop1={value1} prop2={value2} />
    const refPattern = /(<[A-Z][a-zA-Z0-9]*\s+)(ref=\{ref\})(\s+[^>]*>)/g;
    
    content = content.replace(refPattern, (match, beforeRef, refProp, afterRef) => {
      // Extract all props after ref
      const propsAfterRef = afterRef.trim();
      
      // If there are props after ref, move ref to the end
      if (propsAfterRef && propsAfterRef !== '>') {
        modified = true;
        return `${beforeRef.trim()}${propsAfterRef.replace(/>$/, '')} ${refProp}>`;
      }
      
      return match;
    });

    // Also handle cases where ref is in the middle of props
    const refInMiddlePattern = /(<[A-Z][a-zA-Z0-9]*\s+)([^>]*?)(\s+ref=\{ref\})(\s+[^>]*>)/g;
    
    content = content.replace(refInMiddlePattern, (match, beforeRef, propsBefore, refProp, propsAfter) => {
      const allProps = (propsBefore + propsAfter).trim();
      if (allProps && allProps !== '>') {
        modified = true;
        return `${beforeRef.trim()}${allProps.replace(/>$/, '')} ${refProp}>`;
      }
      return match;
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ref order in ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log('🔧 Fixing React 19 ref prop order in UI components...\n');

uiFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    fixRefOrder(fullPath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n🎉 React 19 ref fixes completed!');
