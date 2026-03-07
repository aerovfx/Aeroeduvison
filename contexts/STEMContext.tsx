"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: "pending" | "in-progress" | "completed";
  deliverables: string[];
}

interface STEMProject {
  id: string;
  title: string;
  description: string;
  category: "Science" | "Technology" | "Engineering" | "Math";
  status: "draft" | "in-progress" | "review" | "completed" | "published";
  teamMembers: TeamMember[];
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  progress: number;
  milestones: Milestone[];
  feedback: Array<{
    id: string;
    author: string;
    content: string;
    date: string;
    type: "suggestion" | "approval" | "revision";
  }>;
  isPublic: boolean;
  thumbnail?: string;
}

interface STEMContextType {
  projects: STEMProject[];
  addProject: (project: Omit<STEMProject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<STEMProject>;
  updateProject: (id: string, project: Partial<STEMProject>) => Promise<STEMProject | undefined>;
  deleteProject: (id: string) => Promise<boolean>;
  getProject: (id: string) => Promise<STEMProject | undefined>;
  loadProjects: () => Promise<void>;
}

const STEMContext = createContext<STEMContextType | undefined>(undefined);

export const useSTEM = () => {
  const context = useContext(STEMContext);
  if (context === undefined) {
    throw new Error('useSTEM must be used within a STEMProvider');
  }
  return context;
};

// Mock data - 10 dự án STEM mới
const initialProjects: STEMProject[] = [
  {
    id: "1",
    title: "Smart Traffic Light System",
    description: "Thiết kế hệ thống đèn giao thông thông minh dùng AI để nhận diện mật độ phương tiện và tự động điều chỉnh thời gian đèn",
    category: "Engineering",
    status: "completed",
    teamMembers: [
      { id: "1", name: "Nguyễn Văn An", role: "AI Engineer", email: "an@example.com" },
      { id: "2", name: "Trần Thị Bình", role: "Hardware Developer", email: "binh@example.com" },
      { id: "3", name: "Lê Văn Cường", role: "IoT Specialist", email: "cuong@example.com" }
    ],
    instructor: {
      id: "teacher1",
      name: "Thầy Phạm Minh Giao thông",
      email: "giao-thong@example.com"
    },
    createdAt: "2024-09-01",
    updatedAt: "2024-10-25",
    dueDate: "2024-10-25",
    tags: ["AI", "IoT", "Transportation", "Arduino"],
    difficulty: "advanced",
    progress: 100,
    milestones: [
      { id: "m1", title: "Khảo sát và ý tưởng", description: "Nghiên cứu tình hình giao thông và đề xuất giải pháp", status: "completed", dueDate: "2024-09-10", deliverables: [] },
      { id: "m2", title: "Thiết kế mạch điều khiển", description: "Thiết kế và chế tạo mạch điều khiển đèn giao thông", status: "completed", dueDate: "2024-09-25", deliverables: [] },
      { id: "m3", title: "Lập trình AI nhận diện xe", description: "Phát triển thuật toán AI để nhận diện mật độ phương tiện", status: "completed", dueDate: "2024-10-10", deliverables: [] },
      { id: "m4", title: "Thử nghiệm mô hình", description: "Kiểm thử và tối ưu hóa hệ thống", status: "completed", dueDate: "2024-10-25", deliverables: [] }
    ],
    feedback: [
      {
        id: "f1",
        author: "Thầy Phạm Minh Giao thông",
        content: "Dự án xuất sắc! Hệ thống AI hoạt động rất chính xác trong việc nhận diện mật độ giao thông.",
        date: "2024-10-25",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/smart-traffic.jpg"
  },
  {
    id: "2",
    title: "AI Tutor for Math",
    description: "Phát triển trợ lý AI hỗ trợ học sinh giải toán từng bước và gợi ý cách học hiệu quả",
    category: "Technology",
    status: "completed",
    teamMembers: [
      { id: "4", name: "Phạm Thị Dung", role: "AI Developer", email: "dung@example.com" },
      { id: "5", name: "Hoàng Văn Đức", role: "NLP Engineer", email: "duc@example.com" }
    ],
    instructor: {
      id: "teacher2",
      name: "Cô Nguyễn Thị Toán học",
      email: "toan-hoc@example.com"
    },
    createdAt: "2024-09-01",
    updatedAt: "2024-10-30",
    dueDate: "2024-10-30",
    tags: ["AI", "NLP", "Math", "Education"],
    difficulty: "advanced",
    progress: 100,
    milestones: [
      { id: "m1", title: "Thu thập bộ đề toán", description: "Tập hợp các bài toán từ cơ bản đến nâng cao", status: "completed", dueDate: "2024-09-15", deliverables: [] },
      { id: "m2", title: "Huấn luyện AI giải toán", description: "Phát triển và huấn luyện mô hình AI", status: "completed", dueDate: "2024-10-01", deliverables: [] },
      { id: "m3", title: "Thử nghiệm với học sinh", description: "Kiểm thử với nhóm học sinh thực tế", status: "completed", dueDate: "2024-10-15", deliverables: [] },
      { id: "m4", title: "Triển khai bản demo", description: "Hoàn thiện và triển khai ứng dụng", status: "completed", dueDate: "2024-10-30", deliverables: [] }
    ],
    feedback: [
      {
        id: "f2",
        author: "Cô Nguyễn Thị Toán học",
        content: "AI tutor rất hữu ích! Học sinh phản hồi tích cực về khả năng giải thích từng bước.",
        date: "2024-10-30",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/ai-tutor.jpg"
  },
  {
    id: "3",
    title: "Ocean Cleaner Boat",
    description: "Chế tạo thuyền tự động thu gom rác nhựa trên mặt nước bằng robot điều khiển từ xa",
    category: "Engineering",
    status: "completed",
    teamMembers: [
      { id: "6", name: "Vũ Thị Giang", role: "Robotics Engineer", email: "giang@example.com" },
      { id: "7", name: "Đặng Văn Hùng", role: "Marine Engineer", email: "hung@example.com" }
    ],
    instructor: {
      id: "teacher3",
      name: "Thầy Lê Minh Môi trường",
      email: "moi-truong@example.com"
    },
    createdAt: "2024-09-01",
    updatedAt: "2024-10-20",
    dueDate: "2024-10-20",
    tags: ["Robotics", "Environment", "Marine", "Arduino"],
    difficulty: "advanced",
    progress: 100,
    milestones: [
      { id: "m1", title: "Thiết kế nguyên mẫu thuyền", description: "Thiết kế và chế tạo nguyên mẫu thuyền", status: "completed", dueDate: "2024-09-05", deliverables: [] },
      { id: "m2", title: "Tích hợp hệ thống thu gom rác", description: "Tích hợp robot thu gom rác vào thuyền", status: "completed", dueDate: "2024-09-20", deliverables: [] },
      { id: "m3", title: "Thử nghiệm điều khiển từ xa", description: "Kiểm thử hệ thống điều khiển từ xa", status: "completed", dueDate: "2024-10-05", deliverables: [] },
      { id: "m4", title: "Báo cáo và cải tiến", description: "Hoàn thiện và báo cáo kết quả", status: "completed", dueDate: "2024-10-20", deliverables: [] }
    ],
    feedback: [
      {
        id: "f3",
        author: "Thầy Lê Minh Môi trường",
        content: "Dự án có ý nghĩa lớn cho môi trường! Thuyền hoạt động ổn định và hiệu quả.",
        date: "2024-10-20",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/ocean-cleaner.jpg"
  },
  {
    id: "4",
    title: "Renewable Energy House Model",
    description: "Xây dựng mô hình nhà nhỏ vận hành bằng năng lượng mặt trời và gió",
    category: "Engineering",
    status: "completed",
    teamMembers: [
      { id: "8", name: "Bùi Thị Hoa", role: "Energy Engineer", email: "hoa@example.com" },
      { id: "9", name: "Ngô Văn Khoa", role: "Electrical Engineer", email: "khoa@example.com" }
    ],
    instructor: {
      id: "teacher4",
      name: "Cô Phạm Minh Năng lượng",
      email: "nang-luong@example.com"
    },
    createdAt: "2024-08-01",
    updatedAt: "2024-09-15",
    dueDate: "2024-09-15",
    tags: ["Renewable Energy", "Engineering", "Green Tech"],
    difficulty: "intermediate",
    progress: 100,
    milestones: [
      { id: "m1", title: "Lập kế hoạch năng lượng", description: "Nghiên cứu và lập kế hoạch sử dụng năng lượng tái tạo", status: "completed", dueDate: "2024-08-01", deliverables: [] },
      { id: "m2", title: "Thiết kế mô hình", description: "Thiết kế mô hình nhà và hệ thống năng lượng", status: "completed", dueDate: "2024-08-15", deliverables: [] },
      { id: "m3", title: "Lắp đặt hệ thống điện mặt trời và gió", description: "Lắp đặt và kết nối các hệ thống năng lượng", status: "completed", dueDate: "2024-08-30", deliverables: [] },
      { id: "m4", title: "Thử nghiệm", description: "Kiểm thử và tối ưu hóa hệ thống", status: "completed", dueDate: "2024-09-15", deliverables: [] }
    ],
    feedback: [
      {
        id: "f4",
        author: "Cô Phạm Minh Năng lượng",
        content: "Mô hình hoạt động tốt! Hệ thống năng lượng tái tạo rất hiệu quả.",
        date: "2024-09-15",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/renewable-house.jpg"
  },
  {
    id: "5",
    title: "Virtual Chemistry Lab",
    description: "Phát triển phòng thí nghiệm ảo cho học sinh thực hành phản ứng hóa học trong môi trường an toàn",
    category: "Science",
    status: "completed",
    teamMembers: [
      { id: "10", name: "Lý Thị Lan", role: "VR Developer", email: "lan@example.com" },
      { id: "11", name: "Trần Văn Minh", role: "Chemistry Expert", email: "minh@example.com" }
    ],
    instructor: {
      id: "teacher5",
      name: "Thầy Hoàng Văn Hóa học",
      email: "hoa-hoc@example.com"
    },
    createdAt: "2024-08-20",
    updatedAt: "2024-10-05",
    dueDate: "2024-10-05",
    tags: ["VR", "Education", "Chemistry", "Simulation"],
    difficulty: "advanced",
    progress: 100,
    milestones: [
      { id: "m1", title: "Nghiên cứu mô phỏng phản ứng", description: "Nghiên cứu và phát triển mô phỏng phản ứng hóa học", status: "completed", dueDate: "2024-08-20", deliverables: [] },
      { id: "m2", title: "Thiết kế giao diện VR", description: "Thiết kế giao diện người dùng trong môi trường VR", status: "completed", dueDate: "2024-09-01", deliverables: [] },
      { id: "m3", title: "Lập trình và tích hợp", description: "Lập trình và tích hợp các tính năng VR", status: "completed", dueDate: "2024-09-20", deliverables: [] },
      { id: "m4", title: "Trình bày sản phẩm", description: "Hoàn thiện và trình bày sản phẩm cuối cùng", status: "completed", dueDate: "2024-10-05", deliverables: [] }
    ],
    feedback: [
      {
        id: "f5",
        author: "Thầy Hoàng Văn Hóa học",
        content: "Phòng thí nghiệm ảo rất thực tế! Học sinh có thể thực hành an toàn mà không lo nguy hiểm.",
        date: "2024-10-05",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/virtual-lab.jpg"
  },
  {
    id: "6",
    title: "Smart Waste Bin",
    description: "Chế tạo thùng rác thông minh có khả năng phân loại rác tái chế và hữu cơ bằng camera AI",
    category: "Technology",
    status: "completed",
    teamMembers: [
      { id: "12", name: "Đỗ Thị Mai", role: "AI Engineer", email: "mai@example.com" },
      { id: "13", name: "Phan Văn Nam", role: "Hardware Developer", email: "nam@example.com" }
    ],
    instructor: {
      id: "teacher6",
      name: "Cô Vũ Thị Môi trường",
      email: "moi-truong-2@example.com"
    },
    createdAt: "2024-09-01",
    updatedAt: "2024-10-20",
    dueDate: "2024-10-20",
    tags: ["AI", "Computer Vision", "Environment"],
    difficulty: "intermediate",
    progress: 100,
    milestones: [
      { id: "m1", title: "Thu thập dữ liệu hình ảnh rác", description: "Thu thập và gán nhãn dữ liệu hình ảnh rác", status: "completed", dueDate: "2024-09-05", deliverables: [] },
      { id: "m2", title: "Huấn luyện AI phân loại", description: "Phát triển và huấn luyện mô hình AI phân loại rác", status: "completed", dueDate: "2024-09-20", deliverables: [] },
      { id: "m3", title: "Thiết kế thùng rác tích hợp", description: "Thiết kế và chế tạo thùng rác tích hợp AI", status: "completed", dueDate: "2024-10-05", deliverables: [] },
      { id: "m4", title: "Thử nghiệm", description: "Kiểm thử và tối ưu hóa hệ thống", status: "completed", dueDate: "2024-10-20", deliverables: [] }
    ],
    feedback: [
      {
        id: "f6",
        author: "Cô Vũ Thị Môi trường",
        content: "Thùng rác thông minh hoạt động rất chính xác! Giúp phân loại rác hiệu quả.",
        date: "2024-10-20",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/smart-bin.jpg"
  },
  {
    id: "7",
    title: "AI-based Language Learning App",
    description: "Xây dựng ứng dụng AI luyện phát âm và giao tiếp ngoại ngữ cá nhân hóa cho học sinh",
    category: "Technology",
    status: "completed",
    teamMembers: [
      { id: "14", name: "Lê Thị Oanh", role: "AI Developer", email: "oanh@example.com" },
      { id: "15", name: "Nguyễn Văn Phúc", role: "Mobile Developer", email: "phuc@example.com" }
    ],
    instructor: {
      id: "teacher7",
      name: "Thầy Trần Minh Ngoại ngữ",
      email: "ngoai-ngu@example.com"
    },
    createdAt: "2024-09-01",
    updatedAt: "2024-10-15",
    dueDate: "2024-10-15",
    tags: ["AI", "NLP", "Mobile App", "Education"],
    difficulty: "advanced",
    progress: 100,
    milestones: [
      { id: "m1", title: "Thu thập dữ liệu ngôn ngữ", description: "Thu thập và gán nhãn dữ liệu ngôn ngữ", status: "completed", dueDate: "2024-09-01", deliverables: [] },
      { id: "m2", title: "Huấn luyện mô hình giọng nói", description: "Phát triển và huấn luyện mô hình giọng nói", status: "completed", dueDate: "2024-09-15", deliverables: [] },
      { id: "m3", title: "Thiết kế app", description: "Thiết kế giao diện và tính năng ứng dụng", status: "completed", dueDate: "2024-10-01", deliverables: [] },
      { id: "m4", title: "Thử nghiệm với người dùng", description: "Kiểm thử và tối ưu hóa với người dùng thực tế", status: "completed", dueDate: "2024-10-15", deliverables: [] }
    ],
    feedback: [
      {
        id: "f7",
        author: "Thầy Trần Minh Ngoại ngữ",
        content: "Ứng dụng rất hữu ích! AI phát âm rất chính xác và giúp học sinh cải thiện đáng kể.",
        date: "2024-10-15",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/language-app.jpg"
  },
  {
    id: "8",
    title: "Earthquake Early Warning System",
    description: "Phát triển hệ thống cảnh báo sớm động đất dựa trên cảm biến địa chấn và mô hình AI dự đoán",
    category: "Engineering",
    status: "completed",
    teamMembers: [
      { id: "16", name: "Võ Thị Quỳnh", role: "Seismologist", email: "quynh@example.com" },
      { id: "17", name: "Đinh Văn Rồng", role: "AI Engineer", email: "rong@example.com" }
    ],
    instructor: {
      id: "teacher8",
      name: "Thầy Lê Văn Địa chất",
      email: "dia-chat@example.com"
    },
    createdAt: "2024-08-10",
    updatedAt: "2024-09-25",
    dueDate: "2024-09-25",
    tags: ["IoT", "Safety", "AI", "Environment"],
    difficulty: "advanced",
    progress: 100,
    milestones: [
      { id: "m1", title: "Nghiên cứu dữ liệu địa chấn", description: "Nghiên cứu và phân tích dữ liệu địa chấn", status: "completed", dueDate: "2024-08-10", deliverables: [] },
      { id: "m2", title: "Xây dựng cảm biến", description: "Thiết kế và chế tạo cảm biến địa chấn", status: "completed", dueDate: "2024-08-25", deliverables: [] },
      { id: "m3", title: "Lập trình mô hình AI", description: "Phát triển mô hình AI dự đoán động đất", status: "completed", dueDate: "2024-09-10", deliverables: [] },
      { id: "m4", title: "Triển khai thử nghiệm", description: "Triển khai và kiểm thử hệ thống", status: "completed", dueDate: "2024-09-25", deliverables: [] }
    ],
    feedback: [
      {
        id: "f8",
        author: "Thầy Lê Văn Địa chất",
        content: "Hệ thống cảnh báo rất chính xác! Có thể giúp cứu sống nhiều người trong trường hợp động đất.",
        date: "2024-09-25",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/earthquake-warning.jpg"
  },
  {
    id: "9",
    title: "BioPlastic from Waste",
    description: "Nghiên cứu quy trình sản xuất nhựa sinh học từ vỏ trái cây và chất thải hữu cơ",
    category: "Science",
    status: "completed",
    teamMembers: [
      { id: "18", name: "Bùi Thị Sương", role: "Biotechnologist", email: "suong@example.com" },
      { id: "19", name: "Phạm Văn Tài", role: "Chemistry Researcher", email: "tai@example.com" }
    ],
    instructor: {
      id: "teacher9",
      name: "Cô Nguyễn Thị Sinh học",
      email: "sinh-hoc@example.com"
    },
    createdAt: "2024-07-05",
    updatedAt: "2024-08-20",
    dueDate: "2024-08-20",
    tags: ["Biotechnology", "Environment", "Chemistry"],
    difficulty: "intermediate",
    progress: 100,
    milestones: [
      { id: "m1", title: "Nghiên cứu tài liệu", description: "Nghiên cứu tài liệu về công nghệ sản xuất bioplastic", status: "completed", dueDate: "2024-07-05", deliverables: [] },
      { id: "m2", title: "Thí nghiệm sản xuất bioplastic", description: "Thực hiện thí nghiệm sản xuất bioplastic từ vỏ trái cây", status: "completed", dueDate: "2024-07-20", deliverables: [] },
      { id: "m3", title: "Đánh giá độ bền vật liệu", description: "Kiểm tra và đánh giá độ bền của vật liệu bioplastic", status: "completed", dueDate: "2024-08-05", deliverables: [] },
      { id: "m4", title: "Báo cáo kết quả", description: "Viết báo cáo và trình bày kết quả nghiên cứu", status: "completed", dueDate: "2024-08-20", deliverables: [] }
    ],
    feedback: [
      {
        id: "f9",
        author: "Cô Nguyễn Thị Sinh học",
        content: "Nghiên cứu rất có ý nghĩa! Bioplastic từ chất thải hữu cơ là giải pháp bền vững cho môi trường.",
        date: "2024-08-20",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/bioplastic.jpg"
  },
  {
    id: "10",
    title: "Smart Classroom IoT",
    description: "Triển khai lớp học thông minh với cảm biến đo ánh sáng, nhiệt độ, chất lượng không khí để tối ưu môi trường học tập",
    category: "Technology",
    status: "completed",
    teamMembers: [
      { id: "20", name: "Trần Thị Uyên", role: "IoT Engineer", email: "uyen@example.com" },
      { id: "21", name: "Lê Văn Vinh", role: "Smart Tech Developer", email: "vinh@example.com" }
    ],
    instructor: {
      id: "teacher10",
      name: "Thầy Phạm Minh Giáo dục",
      email: "giao-duc@example.com"
    },
    createdAt: "2024-09-01",
    updatedAt: "2024-10-15",
    dueDate: "2024-10-15",
    tags: ["IoT", "Education", "Smart Tech"],
    difficulty: "intermediate",
    progress: 100,
    milestones: [
      { id: "m1", title: "Xác định nhu cầu lớp học", description: "Nghiên cứu và xác định nhu cầu của lớp học thông minh", status: "completed", dueDate: "2024-09-01", deliverables: [] },
      { id: "m2", title: "Thiết kế hệ thống cảm biến", description: "Thiết kế hệ thống cảm biến đo lường môi trường", status: "completed", dueDate: "2024-09-15", deliverables: [] },
      { id: "m3", title: "Lắp đặt mô hình demo", description: "Lắp đặt và cấu hình mô hình demo", status: "completed", dueDate: "2024-09-30", deliverables: [] },
      { id: "m4", title: "Thử nghiệm", description: "Kiểm thử và tối ưu hóa hệ thống", status: "completed", dueDate: "2024-10-15", deliverables: [] }
    ],
    feedback: [
      {
        id: "f10",
        author: "Thầy Phạm Minh Giáo dục",
        content: "Lớp học thông minh rất hiệu quả! Môi trường học tập được tối ưu hóa đáng kể.",
        date: "2024-10-15",
        type: "approval"
      }
    ],
    isPublic: true,
    thumbnail: "/images/stem/smart-classroom.jpg"
  }
];

export const STEMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<STEMProject[]>(initialProjects);

  // Load projects from localStorage on mount, but always check for updates
  useEffect(() => {
    const savedProjects = localStorage.getItem('stem-projects');
    const savedVersion = localStorage.getItem('stem-projects-version');
    const currentVersion = '2.0'; // Version của 10 dự án mới
    
    // Nếu không có version hoặc version cũ, load dữ liệu mới
    if (!savedVersion || savedVersion !== currentVersion) {
      setProjects(initialProjects);
      localStorage.setItem('stem-projects', JSON.stringify(initialProjects));
      localStorage.setItem('stem-projects-version', currentVersion);
    } else if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        setProjects(parsedProjects);
      } catch (error) {
        console.error('Error loading projects from localStorage:', error);
        setProjects(initialProjects);
        localStorage.setItem('stem-projects', JSON.stringify(initialProjects));
        localStorage.setItem('stem-projects-version', currentVersion);
      }
    } else {
      setProjects(initialProjects);
      localStorage.setItem('stem-projects', JSON.stringify(initialProjects));
      localStorage.setItem('stem-projects-version', currentVersion);
    }
  }, []);

  // Save projects to localStorage whenever projects change
  useEffect(() => {
    localStorage.setItem('stem-projects', JSON.stringify(projects));
  }, [projects]);

  const addProject = async (projectData: Omit<STEMProject, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Save to API first
      const response = await fetch('/api/stem/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.project) {
          // Add to local state
          setProjects(prev => [data.project, ...prev]);
          return data.project;
        }
      }
    } catch (error) {
      console.error('Error saving project to API:', error);
    }

    // Fallback to local storage if API fails
    const newProject: STEMProject = {
      ...projectData,
      id: `project_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects(prev => [newProject, ...prev]);
    return newProject;
  };

  const updateProject = async (id: string, projectData: Partial<STEMProject>) => {
    try {
      // Update via API first
      const response = await fetch(`/api/stem/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.project) {
          // Update local state
          setProjects(prev => prev.map(project => 
            project.id === id ? data.project : project
          ));
          return data.project;
        }
      }
    } catch (error) {
      console.error('Error updating project via API:', error);
    }

    // Fallback to local update
    const updatedProject = projects.find(p => p.id === id);
    if (updatedProject) {
      const newProject = { ...updatedProject, ...projectData, updatedAt: new Date().toISOString() };
      setProjects(prev => prev.map(project => 
        project.id === id ? newProject : project
      ));
      return newProject;
    }
    return undefined;
  };

  const deleteProject = async (id: string) => {
    try {
      // Delete via API first
      const response = await fetch(`/api/stem/projects/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove from local state
          setProjects(prev => prev.filter(project => project.id !== id));
          return true;
        }
      }
    } catch (error) {
      console.error('Error deleting project via API:', error);
    }

    // Fallback to local deletion
    setProjects(prev => prev.filter(project => project.id !== id));
    return true;
  };

  const getProject = async (id: string) => {
    // First check local projects
    let project = projects.find(project => project.id === id);
    
    // If not found locally, try to fetch from API
    if (!project) {
      try {
        const response = await fetch(`/api/stem/projects/${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.project) {
            // Add project to local state
            setProjects(prev => [data.project, ...prev]);
            project = data.project;
          }
        }
      } catch (error) {
        console.error('Error fetching project from API:', error);
      }
    }
    
    return project;
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/stem/projects');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.projects) {
          setProjects(data.projects);
          localStorage.setItem('stem-projects', JSON.stringify(data.projects));
          localStorage.setItem('stem-projects-version', '3.0'); // API version
          return; // Success, exit early
        }
      }
      
      // If API fails or returns no data, use initial mock projects
      console.log('Using mock projects from Context (API unavailable or returned no data)');
      // Projects already set from localStorage or initialProjects in useEffect
    } catch (error) {
      console.error('Error loading projects from API:', error);
      // Fallback to initial projects already loaded
      console.log('Using mock projects from Context (API error)');
    }
  };

  const value: STEMContextType = {
    projects,
    addProject,
    updateProject,
    deleteProject,
    getProject,
    loadProjects,
  };

  return (
    <STEMContext.Provider value={value}>
      {children}
    </STEMContext.Provider>
  );
};
