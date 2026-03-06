// Script to populate localStorage with STEM projects data
// Run this in browser console on http://localhost:3000/admin/stem

const stemProjects = [
  {
    id: "stem_1",
    title: "Hệ thống AI hỗ trợ học toán",
    description: "Phát triển hệ thống AI để hỗ trợ học sinh học toán hiệu quả hơn",
    category: "Science",
    status: "in-progress",
    progress: 75,
    teamMembers: [
      { id: "student_1", name: "Nguyễn Thị Lan", role: "Leader" },
      { id: "student_2", name: "Trần Văn Hùng", role: "Developer" }
    ],
    milestones: [
      { id: "m1", title: "Research", status: "completed", description: "Nghiên cứu thuật toán AI" },
      { id: "m2", title: "Design", status: "completed", description: "Thiết kế hệ thống" },
      { id: "m3", title: "Development", status: "in-progress", description: "Phát triển prototype" },
      { id: "m4", title: "Testing", status: "locked", description: "Kiểm thử hệ thống" },
      { id: "m5", title: "Deployment", status: "locked", description: "Triển khai" },
      { id: "m6", title: "Documentation", status: "locked", description: "Viết tài liệu" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: "stem_2",
    title: "Robot dọn rác thông minh",
    description: "Chế tạo robot có khả năng nhận diện và thu gom rác thải tự động",
    category: "Engineering",
    status: "completed",
    progress: 100,
    teamMembers: [
      { id: "student_3", name: "Lê Thị Mai", role: "Leader" },
      { id: "student_4", name: "Phạm Văn Cường", role: "Engineer" }
    ],
    milestones: [
      { id: "m1", title: "Research", status: "completed", description: "Nghiên cứu công nghệ robot" },
      { id: "m2", title: "Design", status: "completed", description: "Thiết kế robot" },
      { id: "m3", title: "Development", status: "completed", description: "Chế tạo robot" },
      { id: "m4", title: "Testing", status: "completed", description: "Kiểm thử robot" },
      { id: "m5", title: "Deployment", status: "completed", description: "Triển khai thực tế" },
      { id: "m6", title: "Documentation", status: "completed", description: "Viết tài liệu" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: "stem_3",
    title: "Ứng dụng học tiếng Anh với AR",
    description: "Phát triển ứng dụng học tiếng Anh sử dụng công nghệ thực tế ảo tăng cường",
    category: "Technology",
    status: "review",
    progress: 90,
    teamMembers: [
      { id: "student_5", name: "Hoàng Thị Hoa", role: "Leader" },
      { id: "student_6", name: "Nguyễn Văn Đức", role: "Developer" }
    ],
    milestones: [
      { id: "m1", title: "Research", status: "completed", description: "Nghiên cứu công nghệ AR" },
      { id: "m2", title: "Design", status: "completed", description: "Thiết kế UI/UX" },
      { id: "m3", title: "Development", status: "completed", description: "Phát triển ứng dụng" },
      { id: "m4", title: "Testing", status: "completed", description: "Kiểm thử ứng dụng" },
      { id: "m5", title: "Deployment", status: "in-progress", description: "Triển khai" },
      { id: "m6", title: "Documentation", status: "locked", description: "Viết tài liệu" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "stem_4",
    title: "Hệ thống quản lý năng lượng thông minh",
    description: "Phát triển hệ thống quản lý và tối ưu hóa năng lượng cho tòa nhà",
    category: "Engineering",
    status: "in-progress",
    progress: 60,
    teamMembers: [
      { id: "student_7", name: "Vũ Thị Linh", role: "Leader" },
      { id: "student_8", name: "Đỗ Văn Minh", role: "Engineer" }
    ],
    milestones: [
      { id: "m1", title: "Research", status: "completed", description: "Nghiên cứu hệ thống năng lượng" },
      { id: "m2", title: "Design", status: "completed", description: "Thiết kế hệ thống" },
      { id: "m3", title: "Development", status: "in-progress", description: "Phát triển phần mềm" },
      { id: "m4", title: "Testing", status: "locked", description: "Kiểm thử hệ thống" },
      { id: "m5", title: "Deployment", status: "locked", description: "Triển khai" },
      { id: "m6", title: "Documentation", status: "locked", description: "Viết tài liệu" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: "stem_5",
    title: "Mô hình dự báo thời tiết AI",
    description: "Xây dựng mô hình dự báo thời tiết sử dụng trí tuệ nhân tạo",
    category: "Science",
    status: "in-progress",
    progress: 45,
    teamMembers: [
      { id: "student_9", name: "Bùi Thị Thu", role: "Leader" },
      { id: "student_10", name: "Lý Văn Nam", role: "Data Scientist" }
    ],
    milestones: [
      { id: "m1", title: "Research", status: "completed", description: "Nghiên cứu thuật toán AI" },
      { id: "m2", title: "Design", status: "in-progress", description: "Thiết kế mô hình" },
      { id: "m3", title: "Development", status: "locked", description: "Phát triển mô hình" },
      { id: "m4", title: "Testing", status: "locked", description: "Kiểm thử mô hình" },
      { id: "m5", title: "Deployment", status: "locked", description: "Triển khai" },
      { id: "m6", title: "Documentation", status: "locked", description: "Viết tài liệu" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: "stem_6",
    title: "Hệ thống giám sát môi trường IoT",
    description: "Phát triển hệ thống giám sát môi trường sử dụng Internet of Things",
    category: "Technology",
    status: "review",
    progress: 85,
    teamMembers: [
      { id: "student_11", name: "Trần Thị Hương", role: "Leader" },
      { id: "student_12", name: "Ngô Văn Tài", role: "IoT Engineer" }
    ],
    milestones: [
      { id: "m1", title: "Research", status: "completed", description: "Nghiên cứu công nghệ IoT" },
      { id: "m2", title: "Design", status: "completed", description: "Thiết kế hệ thống" },
      { id: "m3", title: "Development", status: "completed", description: "Phát triển thiết bị" },
      { id: "m4", title: "Testing", status: "completed", description: "Kiểm thử hệ thống" },
      { id: "m5", title: "Deployment", status: "in-progress", description: "Triển khai" },
      { id: "m6", title: "Documentation", status: "locked", description: "Viết tài liệu" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: "stem_7",
    title: "Robot phẫu thuật hỗ trợ",
    description: "Nghiên cứu và phát triển robot hỗ trợ phẫu thuật y tế",
    category: "Engineering",
    status: "in-progress",
    progress: 30,
    teamMembers: [
      { id: "student_13", name: "Phạm Thị Nga", role: "Leader" },
      { id: "student_14", name: "Lê Văn Hải", role: "Engineer" }
    ],
    milestones: [
      { id: "m1", title: "Research", status: "completed", description: "Nghiên cứu y học và robot" },
      { id: "m2", title: "Design", status: "in-progress", description: "Thiết kế robot" },
      { id: "m3", title: "Development", status: "locked", description: "Chế tạo robot" },
      { id: "m4", title: "Testing", status: "locked", description: "Kiểm thử an toàn" },
      { id: "m5", title: "Deployment", status: "locked", description: "Triển khai thử nghiệm" },
      { id: "m6", title: "Documentation", status: "locked", description: "Viết tài liệu" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: "stem_8",
    title: "Ứng dụng blockchain cho giáo dục",
    description: "Phát triển ứng dụng sử dụng blockchain để quản lý chứng chỉ giáo dục",
    category: "Technology",
    status: "completed",
    progress: 100,
    teamMembers: [
      { id: "student_15", name: "Đinh Thị Lan", role: "Leader" },
      { id: "student_16", name: "Võ Văn Tuấn", role: "Blockchain Developer" }
    ],
    milestones: [
      { id: "m1", title: "Research", status: "completed", description: "Nghiên cứu blockchain" },
      { id: "m2", title: "Design", status: "completed", description: "Thiết kế hệ thống" },
      { id: "m3", title: "Development", status: "completed", description: "Phát triển ứng dụng" },
      { id: "m4", title: "Testing", status: "completed", description: "Kiểm thử bảo mật" },
      { id: "m5", title: "Deployment", status: "completed", description: "Triển khai" },
      { id: "m6", title: "Documentation", status: "completed", description: "Viết tài liệu" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 40).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: "stem_9",
    title: "Hệ thống tưới tiêu thông minh",
    description: "Phát triển hệ thống tưới tiêu tự động dựa trên dữ liệu thời tiết và đất",
    category: "Engineering",
    status: "in-progress",
    progress: 70,
    teamMembers: [
      { id: "student_17", name: "Nguyễn Thị Hoa", role: "Leader" },
      { id: "student_18", name: "Trần Văn Long", role: "Engineer" }
    ],
    milestones: [
      { id: "m1", title: "Research", status: "completed", description: "Nghiên cứu nông nghiệp thông minh" },
      { id: "m2", title: "Design", status: "completed", description: "Thiết kế hệ thống" },
      { id: "m3", title: "Development", status: "in-progress", description: "Phát triển phần mềm" },
      { id: "m4", title: "Testing", status: "locked", description: "Kiểm thử hệ thống" },
      { id: "m5", title: "Deployment", status: "locked", description: "Triển khai thực tế" },
      { id: "m6", title: "Documentation", status: "locked", description: "Viết tài liệu" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: "stem_10",
    title: "Mô hình học máy dự đoán bệnh",
    description: "Xây dựng mô hình học máy để dự đoán và chẩn đoán bệnh từ dữ liệu y tế",
    category: "Science",
    status: "review",
    progress: 80,
    teamMembers: [
      { id: "student_19", name: "Lê Thị Mai", role: "Leader" },
      { id: "student_20", name: "Phạm Văn Đức", role: "ML Engineer" }
    ],
    milestones: [
      { id: "m1", title: "Research", status: "completed", description: "Nghiên cứu y học và ML" },
      { id: "m2", title: "Design", status: "completed", description: "Thiết kế mô hình" },
      { id: "m3", title: "Development", status: "completed", description: "Phát triển mô hình" },
      { id: "m4", title: "Testing", status: "completed", description: "Kiểm thử độ chính xác" },
      { id: "m5", title: "Deployment", status: "in-progress", description: "Triển khai thử nghiệm" },
      { id: "m6", title: "Documentation", status: "locked", description: "Viết tài liệu" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  }
];

// Save to localStorage
localStorage.setItem('stem-projects', JSON.stringify(stemProjects));

console.log('✅ STEM projects data populated successfully!');
console.log(`📊 Total projects: ${stemProjects.length}`);
console.log('🔄 Please refresh the page to see the data');
