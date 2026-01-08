"use client"

import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"

interface Topic {
  id: string
  order: number
  topic: string
  content: string
  distributions: {
    questionType: string
    cognitiveLevel: string
    count: number
  }[]
  percentageScore?: number
}

interface MatrixTableProps {
  topics: Topic[]
  totalScore: number
  onUpdateTopic: (topicId: string, updates: Partial<Topic>) => void
  onUpdateDistribution: (
    topicId: string,
    questionType: string,
    cognitiveLevel: string,
    count: number
  ) => void
  onDeleteTopic: (topicId: string) => void
}

const QUESTION_TYPES = [
  { value: "TNKQ_Nhiều_lựa_chọn", label: "Nhiều lựa chọn" },
  { value: "TNKQ_Đúng_Sai", label: "Đúng - Sai" },
  { value: "TNKQ_Trả_lời_ngắn", label: "Trả lời ngắn" },
  { value: "Tự_luận", label: "Tự luận" },
]

const COGNITIVE_LEVELS = ["Biết", "Hiểu", "Vận dụng"]

export function MatrixTable({
  topics,
  totalScore,
  onUpdateTopic,
  onUpdateDistribution,
  onDeleteTopic,
}: MatrixTableProps) {
  const getDistributionCount = (
    topic: Topic,
    questionType: string,
    cognitiveLevel: string
  ): number => {
    const dist = topic.distributions.find(
      (d) =>
        d.questionType === questionType && d.cognitiveLevel === cognitiveLevel
    )
    return dist?.count || 0
  }

  const calculateTotal = (
    questionType: string,
    cognitiveLevel: string
  ): number => {
    return topics.reduce((sum, topic) => {
      return sum + getDistributionCount(topic, questionType, cognitiveLevel)
    }, 0)
  }

  const calculateTopicTotal = (topic: Topic, cognitiveLevel: string): number => {
    return topic.distributions
      .filter((d) => d.cognitiveLevel === cognitiveLevel)
      .reduce((sum, d) => sum + d.count, 0)
  }

  const calculateGrandTotal = (cognitiveLevel: string): number => {
    return topics.reduce((sum, topic) => sum + calculateTopicTotal(topic, cognitiveLevel), 0)
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">TT</TableHead>
            <TableHead className="min-w-[200px]">Chủ đề</TableHead>
            <TableHead className="min-w-[150px]">Nội dung/Đơn vị kiến thức</TableHead>
            <TableHead colSpan={3} className="text-center">
              Mức độ đánh giá
            </TableHead>
            <TableHead className="w-20">% Điểm</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
          <TableRow>
            <TableHead></TableHead>
            <TableHead></TableHead>
            <TableHead></TableHead>
            {/* TNKQ Header */}
            <TableHead colSpan={9} className="text-center bg-gray-50">
              TNKQ
            </TableHead>
            <TableHead colSpan={3} className="text-center bg-gray-50">
              Tự luận
            </TableHead>
            <TableHead colSpan={3} className="text-center bg-gray-50">
              Tổng
            </TableHead>
            <TableHead></TableHead>
            <TableHead></TableHead>
          </TableRow>
          <TableRow>
            <TableHead></TableHead>
            <TableHead></TableHead>
            <TableHead></TableHead>
            {/* Nhiều lựa chọn */}
            <TableHead className="text-center bg-gray-100">Nhiều lựa chọn</TableHead>
            <TableHead className="text-center bg-gray-100">Biết</TableHead>
            <TableHead className="text-center bg-gray-100">Hiểu</TableHead>
            <TableHead className="text-center bg-gray-100">Vận dụng</TableHead>
            {/* Đúng - Sai */}
            <TableHead className="text-center bg-gray-100">Đúng - Sai</TableHead>
            <TableHead className="text-center bg-gray-100">Biết</TableHead>
            <TableHead className="text-center bg-gray-100">Hiểu</TableHead>
            <TableHead className="text-center bg-gray-100">Vận dụng</TableHead>
            {/* Trả lời ngắn */}
            <TableHead className="text-center bg-gray-100">Trả lời ngắn</TableHead>
            <TableHead className="text-center bg-gray-100">Biết</TableHead>
            <TableHead className="text-center bg-gray-100">Hiểu</TableHead>
            <TableHead className="text-center bg-gray-100">Vận dụng</TableHead>
            {/* Tự luận */}
            <TableHead className="text-center bg-blue-50">Biết</TableHead>
            <TableHead className="text-center bg-blue-50">Hiểu</TableHead>
            <TableHead className="text-center bg-blue-50">Vận dụng</TableHead>
            {/* Tổng */}
            <TableHead className="text-center bg-green-50">Biết</TableHead>
            <TableHead className="text-center bg-green-50">Hiểu</TableHead>
            <TableHead className="text-center bg-green-50">Vận dụng</TableHead>
            <TableHead></TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {topics.map((topic) => (
            <TableRow key={topic.id}>
              <TableCell className="text-center">{topic.order}</TableCell>
              <TableCell>
                <Input
                  value={topic.topic}
                  onChange={(e) =>
                    onUpdateTopic(topic.id, { topic: e.target.value })
                  }
                  placeholder="Nhập chủ đề"
                  className="min-w-[200px]"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={topic.content}
                  onChange={(e) =>
                    onUpdateTopic(topic.id, { content: e.target.value })
                  }
                  placeholder="Nội dung..."
                  className="min-w-[150px]"
                />
              </TableCell>
              {/* TNKQ - Nhiều lựa chọn */}
              {COGNITIVE_LEVELS.map((level) => (
                <TableCell key={`mc-${level}`} className="p-1">
                  <Input
                    type="number"
                    min="0"
                    value={getDistributionCount(topic, "TNKQ_Nhiều_lựa_chọn", level)}
                    onChange={(e) =>
                      onUpdateDistribution(
                        topic.id,
                        "TNKQ_Nhiều_lựa_chọn",
                        level,
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-16 text-center"
                  />
                </TableCell>
              ))}
              {/* TNKQ - Đúng - Sai */}
              {COGNITIVE_LEVELS.map((level) => (
                <TableCell key={`tf-${level}`} className="p-1">
                  <Input
                    type="number"
                    min="0"
                    value={getDistributionCount(topic, "TNKQ_Đúng_Sai", level)}
                    onChange={(e) =>
                      onUpdateDistribution(
                        topic.id,
                        "TNKQ_Đúng_Sai",
                        level,
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-16 text-center"
                  />
                </TableCell>
              ))}
              {/* TNKQ - Trả lời ngắn */}
              {COGNITIVE_LEVELS.map((level) => (
                <TableCell key={`sa-${level}`} className="p-1">
                  <Input
                    type="number"
                    min="0"
                    value={getDistributionCount(topic, "TNKQ_Trả_lời_ngắn", level)}
                    onChange={(e) =>
                      onUpdateDistribution(
                        topic.id,
                        "TNKQ_Trả_lời_ngắn",
                        level,
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-16 text-center"
                  />
                </TableCell>
              ))}
              {/* Tự luận */}
              {COGNITIVE_LEVELS.map((level) => (
                <TableCell key={`essay-${level}`} className="p-1 bg-blue-50">
                  <Input
                    type="number"
                    min="0"
                    value={getDistributionCount(topic, "Tự_luận", level)}
                    onChange={(e) =>
                      onUpdateDistribution(
                        topic.id,
                        "Tự_luận",
                        level,
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-16 text-center"
                  />
                </TableCell>
              ))}
              {/* Tổng */}
              {COGNITIVE_LEVELS.map((level) => (
                <TableCell key={`total-${level}`} className="text-center bg-green-50 font-medium">
                  {calculateTopicTotal(topic, level) || "-"}
                </TableCell>
              ))}
              <TableCell className="text-center font-medium">
                {topic.percentageScore || 0}%
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteTopic(topic.id)}
                  className="h-8 w-8 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="font-bold">
            <TableCell colSpan={3}>TỔNG SỐ CÂU</TableCell>
            {/* TNKQ - Nhiều lựa chọn */}
            <TableCell></TableCell>
            {COGNITIVE_LEVELS.map((level) => (
              <TableCell key={`mc-total-${level}`} className="text-center">
                {calculateTotal("TNKQ_Nhiều_lựa_chọn", level)}
              </TableCell>
            ))}
            {/* TNKQ - Đúng - Sai */}
            <TableCell></TableCell>
            {COGNITIVE_LEVELS.map((level) => (
              <TableCell key={`tf-total-${level}`} className="text-center">
                {calculateTotal("TNKQ_Đúng_Sai", level)}
              </TableCell>
            ))}
            {/* TNKQ - Trả lời ngắn */}
            <TableCell></TableCell>
            {COGNITIVE_LEVELS.map((level) => (
              <TableCell key={`sa-total-${level}`} className="text-center">
                {calculateTotal("TNKQ_Trả_lời_ngắn", level)}
              </TableCell>
            ))}
            {/* Tự luận */}
            {COGNITIVE_LEVELS.map((level) => (
              <TableCell key={`essay-total-${level}`} className="text-center bg-blue-50">
                {calculateTotal("Tự_luận", level)}
              </TableCell>
            ))}
            {/* Tổng */}
            {COGNITIVE_LEVELS.map((level) => (
              <TableCell key={`grand-total-${level}`} className="text-center bg-green-50">
                {calculateGrandTotal(level)}
              </TableCell>
            ))}
            <TableCell className="text-center">100%</TableCell>
            <TableCell></TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={3}>TỔNG SỐ ĐIỂM</TableCell>
            <TableCell colSpan={12}></TableCell>
            <TableCell colSpan={3} className="text-center bg-green-50">
              {totalScore}
            </TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={3}>TỈ LỆ %</TableCell>
            <TableCell colSpan={18} className="text-muted-foreground text-sm">
              Tự động tính toán khi lưu
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
