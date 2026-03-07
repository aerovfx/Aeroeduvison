"use client";

export const CommunityWelcome = () => {
  const profiles = [
    { name: "Sarah", avatar: "/api/placeholder/40/40" },
    { name: "Mike", avatar: "/api/placeholder/40/40" },
    { name: "Emma", avatar: "/api/placeholder/40/40" },
    { name: "David", avatar: "/api/placeholder/40/40" },
    { name: "Lisa", avatar: "/api/placeholder/40/40" },
  ];

  return (
    <div className="relative h-full flex items-center justify-center p-12">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-800 rounded-full opacity-20 transform translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gray-800 rounded-full opacity-10 transform -translate-x-24 translate-y-24"></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-gray-800 rounded-full opacity-5 transform -translate-x-16 -translate-y-16"></div>
        
        {/* Dots Pattern */}
        <div className="absolute top-8 right-8 w-20 h-20 opacity-10">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="10" cy="10" r="2" fill="white" />
            <circle cx="30" cy="10" r="2" fill="white" />
            <circle cx="50" cy="10" r="2" fill="white" />
            <circle cx="70" cy="10" r="2" fill="white" />
            <circle cx="90" cy="10" r="2" fill="white" />
            <circle cx="10" cy="30" r="2" fill="white" />
            <circle cx="30" cy="30" r="2" fill="white" />
            <circle cx="50" cy="30" r="2" fill="white" />
            <circle cx="70" cy="30" r="2" fill="white" />
            <circle cx="90" cy="30" r="2" fill="white" />
            <circle cx="10" cy="50" r="2" fill="white" />
            <circle cx="30" cy="50" r="2" fill="white" />
            <circle cx="50" cy="50" r="2" fill="white" />
            <circle cx="70" cy="50" r="2" fill="white" />
            <circle cx="90" cy="50" r="2" fill="white" />
            <circle cx="10" cy="70" r="2" fill="white" />
            <circle cx="30" cy="70" r="2" fill="white" />
            <circle cx="50" cy="70" r="2" fill="white" />
            <circle cx="70" cy="70" r="2" fill="white" />
            <circle cx="90" cy="70" r="2" fill="white" />
            <circle cx="10" cy="90" r="2" fill="white" />
            <circle cx="30" cy="90" r="2" fill="white" />
            <circle cx="50" cy="90" r="2" fill="white" />
            <circle cx="70" cy="90" r="2" fill="white" />
            <circle cx="90" cy="90" r="2" fill="white" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-md">
        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            Welcome to
          </h1>
          <h2 className="text-5xl font-bold text-white">
            our community
          </h2>
        </div>

        {/* Description */}
        <p className="text-lg text-gray-300 mb-8 leading-relaxed">
          LMS Math helps educators and students to build organized and well-structured learning experiences full of beautiful and rich educational modules. Join us and start building your learning journey today.
        </p>

        {/* Social Proof */}
        <div className="flex items-center justify-center space-x-4">
          {/* Profile Pictures */}
          <div className="flex -space-x-2">
            {profiles.map((profile, index) => (
              <div
                key={index}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-gray-800 flex items-center justify-center text-white text-sm font-medium"
              >
                {profile.name.charAt(0)}
              </div>
            ))}
          </div>
          
          {/* Social Proof Text */}
          <div className="text-left">
            <p className="text-white font-medium">
              More than 17k people joined us, it's your turn
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-2 gap-6 text-left">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">AI-Powered Learning</h3>
              <p className="text-gray-400 text-sm">Smart content generation and personalized learning paths</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Interactive Content</h3>
              <p className="text-gray-400 text-sm">Engaging lessons, quizzes, and STEM projects</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Community Driven</h3>
              <p className="text-gray-400 text-sm">Connect with educators and learners worldwide</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">Progress Tracking</h3>
              <p className="text-gray-400 text-sm">Monitor learning progress and achievements</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
