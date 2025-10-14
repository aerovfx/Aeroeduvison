"use client"

import { useState } from "react";
import { Sparkles, TrendingDown, TrendingUp, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OptimizerProps {
  apiEndpoint: string;
  onOptimizationComplete?: (result: any) => void;
}

export function AerodynamicsOptimizer({ apiEndpoint, onOptimizationComplete }: OptimizerProps) {
  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [target, setTarget] = useState<'low_drag' | 'high_lift'>('low_drag');

  const runOptimization = async () => {
    setOptimizing(true);
    setResults(null);

    try {
      const response = await fetch(`${apiEndpoint}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      });

      if (!response.ok) throw new Error('Optimization failed');

      const data = await response.json();
      setResults(data);
      
      if (onOptimizationComplete) {
        onOptimizationComplete(data);
      }
    } catch (error) {
      console.error('Optimization error:', error);
      alert('Lỗi khi tối ưu hóa. Vui lòng thử lại.');
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Tối ưu hóa hình dạng với AI
        </CardTitle>
        <CardDescription>
          Sử dụng AI để tìm hình dạng tối ưu dựa trên mục tiêu aerodynamic
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Target Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Mục tiêu tối ưu</label>
          <Tabs value={target} onValueChange={(v: any) => setTarget(v)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="low_drag" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Giảm lực cản
              </TabsTrigger>
              <TabsTrigger value="high_lift" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Tăng lực nâng
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="text-sm text-gray-600">
            {target === 'low_drag' 
              ? 'Tìm hình dạng có lực cản thấp nhất (tốc độ cao, tiết kiệm năng lượng)'
              : 'Tìm hình dạng tạo lực nâng lớn nhất (cánh máy bay, cánh tua-bin)'}
          </p>
        </div>

        {/* Optimize Button */}
        <Button 
          onClick={runOptimization}
          disabled={optimizing}
          className="w-full"
          size="lg"
        >
          {optimizing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Đang tối ưu hóa...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Chạy tối ưu hóa AI
            </>
          )}
        </Button>

        {/* Results */}
        {results && results.bestShapes && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Tối ưu hóa hoàn tất!</span>
            </div>

            {/* Best Shape */}
            {results.recommendation && (
              <Card className="border-2 border-yellow-500 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-600" />
                    Hình dạng tốt nhất
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {results.recommendation.name}
                    </div>
                    <Badge variant="default" className="mt-2">
                      Điểm: {results.recommendation.score?.toFixed(4)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Hệ số lực cản</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {results.recommendation.dragCoefficient?.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Hệ số lực nâng</div>
                      <div className="text-lg font-semibold text-purple-600">
                        {results.recommendation.liftCoefficient?.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Results */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700">Tất cả kết quả:</h4>
              {results.bestShapes.map((shape: any, idx: number) => (
                <Card key={idx} className={idx === 0 ? 'border-yellow-300' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{shape.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Cd: {shape.dragCoefficient?.toFixed(4)} | 
                          Cl: {shape.liftCoefficient?.toFixed(4)}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={idx === 0 ? "default" : "secondary"}>
                          #{idx + 1}
                        </Badge>
                        <div className="text-sm text-gray-600 mt-1">
                          Score: {shape.score?.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <div className="font-medium text-blue-900 mb-2">💡 Cách hoạt động</div>
          <ul className="text-blue-800 space-y-1 list-disc list-inside">
            <li>AI test nhiều hình dạng khác nhau</li>
            <li>Chạy simulation cho từng hình dạng</li>
            <li>So sánh kết quả và chọn hình dạng tốt nhất</li>
            <li>Sử dụng thuật toán tối ưu hóa</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

