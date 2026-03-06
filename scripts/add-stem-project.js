// Script to add a specific STEM project to localStorage
// This will be run in the browser console on the production site

const projectToAdd = {
  id: "project_1759913053775",
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
    { 
      id: "m1", 
      title: "Khảo sát và ý tưởng", 
      description: "Nghiên cứu tình hình giao thông và đề xuất giải pháp", 
      status: "completed", 
      dueDate: "2024-09-10", 
      deliverables: [] 
    },
    { 
      id: "m2", 
      title: "Thiết kế mạch điều khiển", 
      description: "Thiết kế và chế tạo mạch điều khiển đèn giao thông", 
      status: "completed", 
      dueDate: "2024-09-25", 
      deliverables: [] 
    },
    { 
      id: "m3", 
      title: "Lập trình AI nhận diện xe", 
      description: "Phát triển thuật toán AI để nhận diện mật độ phương tiện", 
      status: "completed", 
      dueDate: "2024-10-10", 
      deliverables: [] 
    },
    { 
      id: "m4", 
      title: "Thử nghiệm mô hình", 
      description: "Kiểm thử và tối ưu hóa hệ thống", 
      status: "completed", 
      dueDate: "2024-10-25", 
      deliverables: [] 
    }
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
};

// Function to add project to localStorage
function addProjectToStorage() {
  try {
    // Get existing projects
    const existingProjects = JSON.parse(localStorage.getItem('stem-projects') || '[]');
    
    // Check if project already exists
    const projectExists = existingProjects.find(p => p.id === projectToAdd.id);
    
    if (!projectExists) {
      // Add project to beginning of array
      existingProjects.unshift(projectToAdd);
      
      // Save back to localStorage
      localStorage.setItem('stem-projects', JSON.stringify(existingProjects));
      localStorage.setItem('stem-projects-version', '2.0');
      
      console.log('✅ Project added successfully!');
      console.log('Project ID:', projectToAdd.id);
      console.log('Project Title:', projectToAdd.title);
      
      // Refresh the page to see the changes
      window.location.reload();
    } else {
      console.log('⚠️ Project already exists in localStorage');
    }
  } catch (error) {
    console.error('❌ Error adding project:', error);
  }
}

// Run the function
addProjectToStorage();
