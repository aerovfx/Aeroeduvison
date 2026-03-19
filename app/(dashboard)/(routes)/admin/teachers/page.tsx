'use client';

import { useState, useEffect } from 'react';
import {
  Users, Award, Calendar, TrendingUp, Sparkles, BarChart3,
  Bell, Search, Plus, Edit, Trash2, Eye, Mail, Phone,
  Briefcase, GraduationCap, Star, Clock, CheckCircle, AlertCircle,
  FileText, Download, Upload, Settings, Shield, UserCheck
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================
// Types
// ============================================================

type TeacherTab = 'profiles' | 'licensing' | 'scheduling' | 'performance' | 'ai-recommendations' | 'analytics';

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  specialization: string;
  position: string;
  status: 'active' | 'inactive' | 'on_leave';
  avatar?: string;
  hireDate: string;
  totalStudents: number;
  avgXPGain: number;
  feedbackScore: number;
  responseTime: number;
  interventions: number;
}

interface License {
  id: string;
  teacherId: string;
  teacherName: string;
  type: 'teaching_certificate' | 'specialization' | 'cme' | 'methodology';
  name: string;
  issueDate: string;
  expiryDate: string;
  status: 'valid' | 'expiring_soon' | 'expired';
  issuingAuthority: string;
}

interface Schedule {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'evening';
  classes: string[];
  isOverloaded: boolean;
}

interface Performance {
  teacherId: string;
  teacherName: string;
  kpis: {
    studentXPGain: number;
    feedbackScore: number;
    responseTime: number;
    interventionCount: number;
    classCompletionRate: number;
  };
  overall: number;
  trend: 'improving' | 'stable' | 'declining';
}

// ============================================================
// AI Native Components
// ============================================================

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-panel rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function AIBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const variants = {
    default: 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] border-[hsl(var(--primary)/0.3)]',
    success: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)]',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]',
    danger: 'bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.3)]',
    info: 'bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))] border-[hsl(var(--info)/0.3)]',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${variants[variant]}`}>
      {children}
    </span>
  );
}

function AIButton({
  children, onClick, variant = 'default', size = 'default', disabled = false, className = '',
}: {
  children: React.ReactNode; onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  size?: 'default' | 'sm' | 'icon';
  disabled?: boolean; className?: string;
}) {
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'icon' ? 'p-2.5' : 'px-4 py-2.5';
  const variantClass =
    variant === 'primary' ? 'ai-button-primary text-white' :
    variant === 'danger' ? 'bg-[hsl(var(--destructive))] text-white border-none hover:opacity-90' :
    variant === 'success' ? 'bg-[hsl(var(--success))] text-white border-none hover:opacity-90' :
    'ai-button text-[hsl(var(--foreground))] hover:bg-white/10';
  return (
    <button
      type="button" onClick={onClick} disabled={disabled}
      className={`${sizeClass} ${variantClass} ${className} rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function AdminTeachersPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TeacherTab>('profiles');
  const [searchQuery, setSearchQuery] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  useEffect(() => {
    // Load teachers
    setTeachers([
      {
        id: 't1', name: 'Nguyễn Thị Lan', email: 'lan.nguyen@aeroedu.vn', phone: '+84 123-456-7890',
        department: 'Toán học', specialization: 'Đại số & Giải tích', position: 'Giáo viên chính',
        status: 'active', hireDate: '2020-09-01', totalStudents: 120, avgXPGain: 245,
        feedbackScore: 9.2, responseTime: 2.3, interventions: 12,
      },
      {
        id: 't2', name: 'Trần Văn Minh', email: 'minh.tran@aeroedu.vn', phone: '+84 123-456-7891',
        department: 'Vật lý', specialization: 'Cơ học & Điện tử', position: 'Tổ trưởng',
        status: 'active', hireDate: '2019-09-01', totalStudents: 95, avgXPGain: 198,
        feedbackScore: 8.5, responseTime: 4.5, interventions: 8,
      },
      {
        id: 't3', name: 'Lê Thị Hoa', email: 'hoa.le@aeroedu.vn', phone: '+84 123-456-7892',
        department: 'Hóa học', specialization: 'Hóa hữu cơ', position: 'Giáo viên chính',
        status: 'active', hireDate: '2021-09-01', totalStudents: 110, avgXPGain: 278,
        feedbackScore: 9.5, responseTime: 1.8, interventions: 15,
      },
      {
        id: 't4', name: 'Phạm Văn Đức', email: 'duc.pham@aeroedu.vn', phone: '+84 123-456-7893',
        department: 'Ngữ văn', specialization: 'Văn học Việt Nam', position: 'Giáo viên',
        status: 'on_leave', hireDate: '2022-09-01', totalStudents: 85, avgXPGain: 165,
        feedbackScore: 7.8, responseTime: 6.2, interventions: 5,
      },
    ]);

    setLicenses([
      {
        id: 'l1', teacherId: 't1', teacherName: 'Nguyễn Thị Lan', type: 'teaching_certificate',
        name: 'Chứng chỉ Nghiệp vụ Sư phạm', issueDate: '2020-06-15', expiryDate: '2025-06-15',
        status: 'valid', issuingAuthority: 'Bộ GD&ĐT',
      },
      {
        id: 'l2', teacherId: 't2', teacherName: 'Trần Văn Minh', type: 'cme',
        name: 'CME Vật lý Hiện đại', issueDate: '2023-01-10', expiryDate: '2024-01-10',
        status: 'expiring_soon', issuingAuthority: 'ĐH Sư phạm',
      },
      {
        id: 'l3', teacherId: 't3', teacherName: 'Lê Thị Hoa', type: 'specialization',
        name: 'Chuyên gia Hóa học', issueDate: '2021-08-20', expiryDate: '2026-08-20',
        status: 'valid', issuingAuthority: 'Bộ GD&ĐT',
      },
    ]);

    setSchedules([
      {
        id: 's1', teacherId: 't1', teacherName: 'Nguyễn Thị Lan', date: '2024-10-21',
        shift: 'morning', classes: ['9A1', '9A2', '10B1'], isOverloaded: false,
      },
      {
        id: 's2', teacherId: 't2', teacherName: 'Trần Văn Minh', date: '2024-10-21',
        shift: 'afternoon', classes: ['11C1', '12D1', '10B2', '9A3'], isOverloaded: true,
      },
    ]);

    setLoading(false);
  }, []);

  const tabs = [
    { id: 'profiles' as TeacherTab, label: 'Hồ Sơ Giáo Viên', icon: Users, description: 'Quản lý thông tin, năng lực, lịch sử công tác' },
    { id: 'licensing' as TeacherTab, label: 'Chứng Chỉ & Giấy Phép', icon: Award, description: 'Theo dõi CCHN, CME, quyền chuyên môn' },
    { id: 'scheduling' as TeacherTab, label: 'Phân Ca & Lịch Dạy', icon: Calendar, description: 'Lịch dạy, phân ca tự động, cảnh báo quá tải' },
    { id: 'performance' as TeacherTab, label: 'Hiệu Suất & KPI', icon: TrendingUp, description: 'Đánh giá chuyên môn, XP gain, phản hồi' },
    { id: 'ai-recommendations' as TeacherTab, label: 'AI Đề Xuất', icon: Sparkles, description: 'Gợi ý phân công, dự đoán quá tải, tối ưu' },
    { id: 'analytics' as TeacherTab, label: 'Phân Tích Tổng Quan', icon: BarChart3, description: 'Dashboard cho lãnh đạo, thống kê' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <AIBadge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Đang làm việc</AIBadge>;
      case 'inactive': return <AIBadge variant="danger">Nghỉ việc</AIBadge>;
      case 'on_leave': return <AIBadge variant="warning"><Clock className="w-3 h-3 mr-1" /> Nghỉ phép</AIBadge>;
      default: return <AIBadge>Không xác định</AIBadge>;
    }
  };

  const getLicenseStatusBadge = (status: string) => {
    switch (status) {
      case 'valid': return <AIBadge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Hiệu lực</AIBadge>;
      case 'expiring_soon': return <AIBadge variant="warning"><AlertCircle className="w-3 h-3 mr-1" /> Sắp hết hạn</AIBadge>;
      case 'expired': return <AIBadge variant="danger"><AlertCircle className="w-3 h-3 mr-1" /> Hết hạn</AIBadge>;
      default: return <AIBadge>Không xác định</AIBadge>;
    }
  };

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ============================================================
  // RENDER TABS
  // ============================================================

  const renderProfilesTab = () => (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Tìm kiếm giáo viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ai-input w-full pl-12 pr-4 py-2.5 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          <AIButton variant="primary">
            <Plus className="w-4 h-4" /> Thêm giáo viên
          </AIButton>
          <AIButton>
            <Download className="w-4 h-4" /> Xuất danh sách
          </AIButton>
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTeachers.map((teacher) => (
          <GlassCard key={teacher.id} className="transition-all hover:border-[hsl(var(--primary)/0.3)] hover:shadow-[var(--glow-primary)]">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white text-xl font-bold shadow-[var(--glow-primary)]">
                {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">{teacher.name}</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{teacher.position} • {teacher.department}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{teacher.specialization}</p>
                  </div>
                  {getStatusBadge(teacher.status)}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <Mail className="w-3 h-3" /> {teacher.email}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <Phone className="w-3 h-3" /> {teacher.phone}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center p-2 rounded-xl bg-[hsl(var(--muted))/20]">
                    <Users className="w-4 h-4 text-[hsl(var(--primary))] mx-auto mb-1" />
                    <p className="text-sm font-bold text-[hsl(var(--foreground))]">{teacher.totalStudents}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Học sinh</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-[hsl(var(--muted))/20]">
                    <TrendingUp className="w-4 h-4 text-[hsl(var(--success))] mx-auto mb-1" />
                    <p className="text-sm font-bold text-[hsl(var(--foreground))]">{teacher.avgXPGain}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">XP TB</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-[hsl(var(--muted))/20]">
                    <Star className="w-4 h-4 text-[hsl(var(--warning))] mx-auto mb-1" />
                    <p className="text-sm font-bold text-[hsl(var(--foreground))]">{teacher.feedbackScore}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Đánh giá</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-[hsl(var(--muted))/20]">
                    <Clock className="w-4 h-4 text-[hsl(var(--info))] mx-auto mb-1" />
                    <p className="text-sm font-bold text-[hsl(var(--foreground))]">{teacher.responseTime}h</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Phản hồi</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <AIButton size="sm" variant="default">
                    <Eye className="w-3 h-3" /> Xem chi tiết
                  </AIButton>
                  <AIButton size="sm" variant="default">
                    <Edit className="w-3 h-3" /> Sửa
                  </AIButton>
                  <AIButton size="sm" variant="danger">
                    <Trash2 className="w-3 h-3" /> Xóa
                  </AIButton>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const renderLicensingTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Danh sách chứng chỉ & giấy phép</h2>
        <AIButton variant="primary">
          <Plus className="w-4 h-4" /> Thêm chứng chỉ
        </AIButton>
      </div>
      <div className="space-y-3">
        {licenses.map((license) => (
          <GlassCard key={license.id} className="transition-all hover:border-[hsl(var(--primary)/0.3)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-[var(--glow-primary)]">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-[hsl(var(--foreground))]">{license.name}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{license.teacherName} • {license.issuingAuthority}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    <span>Cấp: {new Date(license.issueDate).toLocaleDateString('vi-VN')}</span>
                    <span>Hết hạn: {new Date(license.expiryDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getLicenseStatusBadge(license.status)}
                <AIButton size="sm">
                  <Edit className="w-3 h-3" />
                </AIButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const renderSchedulingTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Lịch dạy & Phân ca</h2>
        <AIButton variant="primary">
          <Plus className="w-4 h-4" /> Tạo lịch mới
        </AIButton>
      </div>
      <div className="space-y-3">
        {schedules.map((schedule) => (
          <GlassCard key={schedule.id} className={`transition-all ${schedule.isOverloaded ? 'border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.05)]' : 'hover:border-[hsl(var(--primary)/0.3)]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-[hsl(var(--foreground))]">{schedule.teacherName}</h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {new Date(schedule.date).toLocaleDateString('vi-VN')} • {schedule.shift === 'morning' ? 'Sáng' : schedule.shift === 'afternoon' ? 'Chiều' : 'Tối'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {schedule.classes.map((cls, i) => (
                      <AIBadge key={i} variant="info">{cls}</AIBadge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {schedule.isOverloaded && (
                  <AIBadge variant="warning">
                    <AlertCircle className="w-3 h-3 mr-1" /> Quá tải
                  </AIBadge>
                )}
                <AIButton size="sm" variant="default">
                  <Edit className="w-3 h-3" />
                </AIButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Hiệu suất & KPI giáo viên</h2>
      <div className="grid grid-cols-1 gap-4">
        {teachers.map((teacher) => {
          const overall = Math.round((teacher.avgXPGain / 300 * 40 + teacher.feedbackScore * 4 + (10 - teacher.responseTime) * 2) / 3);
          const trend: 'improving' | 'stable' | 'declining' = teacher.avgXPGain > 200 ? 'improving' : teacher.avgXPGain > 150 ? 'stable' : 'declining';
          return (
            <GlassCard key={teacher.id} className="transition-all hover:border-[hsl(var(--primary)/0.3)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white text-lg font-bold shadow-[var(--glow-primary)]">
                    {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">{teacher.name}</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">{teacher.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--secondary))] bg-clip-text text-transparent">{overall}/100</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Điểm tổng thể</p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <div className="text-center p-3 rounded-xl bg-[hsl(var(--muted))/20]">
                  <TrendingUp className="w-5 h-5 text-[hsl(var(--success))] mx-auto mb-2" />
                  <p className="text-lg font-bold text-[hsl(var(--foreground))]">{teacher.avgXPGain}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">XP TB</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-[hsl(var(--muted))/20]">
                  <Star className="w-5 h-5 text-[hsl(var(--warning))] mx-auto mb-2" />
                  <p className="text-lg font-bold text-[hsl(var(--foreground))]">{teacher.feedbackScore}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Đánh giá</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-[hsl(var(--muted))/20]">
                  <Clock className="w-5 h-5 text-[hsl(var(--info))] mx-auto mb-2" />
                  <p className="text-lg font-bold text-[hsl(var(--foreground))]">{teacher.responseTime}h</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Phản hồi</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-[hsl(var(--muted))/20]">
                  <Users className="w-5 h-5 text-[hsl(var(--primary))] mx-auto mb-2" />
                  <p className="text-lg font-bold text-[hsl(var(--foreground))]">{teacher.interventions}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Tương tác</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-[hsl(var(--muted))/20]">
                  <Briefcase className="w-5 h-5 text-[hsl(var(--secondary))] mx-auto mb-2" />
                  <p className="text-lg font-bold text-[hsl(var(--foreground))]">{teacher.totalStudents}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Học sinh</p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );

  const renderAIRecommendationsTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-[hsl(var(--primary))]" />
        AI Đề Xuất & Cảnh Báo
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.05)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-[hsl(var(--warning))] shrink-0" />
            <div>
              <h3 className="font-bold text-[hsl(var(--foreground))] mb-1">Quá tải lịch dạy</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Giáo viên <span className="font-semibold text-[hsl(var(--foreground))]">Trần Văn Minh</span> đang dạy 4 lớp/ca, vượt quá ngưỡng khuyến nghị (3 lớp/ca).
              </p>
              <div className="flex gap-2 mt-3">
                <AIButton size="sm" variant="primary">Tái phân công</AIButton>
                <AIButton size="sm">Bỏ qua</AIButton>
              </div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="border-[hsl(var(--info)/0.3)] bg-[hsl(var(--info)/0.05)]">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-[hsl(var(--info))] shrink-0" />
            <div>
              <h3 className="font-bold text-[hsl(var(--foreground))] mb-1">Giáo viên xuất sắc</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                <span className="font-semibold text-[hsl(var(--foreground))]">Lê Thị Hoa</span> đạt 9.5/10 đánh giá và 278 XP trung bình. Đề xuất khen thưởng.
              </p>
              <div className="flex gap-2 mt-3">
                <AIButton size="sm" variant="success">Khen thưởng</AIButton>
                <AIButton size="sm">Xem chi tiết</AIButton>
              </div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.05)]">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-[hsl(var(--success))] shrink-0" />
            <div>
              <h3 className="font-bold text-[hsl(var(--foreground))] mb-1">Tối ưu phân ca</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                AI đã tối ưu lịch dạy tuần sau, giảm 15% ca quá tải và tăng 8% hiệu suất tổng thể.
              </p>
              <div className="flex gap-2 mt-3">
                <AIButton size="sm" variant="primary">Áp dụng</AIButton>
                <AIButton size="sm">Xem chi tiết</AIButton>
              </div>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.05)]">
          <div className="flex items-start gap-3">
            <Bell className="w-6 h-6 text-[hsl(var(--destructive))] shrink-0" />
            <div>
              <h3 className="font-bold text-[hsl(var(--foreground))] mb-1">Chứng chỉ sắp hết hạn</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                3 giáo viên có chứng chỉ CME hết hạn trong 30 ngày tới. Cần gia hạn để duy trì hoạt động.
              </p>
              <div className="flex gap-2 mt-3">
                <AIButton size="sm" variant="primary">Nhắc nhở ngay</AIButton>
                <AIButton size="sm">Xem danh sách</AIButton>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Phân Tích Tổng Quan</h2>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="text-center">
          <Users className="w-8 h-8 text-[hsl(var(--primary))] mx-auto mb-2" />
          <p className="text-3xl font-bold text-[hsl(var(--foreground))]">{teachers.length}</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Tổng giáo viên</p>
        </GlassCard>
        <GlassCard className="text-center">
          <UserCheck className="w-8 h-8 text-[hsl(var(--success))] mx-auto mb-2" />
          <p className="text-3xl font-bold text-[hsl(var(--foreground))]">{teachers.filter(t => t.status === 'active').length}</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Đang làm việc</p>
        </GlassCard>
        <GlassCard className="text-center">
          <Star className="w-8 h-8 text-[hsl(var(--warning))] mx-auto mb-2" />
          <p className="text-3xl font-bold text-[hsl(var(--foreground))]">
            {Math.round(teachers.reduce((sum, t) => sum + t.feedbackScore, 0) / teachers.length * 10) / 10}
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Đánh giá TB</p>
        </GlassCard>
        <GlassCard className="text-center">
          <TrendingUp className="w-8 h-8 text-[hsl(var(--info))] mx-auto mb-2" />
          <p className="text-3xl font-bold text-[hsl(var(--foreground))]">
            {Math.round(teachers.reduce((sum, t) => sum + t.avgXPGain, 0) / teachers.length)}
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">XP TB</p>
        </GlassCard>
      </div>
      {/* Department Breakdown */}
      <GlassCard>
        <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-4">Phân bổ theo bộ môn</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Toán học', 'Vật lý', 'Hóa học', 'Ngữ văn'].map((dept) => {
            const count = teachers.filter(t => t.department === dept).length;
            return (
              <div key={dept} className="text-center p-4 rounded-xl bg-[hsl(var(--muted))/20]">
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{count}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{dept}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--card))] p-6">
      {/* AI Native Header */}
      <GlassCard className="mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] opacity-50" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-[var(--glow-primary)]">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Quản Lý Nhân Sự Giáo Viên</h1>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">AeroEdu HRM - Teacher Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-panel px-4 py-2 rounded-xl">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[hsl(var(--primary))]" />
                <span className="text-lg font-bold text-[hsl(var(--foreground))]">{teachers.length}</span>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Giáo viên</span>
              </div>
            </div>
            <div className="glass-panel px-4 py-2 rounded-xl">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[hsl(var(--warning))]" />
                <span className="text-lg font-bold text-[hsl(var(--foreground))]">3</span>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Cảnh báo</span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 flex items-center gap-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'ai-button-primary text-white shadow-[var(--glow-primary)]'
                  : 'ai-button text-[hsl(var(--foreground))] hover:bg-white/10'
              }`}
              title={tab.description}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[hsl(var(--primary))] animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'profiles' && renderProfilesTab()}
          {activeTab === 'licensing' && renderLicensingTab()}
          {activeTab === 'scheduling' && renderSchedulingTab()}
          {activeTab === 'performance' && renderPerformanceTab()}
          {activeTab === 'ai-recommendations' && renderAIRecommendationsTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
        </>
      )}
    </div>
  );
}

// Loading component
function Loader2({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
