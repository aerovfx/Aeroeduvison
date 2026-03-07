'use client';

"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from '@/contexts/LanguageContext';

export default function LabsSimplePage() {
  const { t } = useLanguage();
  
  const [labsData, setLabsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/labs/index.json')
      .then(r => r.json())
      .then(data => {
        setLabsData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8">{t('common.loading')}</div>;
  }

  if (!labsData) {
    return <div className="p-8">Error loading data</div>;
  }

  return (
    <div className="p-8">
      <Link href="/dashboard/labtwin" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Back
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Python Simulations</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {labsData.simulations.map((sim: any) => (
          <div key={sim.id} className="border rounded-lg p-6 hover:shadow-lg">
            <h2 className="text-xl font-bold mb-2">{sim.name}</h2>
            <p className="text-gray-600 mb-4">{sim.description}</p>
            <div className="flex gap-2 mb-4">
              <span className="text-xs bg-blue-100 px-2 py-1 rounded">{sim.category}</span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{sim.level}</span>
              <span className="text-xs bg-yellow-100 px-2 py-1 rounded">+{sim.xp} XP</span>
            
              </div>
            <Link 
              href={`/dashboard/labtwin/labs/${sim.id}`}
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Bắt đầu →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

