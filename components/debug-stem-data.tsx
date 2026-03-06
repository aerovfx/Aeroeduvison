"use client";

import { useEffect, useState } from 'react';

export default function DebugSTEMData() {
  const [stemData, setStemData] = useState<any>(null);
  const [localStorageData, setLocalStorageData] = useState<any>(null);

  useEffect(() => {
    // Check localStorage data
    const stemProjectsData = localStorage.getItem('stem-projects');
    if (stemProjectsData) {
      try {
        const parsed = JSON.parse(stemProjectsData);
        setLocalStorageData(parsed);
        console.log('Debug: Found STEM data in localStorage:', parsed.length, 'projects');
      } catch (error) {
        console.error('Debug: Error parsing localStorage data:', error);
      }
    } else {
      console.log('Debug: No STEM data found in localStorage');
    }
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Debug STEM Data</h3>
      <div>
        <p>localStorage projects: {localStorageData ? localStorageData.length : 0}</p>
        {localStorageData && (
          <div className="mt-2">
            <p className="font-semibold">First 3 projects:</p>
            {localStorageData.slice(0, 3).map((project: any, index: number) => (
              <p key={index} className="text-xs">
                {index + 1}. {project.title}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
