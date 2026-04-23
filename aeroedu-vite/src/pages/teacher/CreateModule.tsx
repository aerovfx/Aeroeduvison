import { useState } from 'react';
import { BookOpen, Save, X, ArrowUp, ArrowDown, Eye, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Chapter {
  id: number;
  title: string;
  content: string;
  videoUrl: string;
}

const DEMO_CHAPTERS: Chapter[] = [
  { id: 1, title: 'Giới thiệu Hàm số', content: 'Bài giảng về định nghĩa và tính chất cơ bản của hàm số', videoUrl: 'https://youtube.com/watch?v=demo1' },
  { id: 2, title: 'Tập xác định và Giá trị', content: 'Chi tiết về cách tìm tập xác định và tập giá trị', videoUrl: 'https://youtube.com/watch?v=demo2' },
  { id: 3, title: 'Hàm số Đơn điệu', content: 'Khái niệm tính đơn điệu, hàm đồng biến và nghịch biến', videoUrl: 'https://youtube.com/watch?v=demo3' },
];

export default function CreateModule() {
  const [title, setTitle] = useState('Toán 10 - Chương 1: Hàm số');
  const [description, setDescription] = useState('Module học toàn diện về hàm số, bao gồm định nghĩa, tính chất và các ứng dụng.');
  const [chapters, setChapters] = useState(DEMO_CHAPTERS);
  const [isFreePreview, setIsFreePreview] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [duration, setDuration] = useState('4');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [previewMode, setPreviewMode] = useState(false);

  const handleMoveChapter = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === chapters.length - 1)) {
      return;
    }
    const newChapters = [...chapters];
    if (direction === 'up') {
      [newChapters[index], newChapters[index - 1]] = [newChapters[index - 1], newChapters[index]];
    } else {
      [newChapters[index], newChapters[index + 1]] = [newChapters[index + 1], newChapters[index]];
    }
    setChapters(newChapters);
    setSaveStatus('unsaved');
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 1000);
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Tạo Module Khóa học</h1>
        </div>
        <div className="text-right">
          {saveStatus === 'saved' && <p className="text-xs text-green-600 font-medium">Đã lưu</p>}
          {saveStatus === 'saving' && <p className="text-xs text-yellow-600 font-medium">Đang lưu...</p>}
          {saveStatus === 'unsaved' && <p className="text-xs text-red-600 font-medium">Chưa lưu</p>}
        </div>
      </div>

      {previewMode ? (
        // Preview Mode
        <div className="bg-card border border-border rounded-xl p-8">
          <button
            onClick={() => setPreviewMode(false)}
            className="mb-6 px-4 py-2 text-sm font-medium bg-secondary rounded-lg hover:bg-secondary/90"
          >
            Quay lại chỉnh sửa
          </button>
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold mb-3">{title}</h1>
            <p className="text-muted-foreground mb-8 text-lg">{description}</p>
            <div className="bg-muted rounded-xl p-6 mb-8">
              <p className="text-sm font-medium mb-4">Nội dung khóa học:</p>
              <div className="space-y-2">
                {chapters.map((ch) => (
                  <div key={ch.id} className="p-3 bg-background rounded-lg">
                    <p className="font-medium">{ch.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{ch.content}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Thời lượng</p>
                <p className="text-lg font-bold">{duration} giờ</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Trạng thái</p>
                <p className="text-lg font-bold">{isPublished ? 'Đã xuất bản' : 'Nháp'}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Edit Mode
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Module Info */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Thông tin Module</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tên Module</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setSaveStatus('unsaved');
                    }}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Tên module khóa học"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Mô tả</label>
                  <textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setSaveStatus('unsaved');
                    }}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    rows={3}
                    placeholder="Mô tả chi tiết về nội dung module"
                  />
                </div>
              </div>
            </div>

            {/* Chapters */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Chương học</h2>
              <div className="space-y-3">
                {chapters.map((chapter, idx) => (
                  <div key={chapter.id} className="p-4 bg-background border border-border rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{chapter.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{chapter.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">Video: {chapter.videoUrl}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMoveChapter(idx, 'up')}
                          disabled={idx === 0}
                          className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-border"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveChapter(idx, 'down')}
                          disabled={idx === chapters.length - 1}
                          className="p-2 hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-border"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-muted rounded-lg border border-border">
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 px-4 py-2 border border-dashed border-border rounded-lg hover:bg-background font-medium text-sm">
                + Thêm chương
              </button>
            </div>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-6">
            {/* Settings Card */}
            <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Cài đặt</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Thời lượng (giờ)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => {
                      setDuration(e.target.value);
                      setSaveStatus('unsaved');
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFreePreview}
                      onChange={(e) => {
                        setIsFreePreview(e.target.checked);
                        setSaveStatus('unsaved');
                      }}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm font-medium">Cho phép xem trước miễn phí</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => {
                        setIsPublished(e.target.checked);
                        setSaveStatus('unsaved');
                      }}
                      className="w-4 h-4 rounded border-border"
                    />
                    <span className="text-sm font-medium">Xuất bản ngay</span>
                  </label>
                </div>

                <button
                  onClick={() => setPreviewMode(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/90 font-medium"
                >
                  <Eye className="w-4 h-4" />
                  Xem trước
                </button>

                <button
                  onClick={handleSave}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-white',
                    saveStatus === 'unsaved' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-primary hover:bg-primary/90'
                  )}
                >
                  <Save className="w-4 h-4" />
                  {saveStatus === 'saving' ? 'Đang lưu...' : 'Lưu Module'}
                </button>

                <button className="w-full px-4 py-2 border border-border rounded-xl hover:bg-background font-medium text-sm">
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
