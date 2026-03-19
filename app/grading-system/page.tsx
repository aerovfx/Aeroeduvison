
'use client';

import React, { useState } from 'react';
import ImprovedBubbleSheet from '@/components/improved-bubble-sheet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AnswerKey, 
  StudentSubmission 
} from '@/lib/grading/grading-logic';
import { 
  ClipboardCheck, 
  UserCircle, 
  BarChart3, 
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function GradingSystemPage() {
  const [activeTab, setActiveTab] = useState('key');
  const [officialKey, setOfficialKey] = useState<AnswerKey>({
    partI: {
      1: 0, 2: 1, 3: 2, 4: 3, 5: 0, 6: 1, 7: 2, 8: 3, 9: 0,
      10: 1, 11: 2, 12: 3, 13: 0, 14: 1, 15: 2, 16: 3, 17: 0, 18: 1
    },
    partII: {
      1: { a: true, b: false, c: true, d: false },
      2: { a: false, b: true, c: false, d: true },
      3: { a: true, b: true, c: false, d: false },
      4: { a: false, b: false, c: true, d: true }
    },
    partIII: {
      1: "2",
      2: "13",
      3: "2,3",
      4: "28.27",
      5: "3",
      6: "6"
    }
  });

  const [studentSubmission, setStudentSubmission] = useState<StudentSubmission | null>(null);

  const handleSaveKey = (data: any) => {
    setOfficialKey({
      partI: data.partI,
      partII: data.partII,
      partIII: data.partIII
    });
    // Visual feedback
    setActiveTab('grading');
  };

  const handleSaveSubmission = (data: StudentSubmission) => {
    setStudentSubmission(data);
    setActiveTab('report');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white pt-12 pb-24 px-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        <div className="container mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span>AI Grading Engine v2.0</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">Hệ Thống Chấm Điểm <span className="text-blue-200">Thông Minh</span></h1>
              <p className="text-blue-100/80 text-lg max-w-2xl">
                Quản lý kho đáp án chuyên nghiệp, chấm điểm tự động và phân tích kết quả chi tiết theo form chuẩn của Bộ Giáo dục.
              </p>
            </div>
            <div className="flex gap-3">
               <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl text-center">
                 <p className="text-xs text-blue-200 uppercase font-bold">Trạng thái</p>
                 <p className="text-xl font-black text-white">{studentSubmission ? 'Đã có kết quả' : 'Chờ dữ liệu'}</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto -mt-16 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl mx-auto h-auto p-1.5 bg-white/80 backdrop-blur shadow-xl border rounded-2xl">
            <TabsTrigger value="key" className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all">
              <ClipboardCheck className="w-4 h-4" />
              <span className="font-bold">1. Đáp án mẫu</span>
            </TabsTrigger>
            <TabsTrigger value="grading" className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
              <UserCircle className="w-4 h-4" />
              <span className="font-bold">2. Bài làm Thí sinh</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-2 py-3 px-4 rounded-xl data-[state=active]:bg-green-600 data-[state=active]:text-white transition-all" disabled={!studentSubmission}>
              <BarChart3 className="w-4 h-4" />
              <span className="font-bold">3. Kết quả Chi tiết</span>
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 gap-8">
            <TabsContent value="key" className="mt-0 outline-none">
              <Card className="border-none shadow-2xl rounded-3xl overflow-hidden shadow-orange-200/50">
                <CardHeader className="bg-orange-50/50 border-b border-orange-100 p-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                      <Save className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black text-gray-800">Cài đặt Đáp án Chính thức</CardTitle>
                      <CardDescription>Nhập đáp án chuẩn để hệ thống tự động so khớp và tính điểm.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ImprovedBubbleSheet 
                    mode="key_entry" 
                    initialData={{
                      partI: officialKey.partI,
                      partII: officialKey.partII,
                      partIII: officialKey.partIII
                    } as any}
                    onSave={handleSaveKey}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="grading" className="mt-0 outline-none">
              <Card className="border-none shadow-2xl rounded-3xl overflow-hidden shadow-blue-200/50">
                <CardHeader className="bg-blue-50/50 border-b border-blue-100 p-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                      <UserCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black text-gray-800">Nhập Bài thi của Học sinh</CardTitle>
                      <CardDescription>Điền các lựa chọn của học sinh để bắt đầu quy trình chấm điểm.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ImprovedBubbleSheet 
                    mode="student" 
                    onSave={handleSaveSubmission}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="report" className="mt-0 outline-none">
              {studentSubmission && (
                <div className="space-y-8">
                  {/* Results Summary banner */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-green-600 text-white border-none shadow-lg rounded-2xl">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div>
                          <p className="text-green-100 text-xs font-bold uppercase tracking-wider mb-1">Trạng thái chấm</p>
                          <p className="text-2xl font-black">HOÀN TẤT</p>
                        </div>
                        <CheckCircle2 className="w-10 h-10 text-green-300 opacity-50" />
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-600 text-white border-none shadow-lg rounded-2xl">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Mã đề</p>
                          <p className="text-2xl font-black">101</p>
                        </div>
                        <ClipboardCheck className="w-10 h-10 text-blue-300 opacity-50" />
                      </CardContent>
                    </Card>
                    <Card className="bg-amber-500 text-white border-none shadow-lg rounded-2xl">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div>
                          <p className="text-amber-50 text-xs font-bold uppercase tracking-wider mb-1">Lưu ý</p>
                          <p className="text-base font-bold">Cần giáo viên duyệt Tự luận</p>
                        </div>
                        <AlertCircle className="w-10 h-10 text-amber-200 opacity-50" />
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-none shadow-2xl rounded-3xl overflow-hidden shadow-green-200/50">
                    <CardHeader className="bg-green-50/50 border-b border-green-100 p-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                          <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-black text-gray-800">Kết quả So sánh Chi tiết</CardTitle>
                          <CardDescription>Báo cáo so khớp từng câu hỏi giữa bài làm và đáp án mẫu.</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ImprovedBubbleSheet 
                        mode="review" 
                        initialData={studentSubmission}
                        officialKey={officialKey}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
