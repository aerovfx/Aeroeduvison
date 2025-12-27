#!/usr/bin/env node

/**
 * Comprehensive Bilingual System Generator
 * This script will create a complete bilingual system for the website
 */

const fs = require('fs');
const path = require('path');

// Comprehensive translation keys for the entire website
const comprehensiveTranslations = {
  vi: {
    // Navigation & Layout
    'nav.home': 'Trang chủ',
    'nav.dashboard': 'Bảng điều khiển',
    'nav.labs': 'Phòng thí nghiệm',
    'nav.analytics': 'Phân tích',
    'nav.achievements': 'Thành tích',
    'nav.settings': 'Cài đặt',
    'nav.profile': 'Hồ sơ',
    'nav.logout': 'Đăng xuất',
    'nav.login': 'Đăng nhập',
    'nav.register': 'Đăng ký',
    
    // Common Actions
    'common.save': 'Lưu',
    'common.cancel': 'Hủy',
    'common.delete': 'Xóa',
    'common.edit': 'Chỉnh sửa',
    'common.add': 'Thêm',
    'common.remove': 'Xóa bỏ',
    'common.submit': 'Gửi',
    'common.reset': 'Đặt lại',
    'common.back': 'Quay lại',
    'common.next': 'Tiếp theo',
    'common.previous': 'Trước',
    'common.close': 'Đóng',
    'common.open': 'Mở',
    'common.loading': 'Đang tải...',
    'common.error': 'Lỗi',
    'common.success': 'Thành công',
    'common.warning': 'Cảnh báo',
    'common.info': 'Thông tin',
    'common.confirm': 'Xác nhận',
    'common.yes': 'Có',
    'common.no': 'Không',
    'common.ok': 'OK',
    
    // Dashboard
    'dashboard.title': 'Bảng điều khiển',
    'dashboard.welcome': 'Chào mừng',
    'dashboard.overview': 'Tổng quan',
    'dashboard.stats': 'Thống kê',
    'dashboard.recent': 'Gần đây',
    'dashboard.quick-actions': 'Hành động nhanh',
    'dashboard.notifications': 'Thông báo',
    
    // Labs
    'labs.title': 'Phòng thí nghiệm',
    'labs.physics': 'Vật lý',
    'labs.chemistry': 'Hóa học',
    'labs.biology': 'Sinh học',
    'labs.mathematics': 'Toán học',
    'labs.start-experiment': 'Bắt đầu thí nghiệm',
    'labs.experiment-complete': 'Hoàn thành thí nghiệm',
    'labs.results': 'Kết quả',
    'labs.data': 'Dữ liệu',
    'labs.graphs': 'Biểu đồ',
    'labs.export': 'Xuất dữ liệu',
    
    // Physics Motion Lab
    'physics-motion.title': 'Chuyển động vật lý',
    'physics-motion.free-fall': 'Rơi tự do',
    'physics-motion.projectile': 'Chuyển động ném ngang',
    'physics-motion.harmonic': 'Dao động điều hòa',
    'physics-motion.controls': 'Điều khiển',
    'physics-motion.visualization': 'Hình ảnh',
    'physics-motion.graph': 'Biểu đồ',
    'physics-motion.info': 'Thông tin',
    'physics-motion.play': 'Phát',
    'physics-motion.pause': 'Tạm dừng',
    'physics-motion.reset': 'Đặt lại',
    'physics-motion.initial-height': 'Độ cao ban đầu',
    'physics-motion.initial-velocity': 'Vận tốc ban đầu',
    'physics-motion.gravity': 'Gia tốc trọng trường',
    'physics-motion.time': 'Thời gian',
    'physics-motion.distance': 'Khoảng cách',
    'physics-motion.velocity': 'Vận tốc',
    'physics-motion.acceleration': 'Gia tốc',
    
    // Emotion Tracker
    'emotion.title': 'Theo dõi cảm xúc',
    'emotion.mood': 'Tâm trạng',
    'emotion.energy': 'Năng lượng',
    'emotion.motivation': 'Động lực',
    'emotion.stress': 'Căng thẳng',
    'emotion.happy': 'Vui vẻ',
    'emotion.focused': 'Tập trung',
    'emotion.stressed': 'Căng thẳng',
    'emotion.motivated': 'Có động lực',
    'emotion.heart-map': 'Bản đồ cảm xúc',
    'emotion.classroom': 'Lớp học',
    'emotion.students': 'Học sinh',
    'emotion.teacher': 'Giáo viên',
    
    // Vision Tracker
    'vision.title': 'Theo dõi thị giác',
    'vision.attention': 'Sự chú ý',
    'vision.focus': 'Tập trung',
    'vision.eye-movement': 'Chuyển động mắt',
    'vision.posture': 'Tư thế',
    'vision.engagement': 'Tham gia',
    'vision.monitoring': 'Giám sát',
    'vision.analysis': 'Phân tích',
    
    // Analytics
    'analytics.title': 'Phân tích',
    'analytics.performance': 'Hiệu suất',
    'analytics.progress': 'Tiến độ',
    'analytics.trends': 'Xu hướng',
    'analytics.reports': 'Báo cáo',
    'analytics.export': 'Xuất báo cáo',
    'analytics.date-range': 'Khoảng thời gian',
    'analytics.filters': 'Bộ lọc',
    
    // Achievements
    'achievements.title': 'Thành tích',
    'achievements.badges': 'Huy hiệu',
    'achievements.points': 'Điểm',
    'achievements.level': 'Cấp độ',
    'achievements.unlocked': 'Đã mở khóa',
    'achievements.locked': 'Chưa mở khóa',
    'achievements.progress': 'Tiến độ',
    
    // Settings
    'settings.title': 'Cài đặt',
    'settings.profile': 'Hồ sơ',
    'settings.account': 'Tài khoản',
    'settings.preferences': 'Tùy chọn',
    'settings.privacy': 'Quyền riêng tư',
    'settings.security': 'Bảo mật',
    'settings.notifications': 'Thông báo',
    'settings.language': 'Ngôn ngữ',
    'settings.theme': 'Giao diện',
    
    // Forms
    'form.name': 'Tên',
    'form.email': 'Email',
    'form.password': 'Mật khẩu',
    'form.confirm-password': 'Xác nhận mật khẩu',
    'form.phone': 'Số điện thoại',
    'form.address': 'Địa chỉ',
    'form.birthday': 'Ngày sinh',
    'form.gender': 'Giới tính',
    'form.male': 'Nam',
    'form.female': 'Nữ',
    'form.other': 'Khác',
    
    // Messages
    'message.success': 'Thành công!',
    'message.error': 'Có lỗi xảy ra!',
    'message.warning': 'Cảnh báo!',
    'message.info': 'Thông tin',
    'message.confirm-delete': 'Bạn có chắc chắn muốn xóa?',
    'message.unsaved-changes': 'Bạn có thay đổi chưa được lưu.',
    'message.login-success': 'Đăng nhập thành công!',
    'message.logout-success': 'Đăng xuất thành công!',
    'message.register-success': 'Đăng ký thành công!',
    
    // Time & Date
    'time.today': 'Hôm nay',
    'time.yesterday': 'Hôm qua',
    'time.tomorrow': 'Ngày mai',
    'time.this-week': 'Tuần này',
    'time.last-week': 'Tuần trước',
    'time.this-month': 'Tháng này',
    'time.last-month': 'Tháng trước',
    'time.this-year': 'Năm nay',
    'time.last-year': 'Năm ngoái',
    
    // Units
    'unit.meter': 'mét',
    'unit.second': 'giây',
    'unit.minute': 'phút',
    'unit.hour': 'giờ',
    'unit.day': 'ngày',
    'unit.week': 'tuần',
    'unit.month': 'tháng',
    'unit.year': 'năm',
    'unit.percent': 'phần trăm',
    'unit.degree': 'độ',
    'unit.radian': 'radian',
    
    // Status
    'status.active': 'Hoạt động',
    'status.inactive': 'Không hoạt động',
    'status.pending': 'Đang chờ',
    'status.completed': 'Hoàn thành',
    'status.failed': 'Thất bại',
    'status.cancelled': 'Đã hủy',
    'status.draft': 'Bản nháp',
    'status.published': 'Đã xuất bản',
    
    // Language Switcher
    'language.vietnamese': 'Tiếng Việt',
    'language.english': 'English',
    'language.switch': 'Chuyển đổi ngôn ngữ',
    
    // Homepage
    'home.title': 'AeroEdu - Nền tảng học tập tương tác',
    'home.subtitle': 'Nền tảng học tập đổi mới với phòng thí nghiệm ảo và tạo nội dung AI',
    'home.features': 'Tính năng',
    'home.about': 'Giới thiệu',
    'home.contact': 'Liên hệ',
    'home.get-started': 'Bắt đầu',
    'home.learn-more': 'Tìm hiểu thêm',
    
    // Footer
    'footer.company': 'Công ty',
    'footer.products': 'Sản phẩm',
    'footer.support': 'Hỗ trợ',
    'footer.legal': 'Pháp lý',
    'footer.copyright': 'Bản quyền',
    'footer.privacy': 'Chính sách riêng tư',
    'footer.terms': 'Điều khoản sử dụng',
    'footer.cookies': 'Cookie',
  },
  
  en: {
    // Navigation & Layout
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.labs': 'Laboratory',
    'nav.analytics': 'Analytics',
    'nav.achievements': 'Achievements',
    'nav.settings': 'Settings',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'nav.register': 'Register',
    
    // Common Actions
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.remove': 'Remove',
    'common.submit': 'Submit',
    'common.reset': 'Reset',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.close': 'Close',
    'common.open': 'Open',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Information',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome',
    'dashboard.overview': 'Overview',
    'dashboard.stats': 'Statistics',
    'dashboard.recent': 'Recent',
    'dashboard.quick-actions': 'Quick Actions',
    'dashboard.notifications': 'Notifications',
    
    // Labs
    'labs.title': 'Laboratory',
    'labs.physics': 'Physics',
    'labs.chemistry': 'Chemistry',
    'labs.biology': 'Biology',
    'labs.mathematics': 'Mathematics',
    'labs.start-experiment': 'Start Experiment',
    'labs.experiment-complete': 'Experiment Complete',
    'labs.results': 'Results',
    'labs.data': 'Data',
    'labs.graphs': 'Graphs',
    'labs.export': 'Export Data',
    
    // Physics Motion Lab
    'physics-motion.title': 'Physics Motion',
    'physics-motion.free-fall': 'Free Fall',
    'physics-motion.projectile': 'Projectile Motion',
    'physics-motion.harmonic': 'Harmonic Motion',
    'physics-motion.controls': 'Controls',
    'physics-motion.visualization': 'Visualization',
    'physics-motion.graph': 'Graph',
    'physics-motion.info': 'Information',
    'physics-motion.play': 'Play',
    'physics-motion.pause': 'Pause',
    'physics-motion.reset': 'Reset',
    'physics-motion.initial-height': 'Initial Height',
    'physics-motion.initial-velocity': 'Initial Velocity',
    'physics-motion.gravity': 'Gravity',
    'physics-motion.time': 'Time',
    'physics-motion.distance': 'Distance',
    'physics-motion.velocity': 'Velocity',
    'physics-motion.acceleration': 'Acceleration',
    
    // Emotion Tracker
    'emotion.title': 'Emotion Tracker',
    'emotion.mood': 'Mood',
    'emotion.energy': 'Energy',
    'emotion.motivation': 'Motivation',
    'emotion.stress': 'Stress',
    'emotion.happy': 'Happy',
    'emotion.focused': 'Focused',
    'emotion.stressed': 'Stressed',
    'emotion.motivated': 'Motivated',
    'emotion.heart-map': 'Heart Map',
    'emotion.classroom': 'Classroom',
    'emotion.students': 'Students',
    'emotion.teacher': 'Teacher',
    
    // Vision Tracker
    'vision.title': 'Vision Tracker',
    'vision.attention': 'Attention',
    'vision.focus': 'Focus',
    'vision.eye-movement': 'Eye Movement',
    'vision.posture': 'Posture',
    'vision.engagement': 'Engagement',
    'vision.monitoring': 'Monitoring',
    'vision.analysis': 'Analysis',
    
    // Analytics
    'analytics.title': 'Analytics',
    'analytics.performance': 'Performance',
    'analytics.progress': 'Progress',
    'analytics.trends': 'Trends',
    'analytics.reports': 'Reports',
    'analytics.export': 'Export Report',
    'analytics.date-range': 'Date Range',
    'analytics.filters': 'Filters',
    
    // Achievements
    'achievements.title': 'Achievements',
    'achievements.badges': 'Badges',
    'achievements.points': 'Points',
    'achievements.level': 'Level',
    'achievements.unlocked': 'Unlocked',
    'achievements.locked': 'Locked',
    'achievements.progress': 'Progress',
    
    // Settings
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.account': 'Account',
    'settings.preferences': 'Preferences',
    'settings.privacy': 'Privacy',
    'settings.security': 'Security',
    'settings.notifications': 'Notifications',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    
    // Forms
    'form.name': 'Name',
    'form.email': 'Email',
    'form.password': 'Password',
    'form.confirm-password': 'Confirm Password',
    'form.phone': 'Phone',
    'form.address': 'Address',
    'form.birthday': 'Birthday',
    'form.gender': 'Gender',
    'form.male': 'Male',
    'form.female': 'Female',
    'form.other': 'Other',
    
    // Messages
    'message.success': 'Success!',
    'message.error': 'An error occurred!',
    'message.warning': 'Warning!',
    'message.info': 'Information',
    'message.confirm-delete': 'Are you sure you want to delete?',
    'message.unsaved-changes': 'You have unsaved changes.',
    'message.login-success': 'Login successful!',
    'message.logout-success': 'Logout successful!',
    'message.register-success': 'Registration successful!',
    
    // Time & Date
    'time.today': 'Today',
    'time.yesterday': 'Yesterday',
    'time.tomorrow': 'Tomorrow',
    'time.this-week': 'This Week',
    'time.last-week': 'Last Week',
    'time.this-month': 'This Month',
    'time.last-month': 'Last Month',
    'time.this-year': 'This Year',
    'time.last-year': 'Last Year',
    
    // Units
    'unit.meter': 'meter',
    'unit.second': 'second',
    'unit.minute': 'minute',
    'unit.hour': 'hour',
    'unit.day': 'day',
    'unit.week': 'week',
    'unit.month': 'month',
    'unit.year': 'year',
    'unit.percent': 'percent',
    'unit.degree': 'degree',
    'unit.radian': 'radian',
    
    // Status
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.pending': 'Pending',
    'status.completed': 'Completed',
    'status.failed': 'Failed',
    'status.cancelled': 'Cancelled',
    'status.draft': 'Draft',
    'status.published': 'Published',
    
    // Language Switcher
    'language.vietnamese': 'Tiếng Việt',
    'language.english': 'English',
    'language.switch': 'Switch Language',
    
    // Homepage
    'home.title': 'AeroEdu - Interactive Learning Platform',
    'home.subtitle': 'An innovative learning platform with virtual labs and AI-powered content generation',
    'home.features': 'Features',
    'home.about': 'About',
    'home.contact': 'Contact',
    'home.get-started': 'Get Started',
    'home.learn-more': 'Learn More',
    
    // Footer
    'footer.company': 'Company',
    'footer.products': 'Products',
    'footer.support': 'Support',
    'footer.legal': 'Legal',
    'footer.copyright': 'Copyright',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.cookies': 'Cookie Policy',
  }
};

// Function to update LanguageContext with comprehensive translations
function updateLanguageContext() {
  const contextPath = path.join(process.cwd(), 'contexts/LanguageContext.tsx');
  
  try {
    let content = fs.readFileSync(contextPath, 'utf8');
    
    // Find the translations object and replace it
    const startPattern = /const translations = \{/;
    const endPattern = /\};/;
    
    const startMatch = content.match(startPattern);
    if (!startMatch) {
      console.log('❌ Could not find translations object in LanguageContext');
      return false;
    }
    
    const startIndex = startMatch.index;
    let braceCount = 0;
    let endIndex = startIndex;
    
    // Find the end of the translations object
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }
    
    // Replace the translations object
    const beforeTranslations = content.slice(0, startIndex);
    const afterTranslations = content.slice(endIndex + 1);
    
    const newTranslations = `const translations = ${JSON.stringify(comprehensiveTranslations, null, 2)}`;
    
    content = beforeTranslations + newTranslations + afterTranslations;
    
    fs.writeFileSync(contextPath, content);
    console.log('✅ Updated LanguageContext with comprehensive translations');
    return true;
    
  } catch (error) {
    console.error('❌ Error updating LanguageContext:', error.message);
    return false;
  }
}

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

    // Add useLanguage import
    if (!content.includes("import { useLanguage }")) {
      const importMatch = content.match(/import.*from.*['"];?\n/);
      if (importMatch) {
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

// Main execution
console.log('🌍 Creating comprehensive bilingual system...\n');

// Step 1: Update LanguageContext
console.log('📝 Step 1: Updating LanguageContext with comprehensive translations...');
const contextUpdated = updateLanguageContext();

if (contextUpdated) {
  console.log('✅ LanguageContext updated successfully\n');
} else {
  console.log('❌ Failed to update LanguageContext\n');
  process.exit(1);
}

// Step 2: Add translations to key pages
console.log('📝 Step 2: Adding translations to key pages...');

const keyPages = [
  'app/page.tsx',
  'app/(dashboard)/(routes)/dashboard/page.tsx',
  'app/(dashboard)/(routes)/dashboard/emotion/page.tsx',
  'app/(dashboard)/(routes)/dashboard/labtwin/labs/physics-motion/page.tsx',
  'app/(dashboard)/(routes)/dashboard/analytics/page.tsx',
  'app/(dashboard)/(routes)/dashboard/achievements/page.tsx',
];

let successCount = 0;
keyPages.forEach(page => {
  const fullPath = path.join(process.cwd(), page);
  if (addTranslationsToPage(fullPath)) {
    successCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`✅ LanguageContext updated: ${contextUpdated ? 'Yes' : 'No'}`);
console.log(`✅ Pages updated: ${successCount}/${keyPages.length}`);
console.log(`📄 Total translation keys: ${Object.keys(comprehensiveTranslations.vi).length}`);

console.log('\n🎉 Comprehensive bilingual system created!');
console.log('\n📝 Next steps:');
console.log('1. Test language switching on all pages');
console.log('2. Add more specific translations as needed');
console.log('3. Update UI components to use t() function');
console.log('4. Test with real content');
