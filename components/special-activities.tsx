"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Trophy, TestTube, Target, Zap } from "lucide-react";

interface SpecialActivity {
  id: string;
  title: string;
  description: string;
  xp: number;
  isLocked: boolean;
  lockReason: string;
  icon: any;
  color: string;
}

export function SpecialActivities() {
  const activities: SpecialActivity[] = [
    {
      id: "test",
      title: "Kiểm tra",
      description: "Bài kiểm tra kiến thức cơ bản",
      xp: 30,
      isLocked: true,
      lockReason: "Hoàn thành ít nhất 5 bài học để mở khóa",
      icon: TestTube,
      color: "bg-blue-500"
    },
    {
      id: "treasure",
      title: "Kho báu",
      description: "Thu thập điểm thưởng và phần thưởng",
      xp: 0,
      isLocked: true,
      lockReason: "Đạt cấp độ 3 để mở khóa",
      icon: Trophy,
      color: "bg-yellow-500"
    },
    {
      id: "equations",
      title: "Hệ phương trình",
      description: "Giải hệ phương trình nâng cao",
      xp: 35,
      isLocked: true,
      lockReason: "Hoàn thành chương Đại số để mở khóa",
      icon: Target,
      color: "bg-green-500"
    },
    {
      id: "challenge",
      title: "Thử thách",
      description: "Thử thách lập trình Python",
      xp: 50,
      isLocked: true,
      lockReason: "Hoàn thành khóa Python cơ bản để mở khóa",
      icon: Zap,
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Hoạt động đặc biệt</h3>
      
      <div className="grid gap-4">
        {activities.map((activity) => {
          const IconComponent = activity.icon;
          
          return (
            <Card 
              key={activity.id} 
              className={`transition-all duration-200 ${
                activity.isLocked 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'hover:shadow-md cursor-pointer'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activity.color} text-white`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {activity.title}
                        {activity.isLocked && (
                          <Lock className="h-4 w-4 text-gray-400" />
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {activity.description}
                      </CardDescription>
                    </div>
                  </div>
                  
                  {activity.xp > 0 && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      +{activity.xp} XP
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {activity.isLocked ? (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    🔒 {activity.lockReason}
                  </div>
                ) : (
                  <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                    ✅ Sẵn sàng để tham gia
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

