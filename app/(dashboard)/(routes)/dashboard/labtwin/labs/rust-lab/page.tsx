'use client';

import React, { useState } from 'react';
import { 
  Box, Lock, AlertTriangle, CheckCircle, Cpu, Zap, Shield, 
  Code, ArrowRight, RefreshCw, Terminal, Server, Gamepad2, 
  Database, Globe, BookOpen, ChevronRight, ChevronLeft
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// --- BÀI 1: SO SÁNH NGÔN NGỮ ---
const Lesson1 = () => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Rust khác biệt như thế nào?</h2>
        <p className="text-gray-600 mt-2">So sánh Rust với các ngôn ngữ phổ biến khác để hiểu lý do nó ra đời.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* C/C++ */}
        <Card className="border-2 border-red-200 hover:shadow-md transition">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Cpu className="text-red-500 w-8 h-8" />
              <CardTitle className="text-xl">C / C++</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-2"/> Tốc độ cực nhanh</li>
              <li className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-2"/> Kiểm soát phần cứng</li>
              <li className="flex items-center text-red-500"><AlertTriangle className="w-4 h-4 mr-2"/> Dễ bị lỗi bộ nhớ (Crash)</li>
              <li className="flex items-center text-red-500"><AlertTriangle className="w-4 h-4 mr-2"/> Quản lý bộ nhớ thủ công</li>
            </ul>
          </CardContent>
        </Card>

        {/* Python */}
        <Card className="border-2 border-blue-200 hover:shadow-md transition">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Code className="text-blue-500 w-8 h-8" />
              <CardTitle className="text-xl">Python</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-2"/> Cú pháp đơn giản</li>
              <li className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-2"/> Quản lý bộ nhớ tự động (GC)</li>
              <li className="flex items-center text-red-500"><AlertTriangle className="w-4 h-4 mr-2"/> Tốc độ thực thi chậm</li>
              <li className="flex items-center text-red-500"><AlertTriangle className="w-4 h-4 mr-2"/> Tiêu tốn nhiều RAM</li>
            </ul>
          </CardContent>
        </Card>

        {/* Rust */}
        <Card className="border-2 border-orange-400 bg-orange-50 hover:shadow-md transition relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-orange-400 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">LỰA CHỌN TỐI ƯU</div>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Shield className="text-orange-500 w-8 h-8" />
              <CardTitle className="text-xl">Rust</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-2"/> Tốc độ ngang ngửa C++</li>
              <li className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-2"/> An toàn bộ nhớ tuyệt đối</li>
              <li className="flex items-center text-green-600"><CheckCircle className="w-4 h-4 mr-2"/> Không cần Garbage Collector</li>
              <li className="flex items-center text-orange-600"><AlertTriangle className="w-4 h-4 mr-2"/> Đường cong học tập dốc</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Zap className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
            <p className="text-blue-800"><strong>Thông điệp:</strong> Rust được tạo ra để giải quyết bài toán: Làm sao để có được <em>tốc độ của C++</em> nhưng không phải đánh đổi bằng <em>sự thiếu an toàn</em> của nó.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- BÀI 2: OWNERSHIP ---
const Lesson2 = () => {
  const [owner, setOwner] = useState('a');

  const moveData = () => setOwner('b');
  const reset = () => setOwner('a');

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Quyền sở hữu (Ownership)</h2>
        <p className="text-gray-600 mt-2">Mỗi dữ liệu chỉ có <strong>MỘT</strong> chủ sở hữu duy nhất tại một thời điểm.</p>
      </div>

      <Card className="bg-gray-900">
        <CardContent className="pt-6">
          <pre className="text-green-400 font-mono text-sm">
            <div><span className="text-purple-400">let</span> a = String::from(<span className="text-yellow-300">"Hello Rust"</span>);</div>
            <div><span className="text-purple-400">let</span> b = a; <span className="text-gray-500">// Bấm nút bên dưới để thực thi dòng này</span></div>
            {owner === 'b' && (
              <div className="text-red-400 mt-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                println!("a: {}", a); // LỖI COMPILER!
              </div>
            )}
          </pre>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row items-center justify-center space-y-6 md:space-y-0 md:space-x-12 p-8 bg-gray-50 rounded-xl border border-gray-200">
        {/* Biến A */}
        <div className={`relative w-48 h-48 rounded-xl border-4 flex flex-col items-center justify-center transition-all duration-500 ${owner === 'a' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-100 opacity-60'}`}>
          <div className="absolute top-2 left-3 font-bold text-gray-500">Biến `a`</div>
          {owner === 'a' ? (
            <div className="bg-orange-400 text-white p-3 rounded-lg font-bold shadow-lg animate-bounce flex items-center">
              <Box className="w-5 h-5 mr-2" /> "Hello Rust"
            </div>
          ) : (
            <Lock className="w-12 h-12 text-gray-400" />
          )}
          {owner === 'b' && <div className="absolute bottom-2 text-xs text-red-500 font-bold">ĐÃ BỊ KHÓA (MOVED)</div>}
        </div>

        {/* Action */}
        <div className="flex flex-col items-center space-y-4">
          <Button 
            onClick={moveData}
            disabled={owner === 'b'}
            className={`px-6 py-3 rounded-full font-bold transition-all flex items-center ${owner === 'a' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            let b = a; <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          
          <Button variant="ghost" onClick={reset} className="text-gray-500">
            <RefreshCw className="w-4 h-4 mr-1" /> Chơi lại
          </Button>
        </div>

        {/* Biến B */}
        <div className={`relative w-48 h-48 rounded-xl border-4 flex flex-col items-center justify-center transition-all duration-500 ${owner === 'b' ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50 border-dashed'}`}>
          <div className="absolute top-2 left-3 font-bold text-gray-500">Biến `b`</div>
          {owner === 'b' && (
             <div className="bg-orange-400 text-white p-3 rounded-lg font-bold shadow-lg flex items-center">
               <Box className="w-5 h-5 mr-2" /> "Hello Rust"
             </div>
          )}
        </div>
      </div>

      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="pt-6">
          <p className="text-orange-900"><strong>Bản chất:</strong> Khi bạn gán <code>b = a</code>, Rust không copy dữ liệu tốn kém. Nó <strong>chuyển quyền sở hữu</strong> sang <code>b</code> và đánh dấu <code>a</code> là không hợp lệ. Không bao giờ có chuyện 2 biến cùng trỏ vào 1 vùng nhớ để cùng dọn dẹp (tránh lỗi <em>Double Free</em>).</p>
        </CardContent>
      </Card>
    </div>
  );
};

// --- BÀI 3: BORROWING ---
const Lesson3 = () => {
  const [readers, setReaders] = useState(0);
  const [hasWriter, setHasWriter] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addReader = () => {
    if (hasWriter) {
      setErrorMsg("LỖI: Không thể tạo tham chiếu ĐỌC (&) khi đang có tham chiếu GHI (&mut).");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    setReaders(prev => prev + 1);
  };

  const addWriter = () => {
    if (readers > 0) {
      setErrorMsg("LỖI: Không thể tạo tham chiếu GHI (&mut) khi đang có tham chiếu ĐỌC (&).");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    if (hasWriter) {
      setErrorMsg("LỖI: Chỉ được phép có TỐI ĐA MỘT người MƯỢN GHI tại một thời điểm.");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    setHasWriter(true);
  };

  const reset = () => {
    setReaders(0);
    setHasWriter(false);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Mượn dữ liệu (Borrowing)</h2>
        <p className="text-gray-600 mt-2">Bạn có thể mượn dữ liệu thay vì lấy mất quyền sở hữu. Nhưng Rust có luật rất nghiêm ngặt.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="font-bold text-blue-800 flex items-center"><Box className="w-5 h-5 mr-2"/> Luật của Rust</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-blue-900 space-y-2">
              <li>Bạn có thể có <strong>vô số</strong> người MƯỢN ĐỌC <code>&T</code>.</li>
              <li><strong>HOẶC</strong> chỉ có duy nhất <strong>một</strong> người MƯỢN GHI <code>&mut T</code>.</li>
              <li>Không được có cả đọc và ghi cùng lúc!</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900">
          <CardContent className="pt-6">
            <pre className="font-mono text-sm text-green-400">
              <div><span className="text-purple-400">let mut</span> data = String::from("Sách");</div>
              <div className="text-gray-500 mt-2">// Mô phỏng bên dưới:</div>
              <div>Số người đang mượn đọc: <span className="text-blue-400 font-bold">{readers}</span></div>
              <div>Đang bị mượn ghi: <span className={hasWriter ? "text-red-400 font-bold" : "text-gray-500"}>{hasWriter ? "CÓ" : "KHÔNG"}</span></div>
            </pre>
          </CardContent>
        </Card>
      </div>

      {errorMsg && (
        <Card className="bg-red-100 border-l-4 border-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center text-red-700 animate-pulse">
              <AlertTriangle className="w-6 h-6 mr-3" />
              <p className="font-bold">{errorMsg}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="relative p-8 bg-white border-2 border-dashed border-gray-300">
        <CardContent>
          {/* Dữ liệu gốc */}
          <div className="bg-orange-500 text-white px-8 py-4 rounded-xl font-bold shadow-md z-10 relative text-center">
            Dữ liệu gốc ("Sách")
            {hasWriter && <div className="absolute -top-3 -right-3 bg-red-500 text-xs px-2 py-1 rounded-full animate-bounce">Đang bị sửa!</div>}
          </div>

          {/* Visualization */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 w-full min-h-[100px]">
            {Array.from({ length: readers }).map((_, i) => (
              <Badge key={`r-${i}`} variant="secondary" className="bg-blue-100 text-blue-800 border-2 border-blue-300 px-4 py-2 text-sm">
                &data (Đọc)
              </Badge>
            ))}
            {hasWriter && (
              <Badge variant="destructive" className="bg-red-100 text-red-800 border-2 border-red-400 px-4 py-2 text-sm font-bold">
                &mut data (Ghi/Sửa)
              </Badge>
            )}
            {readers === 0 && !hasWriter && (
              <div className="text-gray-400 italic">Chưa có ai mượn dữ liệu.</div>
            )}
          </div>

          {/* Buttons */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button onClick={addReader} className="bg-blue-500 hover:bg-blue-600">
              + Thêm người MƯỢN ĐỌC
            </Button>
            <Button onClick={addWriter} variant="destructive">
              + Đòi quyền MƯỢN GHI
            </Button>
            <Button onClick={reset} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" /> Trả lại hết
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- BÀI 4: MEMORY SAFETY ---
const Lesson4 = () => {
  const [cState, setCState] = useState<'idle' | 'running' | 'crashed'>('idle');
  const [rustState, setRustState] = useState<'idle' | 'compiling' | 'error'>('idle');

  const runC = () => {
    setCState('running');
    setTimeout(() => setCState('crashed'), 1000);
  };

  const runRust = () => {
    setRustState('compiling');
    setTimeout(() => setRustState('error'), 800);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">An toàn bộ nhớ (Memory Safety)</h2>
        <p className="text-gray-600 mt-2">Thử nghiệm lỗi "Sử dụng sau khi giải phóng" (Use-After-Free) kinh điển.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* C++ Panel */}
        <Card>
          <CardHeader className="bg-gray-200">
            <div className="flex justify-between items-center">
              <CardTitle>app.c (C/C++)</CardTitle>
              <Button onClick={runC} disabled={cState === 'running'} size="sm" className="bg-green-600 hover:bg-green-700">
                Biên dịch & Chạy
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className="bg-gray-900 p-4 text-gray-300 font-mono text-sm overflow-x-auto">
{`char* ptr = malloc(10);
strcpy(ptr, "Hello");

free(ptr); // Giải phóng bộ nhớ

printf("%s", ptr); // LỖI NGẦM: Vẫn cố in ra!`}
            </pre>
            <div className={`p-4 font-mono text-sm min-h-[100px] flex flex-col justify-end ${cState === 'crashed' ? 'bg-red-50 text-red-700' : 'bg-black text-green-400'}`}>
              {cState === 'idle' && <span>$ Nhấn chạy để xem kết quả...</span>}
              {cState === 'running' && <span>$ gcc app.c -o app && ./app<br/>Đang chạy...</span>}
              {cState === 'crashed' && (
                <div className="animate-pulse font-bold">
                  $ ./app<br/>
                  Segmentation fault (core dumped) 💥<br/>
                  <span className="text-xs text-red-500 font-normal mt-2 block">Hệ điều hành đã giật sập chương trình vì truy cập vùng nhớ rác!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rust Panel */}
        <Card className="border-orange-200">
          <CardHeader className="bg-orange-100">
            <div className="flex justify-between items-center">
              <CardTitle className="text-orange-900">app.rs (Rust)</CardTitle>
              <Button onClick={runRust} disabled={rustState === 'compiling'} size="sm" className="bg-orange-500 hover:bg-orange-600">
                Biên dịch
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className="bg-gray-900 p-4 text-gray-300 font-mono text-sm overflow-x-auto">
{`let data = String::from("Hello");

drop(data); // Giải phóng sớm

println!("{}", data); // Cố tình sử dụng lại`}
            </pre>
            <div className={`p-4 font-mono text-sm min-h-[100px] flex flex-col justify-end ${rustState === 'error' ? 'bg-orange-50 text-orange-800' : 'bg-black text-green-400'}`}>
              {rustState === 'idle' && <span>$ Nhấn biên dịch để xem Rust xử lý...</span>}
              {rustState === 'compiling' && <span>$ cargo build<br/>Compiling app v0.1.0...</span>}
              {rustState === 'error' && (
                <div>
                  <span className="text-red-600 font-bold">error[E0382]: use of moved value: `data`</span><br/>
                  <span className="text-gray-500 mt-1 block">Rust phát hiện lỗi NGAY LÚC BIÊN DỊCH và từ chối tạo ra file chạy!</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// --- BÀI 5: THỰC TẾ ---
const Lesson5 = () => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Rust trong thế giới thực</h2>
        <p className="text-gray-600 mt-2">Bởi vì nhanh và an toàn, Rust đang được sử dụng ở mọi nơi.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="hover:bg-orange-50 hover:border-orange-300 transition cursor-pointer">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Terminal className="w-10 h-10 text-gray-700 mb-3" />
            <h3 className="font-bold text-gray-800">Hệ điều hành</h3>
            <p className="text-xs text-gray-500 mt-2">Linux Kernel đã chính thức hỗ trợ viết module bằng Rust.</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-orange-50 hover:border-orange-300 transition cursor-pointer">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Globe className="w-10 h-10 text-blue-500 mb-3" />
            <h3 className="font-bold text-gray-800">Web Backend</h3>
            <p className="text-xs text-gray-500 mt-2">Actix, Axum xử lý hàng triệu request với RAM cực thấp.</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-orange-50 hover:border-orange-300 transition cursor-pointer">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Gamepad2 className="w-10 h-10 text-purple-500 mb-3" />
            <h3 className="font-bold text-gray-800">Game Engines</h3>
            <p className="text-xs text-gray-500 mt-2">Bevy Engine - nhanh chóng tạo ra các game hiệu năng cao.</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-orange-50 hover:border-orange-300 transition cursor-pointer">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Database className="w-10 h-10 text-green-500 mb-3" />
            <h3 className="font-bold text-gray-800">Cơ sở dữ liệu</h3>
            <p className="text-xs text-gray-500 mt-2">TiKV, Prisma query engines được viết bằng Rust.</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-orange-50 hover:border-orange-300 transition cursor-pointer">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Server className="w-10 h-10 text-red-500 mb-3" />
            <h3 className="font-bold text-gray-800">Công cụ Web3</h3>
            <p className="text-xs text-gray-500 mt-2">Blockchain Solana, Polkadot chọn Rust làm ngôn ngữ cốt lõi.</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-orange-50 hover:border-orange-300 transition cursor-pointer">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <Zap className="w-10 h-10 text-yellow-500 mb-3" />
            <h3 className="font-bold text-gray-800">Công cụ CLI</h3>
            <p className="text-xs text-gray-500 mt-2">Thay thế các công cụ cũ bằng phiên bản cực nhanh (rg, fd, bat).</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6 text-center">
          <h3 className="font-bold text-green-800 text-lg mb-2 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 mr-2"/> Chúc mừng bạn đã hoàn thành Rust Lab!
          </h3>
          <p className="text-green-700 text-sm">Bạn đã hiểu được trực giác đằng sau Ownership, Borrowing và lý do Rust được yêu thích. Bây giờ, bạn đã sẵn sàng cài đặt Cargo và viết những dòng code Rust đầu tiên của mình!</p>
        </CardContent>
      </Card>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function RustLabSimulation() {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, title: "Mở đầu", icon: Code },
    { id: 2, title: "Ownership", icon: Box },
    { id: 3, title: "Borrowing", icon: RefreshCw },
    { id: 4, title: "Memory", icon: Shield },
    { id: 5, title: "Thực tế", icon: Globe },
  ];

  const renderContent = () => {
    switch (currentStep) {
      case 1: return <Lesson1 />;
      case 2: return <Lesson2 />;
      case 3: return <Lesson3 />;
      case 4: return <Lesson4 />;
      case 5: return <Lesson5 />;
      default: return <Lesson1 />;
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-orange-500 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-wider">RUST <span className="text-orange-400">LAB</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400 hidden sm:block">Học Rust qua Trực Giác</div>
            <Badge variant="secondary" className="bg-orange-500/20 text-orange-300">
              <BookOpen className="w-3 h-3 mr-1" />
              Lập trình
            </Badge>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-gray-800">
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto w-full p-4 md:p-6 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <Card className="sticky top-24">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-sm font-bold text-gray-700">Tiến trình học</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible">
                {steps.map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isPassed = currentStep > step.id;
                  
                  return (
                    <li key={step.id} className="min-w-max md:min-w-0">
                      <button
                        onClick={() => setCurrentStep(step.id)}
                        className={`w-full text-left px-4 py-4 flex items-center transition-colors border-l-4 md:border-l-4 md:border-b-0 ${
                          isActive 
                            ? 'bg-orange-50 border-orange-500 text-orange-700' 
                            : isPassed 
                              ? 'hover:bg-gray-50 border-transparent text-gray-800' 
                              : 'hover:bg-gray-50 border-transparent text-gray-500'
                        }`}
                      >
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full mr-3 text-sm font-bold ${isActive ? 'bg-orange-200 text-orange-800' : isPassed ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                          {isPassed ? <CheckCircle className="w-5 h-5" /> : step.id}
                        </span>
                        <span className="font-medium">{step.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Content Panel */}
        <div className="flex-grow bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-10 min-h-[600px]">
          {renderContent()}
          
          {/* Navigation Buttons */}
          <div className="mt-12 flex justify-between pt-6 border-t border-gray-100">
            <Button 
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              variant="ghost"
              className="disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Bài trước
            </Button>
            <Button 
              onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
              disabled={currentStep === 5}
              className="bg-gray-900 hover:bg-orange-500 disabled:opacity-30"
            >
              {currentStep === 5 ? 'Hoàn thành' : 'Tiếp theo'} <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

      </main>
    </div>
  );
}
