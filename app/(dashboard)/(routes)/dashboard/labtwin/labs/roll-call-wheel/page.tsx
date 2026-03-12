'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Settings, Shuffle, Sparkles, Trash2, Trophy, UserPlus } from 'lucide-react';

const DEFAULT_STUDENTS = [
  'Nguyen Van A',
  'Tran Thi B',
  'Minh Tuan',
  'Nguyen Linh',
  'Tran Phuong',
  'Chi Hai',
  'Tuan Khang'
];

const WHEEL_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#96CEB4',
  '#FFEEAD',
  '#D4A5A5',
  '#9B59B6',
  '#3498DB'
];

function FireworkEffect({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId = 0;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
      size: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const createParticles = () => {
      const particleCount = 120;
      for (let i = 0; i < particleCount; i += 1) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          life: 90,
          color: WHEEL_COLORS[Math.floor(Math.random() * WHEEL_COLORS.length)],
          size: Math.random() * 5 + 2
        });
      }
    };

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 1;
        p.size *= 0.95;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
        if (p.life <= 0) particles.splice(index, 1);
      });
      if (particles.length > 0) {
        frameId = requestAnimationFrame(update);
      }
    };

    window.addEventListener('resize', resize);
    createParticles();
    update();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, [isActive]);

  if (!isActive) return null;

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
}

export default function RollCallWheelPage() {
  const [students, setStudents] = useState<string[]>(DEFAULT_STUDENTS);
  const [calledStudents, setCalledStudents] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  const availableStudents = useMemo(
    () => students.filter((name) => !calledStudents.includes(name)),
    [students, calledStudents]
  );

  const handleSpin = () => {
    if (availableStudents.length === 0 || isSpinning) return;
    setIsSpinning(true);
    setWinner(null);
    setShowConfetti(false);
    const randomDegree = Math.floor(Math.random() * 360);
    const newRotation = rotation + 360 * 5 + randomDegree;
    setRotation(newRotation);

    setTimeout(() => {
      calculateWinner(newRotation);
      setIsSpinning(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }, 4000);
  };

  const calculateWinner = (currentRotation: number) => {
    const count = availableStudents.length;
    if (count === 0) return;
    const degreePerSlice = 360 / count;
    const actualRotation = currentRotation % 360;
    const pointerAngle = 270;
    const relativeAngle = (pointerAngle - actualRotation + 360000) % 360;
    const winningIndex = Math.floor(relativeAngle / degreePerSlice);
    const winningStudent = availableStudents[winningIndex];
    if (!winningStudent) return;
    setWinner(winningStudent);
    setCalledStudents((prev) => [...prev, winningStudent]);
  };

  const handleReset = () => {
    setCalledStudents([]);
    setWinner(null);
    setRotation(0);
    setShowConfetti(false);
  };

  const addStudent = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newStudentName.trim()) return;
    setStudents((prev) => [...prev, newStudentName.trim()]);
    setNewStudentName('');
  };

  const removeStudent = (name: string) => {
    setStudents((prev) => prev.filter((s) => s !== name));
    if (calledStudents.includes(name)) {
      setCalledStudents((prev) => prev.filter((s) => s !== name));
    }
  };

  const renderWheel = () => {
    if (availableStudents.length === 0) {
      return (
        <div className="w-64 h-64 rounded-full bg-slate-200 flex items-center justify-center border-4 border-slate-300">
          <span className="text-slate-500 font-bold">Het danh sach!</span>
        </div>
      );
    }

    const radius = 100;
    const center = 100;
    const sliceAngle = 360 / availableStudents.length;

    if (availableStudents.length === 1) {
      return (
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full transform transition-transform duration-[4000ms] cubic-bezier(0.1, 0, 0.2, 1)"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <circle cx="100" cy="100" r="98" fill={WHEEL_COLORS[0]} stroke="white" strokeWidth="2" />
          <text x="100" y="100" textAnchor="middle" dy=".3em" fill="white" fontSize="20" fontWeight="bold">
            {availableStudents[0]}
          </text>
        </svg>
      );
    }

    return (
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full transform transition-transform duration-[4000ms] cubic-bezier(0.25, 0.1, 0.25, 1)"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {availableStudents.map((student, index) => {
          const startAngle = index * sliceAngle;
          const endAngle = (index + 1) * sliceAngle;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const x1 = center + radius * Math.cos(startRad);
          const y1 = center + radius * Math.sin(startRad);
          const x2 = center + radius * Math.cos(endRad);
          const y2 = center + radius * Math.sin(endRad);
          const largeArcFlag = sliceAngle > 180 ? 1 : 0;
          const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
          const midAngle = startAngle + sliceAngle / 2;
          return (
            <g key={index}>
              <path d={pathData} fill={WHEEL_COLORS[index % WHEEL_COLORS.length]} stroke="white" strokeWidth="1" />
              <text
                x="115"
                y="100"
                fill="white"
                fontSize="10"
                fontWeight="bold"
                textAnchor="start"
                alignmentBaseline="middle"
                transform={`rotate(${midAngle}, 100, 100)`}
              >
                {student.length > 12 ? `${student.substring(0, 10)}...` : student}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center p-4 text-slate-800 overflow-hidden">
      <FireworkEffect isActive={showConfetti} />

      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] relative z-10">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-20">
          <div>
            <h1 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Vong quay goi ten
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Si so: {students.length} | Chua goi: {availableStudents.length}
            </p>
          </div>
          <button
            onClick={() => setShowEdit((prev) => !prev)}
            className={`p-2 rounded-full transition-colors ${
              showEdit ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4 flex flex-col items-center justify-center bg-indigo-50/50 relative overflow-hidden">
          <div
            className={`absolute top-4 left-0 right-0 text-center z-30 transition-all duration-500 ${
              winner ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            <div className="inline-block bg-white px-6 py-2 rounded-full shadow-lg border-2 border-yellow-400">
              <span className="text-sm text-slate-400 uppercase font-bold mr-2">Nguoi duoc chon:</span>
              <span className="text-xl font-black text-indigo-600">{winner}</span>
              <Trophy className="inline-block w-5 h-5 text-yellow-500 ml-2 mb-1" />
            </div>
          </div>

          <div className="relative w-72 h-72 md:w-80 md:h-80 my-8">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-red-500 drop-shadow-md" />
            </div>

            <div className="absolute inset-[-10px] rounded-full border-4 border-white/50 shadow-xl" />
            <div className="absolute inset-[-4px] rounded-full border-4 border-indigo-200" />

            <div className="w-full h-full rounded-full overflow-hidden shadow-2xl bg-white border-2 border-white">
              {renderWheel()}
            </div>

            <div className="absolute top-1/2 left-1/2 w-12 h-12 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-inner border-4 border-indigo-100 flex items-center justify-center z-10">
              <div className="w-8 h-8 bg-indigo-500 rounded-full shadow-lg" />
            </div>
          </div>

          <div className="flex gap-4 z-20 w-full px-8 justify-center">
            <button
              onClick={handleSpin}
              disabled={isSpinning || availableStudents.length === 0}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-lg font-bold shadow-lg transition-all transform active:scale-95 ${
                availableStudents.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : isSpinning
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-300/50 hover:shadow-indigo-400/50'
              }`}
            >
              {isSpinning ? (
                <span>Dang quay...</span>
              ) : (
                <>
                  <Shuffle size={20} /> QUAY NGAY
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              disabled={isSpinning}
              className="px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm"
              title="Lam moi"
            >
              <RefreshCw size={24} />
            </button>
          </div>
        </div>

        <div className={`bg-white border-t border-slate-200 transition-all duration-300 overflow-hidden flex flex-col ${showEdit ? 'h-64' : 'h-0'}`}>
          <form className="p-3 bg-slate-50 border-b border-slate-100 flex gap-2" onSubmit={addStudent}>
            <input
              type="text"
              value={newStudentName}
              onChange={(event) => setNewStudentName(event.target.value)}
              placeholder="Nhap ten hoc sinh..."
              className="flex-1 px-3 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
            />
            <button type="submit" className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">
              <UserPlus size={18} />
            </button>
          </form>

          <div className="overflow-y-auto p-2 flex-1">
            <div className="flex flex-wrap gap-2">
              {students.map((student, index) => {
                const isCalled = calledStudents.includes(student);
                return (
                  <div
                    key={`${student}-${index}`}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
                      isCalled
                        ? 'bg-slate-100 border-slate-200 text-slate-400'
                        : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                    }`}
                  >
                    <span>{student}</span>
                    <button onClick={() => removeStudent(student)} className="hover:text-red-500" type="button">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {!showEdit && (
          <div
            className="bg-slate-50 p-2 text-center text-xs text-slate-400 border-t border-slate-100 cursor-pointer hover:text-indigo-500"
            onClick={() => setShowEdit(true)}
          >
            Bam nut cai dat de xem/sua danh sach ({students.length} em)
          </div>
        )}
      </div>
    </div>
  );
}
