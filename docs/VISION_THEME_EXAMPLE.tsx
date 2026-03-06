/**
 * Vision Tracker Theme - Complete Example Template
 *
 * Copy this template to create new pages with Vision Tracker theme
 * Replace content as needed but keep the structure
 */

'use client';

import React, { useState } from 'react';
import { BentoCard, MetricCard, ChartContainer, VisionButton } from '@/components/ui/vision-tracker';

export default function VisionThemeExamplePage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="vision-container">
      {/* Header Section */}
      <div className="vision-header">
        <h1>🎯 Tên Trang Của Bạn</h1>
        <p>Mô tả ngắn gọn về chức năng của trang</p>
        <div className="status-badge">
          <span className="status-dot"></span>
          <span>Đang Hoạt Động</span>
        </div>
      </div>

      {/* Main Content - Bento Grid */}
      <div className="bento-grid">
        {/* Large Main Content - 8 columns x 2 rows */}
        <BentoCard
          title="Nội Dung Chính"
          icon="📹"
          size="large"
        >
          <div style={{
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(145deg, #e0e5ec 0%, #d8dee8 100%)',
            borderRadius: '20px',
            padding: '20px'
          }}>
            <p className="text-gradient" style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              Nội dung chính ở đây (video, canvas, iframe, etc.)
            </p>
          </div>
        </BentoCard>

        {/* Medium Sidebar - 4 columns x 2 rows */}
        <BentoCard
          title="Thanh Bên"
          icon="📊"
          size="medium"
        >
          <div className="flex-center" style={{ flexDirection: 'column', gap: '20px', minHeight: '400px' }}>
            <VisionButton onClick={() => console.log('Clicked!')}>
              Hành Động 1
            </VisionButton>
            <VisionButton variant="secondary">
              Hành Động 2
            </VisionButton>
            <div className="info-badge">Thông tin phụ</div>
          </div>
        </BentoCard>

        {/* Small Metric Cards - 4 columns each */}
        <BentoCard
          title="Số Liệu 1"
          icon="🎯"
          size="small"
        >
          <MetricCard
            value="85%"
            label="Độ Chính Xác"
            size="medium"
          />
        </BentoCard>

        <BentoCard
          title="Số Liệu 2"
          icon="⚡"
          size="small"
        >
          <MetricCard
            value="1,234"
            label="Điểm Số"
            size="medium"
          />
        </BentoCard>

        <BentoCard
          title="Số Liệu 3"
          icon="🏆"
          size="small"
        >
          <MetricCard
            value="42"
            label="Xếp Hạng"
            size="medium"
          />
        </BentoCard>

        {/* Wide Chart Card 1 - 6 columns */}
        <BentoCard
          title="Biểu Đồ 1"
          icon="📈"
          size="wide"
          badge="Mới"
        >
          <ChartContainer minHeight={200}>
            <div className="flex-center" style={{ height: '200px' }}>
              <p style={{ color: '#718096' }}>Chart.js hoặc biểu đồ khác ở đây</p>
            </div>
          </ChartContainer>
        </BentoCard>

        {/* Wide Chart Card 2 - 6 columns */}
        <BentoCard
          title="Biểu Đồ 2"
          icon="📉"
          size="wide"
        >
          <ChartContainer minHeight={200}>
            <div className="flex-center" style={{ height: '200px' }}>
              <p style={{ color: '#718096' }}>Chart.js hoặc biểu đồ khác ở đây</p>
            </div>
          </ChartContainer>
        </BentoCard>

        {/* Full Width Activity Log - 12 columns */}
        <BentoCard
          title="Nhật Ký Hoạt Động"
          icon="📝"
          size="full"
        >
          <div className="activity-log">
            <div className="activity-item">
              [14:30] Người dùng đã đăng nhập vào hệ thống
            </div>
            <div className="activity-item">
              [14:15] Hoàn thành bài học: Toán học cơ bản
            </div>
            <div className="activity-item">
              [14:00] Bắt đầu bài kiểm tra: Vật lý 101
            </div>
            <div className="activity-item">
              [13:45] Nhận huy hiệu: Người Học Chăm Chỉ
            </div>
            <div className="activity-item">
              [13:30] Tham gia nhóm học tập: Hóa Học Nâng Cao
            </div>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}

/**
 * CUSTOMIZATION GUIDE
 * ====================
 *
 * 1. HEADER
 *    - Thay đổi emoji và tiêu đề trong <h1>
 *    - Cập nhật mô tả trong <p>
 *    - Điều chỉnh status badge nếu cần
 *
 * 2. BENTO GRID SIZES
 *    size="small"  - 4 columns (metric cards)
 *    size="medium" - 4 columns x 2 rows (sidebar)
 *    size="large"  - 8 columns x 2 rows (main content)
 *    size="wide"   - 6 columns (charts)
 *    size="full"   - 12 columns (activity log)
 *
 * 3. ICONS
 *    - Sử dụng emoji (🎯, 📊, 📈) hoặc
 *    - Import Lucide icons và render trong icon prop
 *
 * 4. COLORS
 *    - Gradient tím tự động từ CSS variables
 *    - Sử dụng .text-gradient cho text màu gradient
 *    - Background neumorphic tự động
 *
 * 5. RESPONSIVE
 *    - Grid tự động điều chỉnh:
 *      Desktop: 12 columns
 *      Tablet: 6 columns
 *      Mobile: 1 column
 *
 * 6. ANIMATIONS
 *    - fadeIn: Header và grid tự động
 *    - slideIn: Activity items tự động
 *    - hover: Cards và buttons tự động
 *    - pulse: Status dot tự động
 */

/**
 * COMMON PATTERNS
 * ================
 *
 * 1. Simple Metric Display:
 *    <BentoCard title="Users" icon="👥" size="small">
 *      <MetricCard value="1,234" label="Total Users" />
 *    </BentoCard>
 *
 * 2. Chart with Container:
 *    <BentoCard title="Analytics" icon="📊" size="wide">
 *      <ChartContainer>
 *        <canvas id="myChart"></canvas>
 *      </ChartContainer>
 *    </BentoCard>
 *
 * 3. Action Buttons:
 *    <BentoCard title="Actions" icon="⚙️" size="small">
 *      <VisionButton onClick={handleAction}>
 *        Start
 *      </VisionButton>
 *    </BentoCard>
 *
 * 4. Activity Feed:
 *    <BentoCard title="Recent" icon="📝" size="full">
 *      <div className="activity-log">
 *        {items.map(item => (
 *          <div key={item.id} className="activity-item">
 *            [{item.time}] {item.text}
 *          </div>
 *        ))}
 *      </div>
 *    </BentoCard>
 *
 * 5. Info Badge:
 *    <BentoCard
 *      title="Feature"
 *      icon="✨"
 *      size="wide"
 *      badge="New"
 *    >
 *      Content...
 *    </BentoCard>
 */

/**
 * GRID LAYOUT EXAMPLES
 * =====================
 *
 * Example 1: Video + Sidebar + Metrics
 * [  Video (8)   ] [ Sidebar (4) ]
 * [  Video (8)   ] [ Sidebar (4) ]
 * [ Metric ] [ Metric ] [ Metric ]
 *
 * Example 2: Dashboard Overview
 * [ Metric ] [ Metric ] [ Metric ]
 * [  Chart (6)   ] [  Chart (6)   ]
 * [      Activity Log (12)        ]
 *
 * Example 3: Analytics Page
 * [    Main Chart (12)            ]
 * [  Chart (6)   ] [  Chart (6)   ]
 * [ Metric ] [ Metric ] [ Metric ]
 *
 * Số trong ngoặc = số columns (total 12)
 */
