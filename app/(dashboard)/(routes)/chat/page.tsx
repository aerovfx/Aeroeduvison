'use client';

"use client"

import { useSession } from "next-auth/react";
import { ChatInterface } from "@/components/chat-interface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Search, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useLanguage } from '@/contexts/LanguageContext';

export default function ChatPage() {
  const { t } = useLanguage();
  
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserList, setShowUserList] = useState(false);

  // Mock users for demo - in real app, fetch from API
  const mockUsers = [
    {
      id: "user1",
      name: "Minh Anh",
      email: "minhanh@example.com",
      image: "/avatars/user.jpg",
      status: "online"
    },
    {
      id: "user2", 
      name: "Nguyễn Văn A",
      email: "nguyenvana@example.com",
      image: "/avatars/student.jpg",
      status: "offline"
    },
    {
      id: "user3",
      name: "Trần Thị B",
      email: "tranthib@example.com", 
      image: "/avatars/user.jpg",
      status: "online"
    }
  ];

  useEffect(() => {
    setUsers(mockUsers);
  }, []);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startChat = async (userId: string) => {
    try {
      const response = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: userId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh chat rooms or navigate to the new room
        typeof window !== 'undefined' && location.reload();
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  if (!session?.user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-600">Vui lòng đăng nhập để sử dụng tính năng chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chat</h1>
          <p className="text-gray-600">Trò chuyện với bạn bè và giáo viên</p>
        
              </div>
        <Button 
          onClick={() => setShowUserList(!showUserList)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Bắt đầu chat
        </Button>
      </div>

      {/* User List Modal */}
      {showUserList && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Tìm kiếm người dùng
            </CardTitle>
            <CardDescription>
              Tìm và bắt đầu cuộc trò chuyện với người khác
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => startChat(user.id)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.image} />
                    <AvatarFallback>
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card>
        <CardContent className="p-0">
          <ChatInterface currentUserId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
