#!/usr/bin/env node

/**
 * Auto-translate UI Elements Script
 * This script will automatically replace hardcoded text with translation keys
 */

const fs = require('fs');
const path = require('path');

// Common text replacements
const textReplacements = {
  // Dashboard
  'Dashboard': 't(\'dashboard.title\')',
  'Welcome': 't(\'dashboard.welcome\')',
  'Overview': 't(\'dashboard.overview\')',
  'Statistics': 't(\'dashboard.stats\')',
  'Recent': 't(\'dashboard.recent\')',
  'Quick Actions': 't(\'dashboard.quick-actions\')',
  'Notifications': 't(\'dashboard.notifications\')',
  
  // Common Actions
  'Save': 't(\'common.save\')',
  'Cancel': 't(\'common.cancel\')',
  'Delete': 't(\'common.delete\')',
  'Edit': 't(\'common.edit\')',
  'Add': 't(\'common.add\')',
  'Remove': 't(\'common.remove\')',
  'Submit': 't(\'common.submit\')',
  'Reset': 't(\'common.reset\')',
  'Back': 't(\'common.back\')',
  'Next': 't(\'common.next\')',
  'Previous': 't(\'common.previous\')',
  'Close': 't(\'common.close\')',
  'Open': 't(\'common.open\')',
  'Loading...': 't(\'common.loading\')',
  'Error': 't(\'common.error\')',
  'Success': 't(\'common.success\')',
  'Warning': 't(\'common.warning\')',
  'Info': 't(\'common.info\')',
  'Confirm': 't(\'common.confirm\')',
  'Yes': 't(\'common.yes\')',
  'No': 't(\'common.no\')',
  'OK': 't(\'common.ok\')',
  
  // Labs
  'Laboratory': 't(\'labs.title\')',
  'Physics': 't(\'labs.physics\')',
  'Chemistry': 't(\'labs.chemistry\')',
  'Biology': 't(\'labs.biology\')',
  'Mathematics': 't(\'labs.mathematics\')',
  'Start Experiment': 't(\'labs.start-experiment\')',
  'Experiment Complete': 't(\'labs.experiment-complete\')',
  'Results': 't(\'labs.results\')',
  'Data': 't(\'labs.data\')',
  'Graphs': 't(\'labs.graphs\')',
  'Export Data': 't(\'labs.export\')',
  
  // Physics Motion
  'Physics Motion': 't(\'physics-motion.title\')',
  'Free Fall': 't(\'physics-motion.free-fall\')',
  'Projectile Motion': 't(\'physics-motion.projectile\')',
  'Harmonic Motion': 't(\'physics-motion.harmonic\')',
  'Controls': 't(\'physics-motion.controls\')',
  'Visualization': 't(\'physics-motion.visualization\')',
  'Graph': 't(\'physics-motion.graph\')',
  'Information': 't(\'physics-motion.info\')',
  'Play': 't(\'physics-motion.play\')',
  'Pause': 't(\'physics-motion.pause\')',
  'Initial Height': 't(\'physics-motion.initial-height\')',
  'Initial Velocity': 't(\'physics-motion.initial-velocity\')',
  'Gravity': 't(\'physics-motion.gravity\')',
  'Time': 't(\'physics-motion.time\')',
  'Distance': 't(\'physics-motion.distance\')',
  'Velocity': 't(\'physics-motion.velocity\')',
  'Acceleration': 't(\'physics-motion.acceleration\')',
  
  // Emotion Tracker
  'Emotion Tracker': 't(\'emotion.title\')',
  'Mood': 't(\'emotion.mood\')',
  'Energy': 't(\'emotion.energy\')',
  'Motivation': 't(\'emotion.motivation\')',
  'Stress': 't(\'emotion.stress\')',
  'Happy': 't(\'emotion.happy\')',
  'Focused': 't(\'emotion.focused\')',
  'Stressed': 't(\'emotion.stressed\')',
  'Motivated': 't(\'emotion.motivated\')',
  'Heart Map': 't(\'emotion.heart-map\')',
  'Classroom': 't(\'emotion.classroom\')',
  'Students': 't(\'emotion.students\')',
  'Teacher': 't(\'emotion.teacher\')',
  
  // Vision Tracker
  'Vision Tracker': 't(\'vision.title\')',
  'Attention': 't(\'vision.attention\')',
  'Focus': 't(\'vision.focus\')',
  'Eye Movement': 't(\'vision.eye-movement\')',
  'Posture': 't(\'vision.posture\')',
  'Engagement': 't(\'vision.engagement\')',
  'Monitoring': 't(\'vision.monitoring\')',
  'Analysis': 't(\'vision.analysis\')',
  
  // Analytics
  'Analytics': 't(\'analytics.title\')',
  'Performance': 't(\'analytics.performance\')',
  'Progress': 't(\'analytics.progress\')',
  'Trends': 't(\'analytics.trends\')',
  'Reports': 't(\'analytics.reports\')',
  'Export Report': 't(\'analytics.export\')',
  'Date Range': 't(\'analytics.date-range\')',
  'Filters': 't(\'analytics.filters\')',
  
  // Achievements
  'Achievements': 't(\'achievements.title\')',
  'Badges': 't(\'achievements.badges\')',
  'Points': 't(\'achievements.points\')',
  'Level': 't(\'achievements.level\')',
  'Unlocked': 't(\'achievements.unlocked\')',
  'Locked': 't(\'achievements.locked\')',
  
  // Settings
  'Settings': 't(\'settings.title\')',
  'Profile': 't(\'settings.profile\')',
  'Account': 't(\'settings.account\')',
  'Preferences': 't(\'settings.preferences\')',
  'Privacy': 't(\'settings.privacy\')',
  'Security': 't(\'settings.security\')',
  'Language': 't(\'settings.language\')',
  'Theme': 't(\'settings.theme\')',
  
  // Forms
  'Name': 't(\'form.name\')',
  'Email': 't(\'form.email\')',
  'Password': 't(\'form.password\')',
  'Confirm Password': 't(\'form.confirm-password\')',
  'Phone': 't(\'form.phone\')',
  'Address': 't(\'form.address\')',
  'Birthday': 't(\'form.birthday\')',
  'Gender': 't(\'form.gender\')',
  'Male': 't(\'form.male\')',
  'Female': 't(\'form.female\')',
  'Other': 't(\'form.other\')',
  
  // Navigation
  'Home': 't(\'nav.home\')',
  'Logout': 't(\'nav.logout\')',
  'Login': 't(\'nav.login\')',
  'Register': 't(\'nav.register\')',
};

// Function to replace text in a file
function replaceTextInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Skip if doesn't have useLanguage
    if (!content.includes('useLanguage')) {
      console.log(`⏭️  No translations setup: ${filePath}`);
      return false;
    }

    // Replace hardcoded text with translation keys
    for (const [text, translation] of Object.entries(textReplacements)) {
      // Look for text in JSX strings
      const patterns = [
        new RegExp(`>${text}<`, 'g'),
        new RegExp(`"${text}"`, 'g'),
        new RegExp(`'${text}'`, 'g'),
        new RegExp(`\`${text}\``, 'g'),
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, `>{${translation}}<`);
          modified = true;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated translations in: ${filePath}`);
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
console.log('🔄 Auto-translating UI elements...\n');

const appDir = path.join(process.cwd(), 'app');
const allPages = findAllPages(appDir);

console.log(`Found ${allPages.length} page files\n`);

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

allPages.forEach(page => {
  const result = replaceTextInFile(page);
  if (result === true) {
    successCount++;
  } else if (result === false) {
    skipCount++;
  } else {
    errorCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Successfully updated: ${successCount} pages`);
console.log(`⏭️  Skipped: ${skipCount} pages`);
console.log(`❌ Errors: ${errorCount} pages`);
console.log(`📄 Total processed: ${allPages.length} pages`);

console.log('\n🎉 Auto-translation completed!');
console.log('\n📝 Next steps:');
console.log('1. Test language switching on updated pages');
console.log('2. Verify all text is properly translated');
console.log('3. Add more specific translations as needed');
console.log('4. Test with real content');
