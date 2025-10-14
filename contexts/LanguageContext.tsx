"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'vi' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Comprehensive translation keys
const translations = {
  vi: {
    // Admin Dashboard
    'admin.dashboard': 'Bảng điều khiển',
    'admin.users': 'Người dùng',
    'admin.courses': 'Khóa học',
    'admin.quiz': 'Quiz',
    'admin.assignments': 'Bài tập',
    'admin.video': 'Video',
    'admin.learning-path': 'Lộ trình học',
    'admin.live-chat': 'Live Chat',
    'admin.competition': 'Cuộc thi',
    'admin.stem': 'STEM Projects',
    'admin.calendar': 'Calendar',
    
    // Admin Dashboard Stats
    'admin.total-users': 'Tổng người dùng',
    'admin.total-courses': 'Khóa học',
    'admin.revenue': 'Doanh thu',
    'admin.active-modules': 'Module đang hoạt động',
    'admin.system-status': 'Trạng thái hệ thống',
    'admin.system-healthy': 'Hệ thống hoạt động tốt',
    'admin.system-warning': 'Cảnh báo hệ thống',
    'admin.system-critical': 'Hệ thống có vấn đề',
    'admin.published': 'đã xuất bản',
    'admin.draft': 'bản nháp',
    'admin.courses-sold': 'khóa học đã bán',
    'admin.from-students': 'từ {count} học sinh',
    
    // Teacher Dashboard
    'teacher.dashboard': 'Bảng điều khiển',
    'teacher.students': 'Học sinh',
    'teacher.courses': 'Khóa học',
    'teacher.assignments': 'Bài tập',
    'teacher.content': 'Nội dung',
    'teacher.quizzes': 'Quiz',
    'teacher.pending-grading': 'Chờ chấm điểm',
    'teacher.average-rating': 'Đánh giá trung bình',
    'teacher.new-this-month': 'mới trong tháng',
    'teacher.assignments-to-grade': 'Bài tập cần chấm',
    'teacher.all-courses': 'Tất cả khóa học',
    'teacher.from-students': 'Từ {count} học sinh',
    
    // Student Learning Interface
    'student.learning': 'Học tập',
    'student.lesson': 'Bài học',
    'student.progress': 'Tiến độ bài học',
    'student.xp': 'XP',
    'student.completed': 'Hoàn thành',
    'student.congratulations': 'Chúc mừng!',
    'student.lesson-completed': 'Bạn đã hoàn thành bài học!',
    'student.redirecting': 'Chuyển trang trong {seconds} giây...',
    'student.key-points': 'Điểm quan trọng',
    'student.example': 'Ví dụ',
    'student.practice': 'Bài tập',
    'student.check': 'Kiểm tra',
    'student.correct': 'Chính xác!',
    'student.incorrect': 'Chưa đúng',
    'student.answer': 'Đáp án đúng là',
    'student.next': 'Tiếp theo',
    'student.previous': 'Trước đó',
    'student.back': 'Quay lại',
    'student.finish': 'Hoàn thành',
    'student.dont-know': 'Không biết?',
    'student.lesson-of': 'Bài {current} của {total}',
    'student.subject': 'Toán học',
    'student.learning-path': 'Lộ trình học tập',
    'student.current-lesson': 'Bài học hiện tại',
    'student.progress': 'Tiến độ',
    'student.streak': 'Chuỗi ngày',
    'student.level': 'Cấp độ',
    'student.gems': 'Đá quý',
    'student.hearts': 'Trái tim',
    'student.start': 'Bắt đầu',
    'student.practice': 'Luyện tập',
    'student.quiz': 'Kiểm tra',
    'student.challenge': 'Thử thách',
    'student.treasure': 'Kho báu',
    'student.completed': 'Hoàn thành',
    'student.locked': 'Đã khóa',
    'student.current': 'Hiện tại',
    
    // Linear Equation Specific
    'linear.title': 'Phương trình bậc nhất',
    'linear.definition': 'Định nghĩa phương trình bậc nhất',
    'linear.definition-content': 'Phương trình bậc nhất một ẩn là phương trình có dạng: ax + b = 0 (với a ≠ 0)',
    'linear.definition-example': 'Ví dụ: 2x + 3 = 0, -5x + 7 = 0',
    'linear.method': 'Cách giải phương trình bậc nhất',
    'linear.method-content': 'Để giải phương trình ax + b = 0, ta chuyển b sang vế phải và chia cho a',
    'linear.method-example': 'ax + b = 0 → ax = -b → x = -b/a',
    'linear.example': 'Ví dụ cụ thể',
    'linear.example-content': 'Giải phương trình: 3x + 6 = 0',
    'linear.example-solution': '3x + 6 = 0 → 3x = -6 → x = -6/3 = -2',
    'linear.practice': 'Bài tập thực hành',
    'linear.practice-content': 'Giải phương trình: 2x - 4 = 0',
    'linear.practice-prompt': 'Hãy nhập đáp án của bạn:',
    'linear.practice-solution': '2x - 4 = 0 → 2x = 4 → x = 2',
    'linear.key-points': [
      'Phương trình bậc nhất có dạng ax + b = 0 (a ≠ 0)',
      'Nghiệm của phương trình là x = -b/a',
      'Luôn kiểm tra lại kết quả bằng cách thay vào phương trình gốc',
      'Nếu a = 0 và b ≠ 0 thì phương trình vô nghiệm'
    ],

    // Common
    'common.total': 'Tổng',
    'common.active': 'Hoạt động',
    'common.published': 'Đã xuất bản',
    'common.draft': 'Bản nháp',
    'common.revenue': 'Doanh thu',
    'common.rating': 'Đánh giá',
    'common.users': 'Người dùng',
    'common.students': 'Học sinh',
    'common.teachers': 'Giáo viên',
    'common.courses': 'Khóa học',
    'common.quizzes': 'Quiz',
    'common.assignments': 'Bài tập',
    'common.videos': 'Video',
    'common.sign-out': 'Đăng xuất',
    'common.language': 'Ngôn ngữ',
    'common.quantity': 'Số lượng',
    'common.type': 'Loại',
    'common.current': 'Hiện có',
    'common.items': 'mục',
    'common.paths': 'đường dẫn',
    'common.chats': 'cuộc trò chuyện',
    'common.competitions': 'cuộc thi',
    'common.projects': 'dự án',
    'common.events': 'sự kiện',
  },
  en: {
    // Admin Dashboard
    'admin.dashboard': 'Dashboard',
    'admin.users': 'Users',
    'admin.courses': 'Courses',
    'admin.quiz': 'Quiz',
    'admin.assignments': 'Assignments',
    'admin.video': 'Video',
    'admin.learning-path': 'Learning Path',
    'admin.live-chat': 'Live Chat',
    'admin.competition': 'Competition',
    'admin.stem': 'STEM Projects',
    'admin.calendar': 'Calendar',
    
    // Admin Dashboard Stats
    'admin.total-users': 'Total Users',
    'admin.total-courses': 'Courses',
    'admin.revenue': 'Revenue',
    'admin.active-modules': 'Active Modules',
    'admin.system-status': 'System Status',
    'admin.system-healthy': 'System Healthy',
    'admin.system-warning': 'System Warning',
    'admin.system-critical': 'System Critical',
    'admin.published': 'published',
    'admin.draft': 'draft',
    'admin.courses-sold': 'courses sold',
    'admin.from-students': 'from {count} students',
    
    // Teacher Dashboard
    'teacher.dashboard': 'Dashboard',
    'teacher.students': 'Students',
    'teacher.courses': 'Courses',
    'teacher.assignments': 'Assignments',
    'teacher.content': 'Content',
    'teacher.quizzes': 'Quizzes',
    'teacher.pending-grading': 'Pending Grading',
    'teacher.average-rating': 'Average Rating',
    'teacher.new-this-month': 'new this month',
    'teacher.assignments-to-grade': 'Assignments to grade',
    'teacher.all-courses': 'All courses',
    'teacher.from-students': 'From {count} students',
    
    // Student Learning Interface
    'student.learning': 'Learning',
    'student.lesson': 'Lesson',
    'student.progress': 'Lesson Progress',
    'student.xp': 'XP',
    'student.completed': 'Completed',
    'student.congratulations': 'Congratulations!',
    'student.lesson-completed': 'You have completed the lesson!',
    'student.redirecting': 'Redirecting in {seconds} seconds...',
    'student.key-points': 'Key Points',
    'student.example': 'Example',
    'student.practice': 'Practice',
    'student.check': 'Check',
    'student.correct': 'Correct!',
    'student.incorrect': 'Incorrect',
    'student.answer': 'The correct answer is',
    'student.next': 'Next',
    'student.previous': 'Previous',
    'student.back': 'Back',
    'student.finish': 'Finish',
    'student.dont-know': "Don't know?",
    'student.lesson-of': 'Lesson {current} of {total}',
    'student.subject': 'Mathematics',
    'student.learning-path': 'Learning Path',
    'student.current-lesson': 'Current Lesson',
    'student.progress': 'Progress',
    'student.streak': 'Streak',
    'student.level': 'Level',
    'student.gems': 'Gems',
    'student.hearts': 'Hearts',
    'student.start': 'Start',
    'student.practice': 'Practice',
    'student.quiz': 'Quiz',
    'student.challenge': 'Challenge',
    'student.treasure': 'Treasure',
    'student.completed': 'Completed',
    'student.locked': 'Locked',
    'student.current': 'Current',
    
    // Linear Equation Specific
    'linear.title': 'Linear Equations',
    'linear.definition': 'Definition of Linear Equations',
    'linear.definition-content': 'A linear equation in one variable is an equation of the form: ax + b = 0 (where a ≠ 0)',
    'linear.definition-example': 'Examples: 2x + 3 = 0, -5x + 7 = 0',
    'linear.method': 'How to Solve Linear Equations',
    'linear.method-content': 'To solve ax + b = 0, move b to the right side and divide by a',
    'linear.method-example': 'ax + b = 0 → ax = -b → x = -b/a',
    'linear.example': 'Specific Example',
    'linear.example-content': 'Solve the equation: 3x + 6 = 0',
    'linear.example-solution': '3x + 6 = 0 → 3x = -6 → x = -6/3 = -2',
    'linear.practice': 'Practice Exercise',
    'linear.practice-content': 'Solve the equation: 2x - 4 = 0',
    'linear.practice-prompt': 'Enter your answer:',
    'linear.practice-solution': '2x - 4 = 0 → 2x = 4 → x = 2',
    'linear.key-points': [
      'Linear equations have the form ax + b = 0 (a ≠ 0)',
      'The solution is x = -b/a',
      'Always check your answer by substituting back into the original equation',
      'If a = 0 and b ≠ 0, the equation has no solution'
    ],

    // Common
    'common.total': 'Total',
    'common.active': 'Active',
    'common.published': 'Published',
    'common.draft': 'Draft',
    'common.revenue': 'Revenue',
    'common.rating': 'Rating',
    'common.users': 'Users',
    'common.students': 'Students',
    'common.teachers': 'Teachers',
    'common.courses': 'Courses',
    'common.quizzes': 'Quizzes',
    'common.assignments': 'Assignments',
    'common.videos': 'Videos',
    'common.sign-out': 'Sign Out',
    'common.language': 'Language',
    'common.quantity': 'Quantity',
    'common.type': 'Type',
    'common.current': 'Current',
    'common.items': 'items',
    'common.paths': 'paths',
    'common.chats': 'chats',
    'common.competitions': 'competitions',
    'common.projects': 'projects',
    'common.events': 'events',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('vi');

  useEffect(() => {
    // Load language from localStorage
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language;
      if (savedLanguage && (savedLanguage === 'vi' || savedLanguage === 'en')) {
        setLanguage(savedLanguage);
      }
    }
  }, []);

  useEffect(() => {
    // Save language to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language);
    }
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'vi' ? 'en' : 'vi');
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[language][key as keyof typeof translations[typeof language]] || key;
    
    // Replace parameters in translation
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{${paramKey}}`, String(paramValue));
      });
    }
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}