/**
 * Theme Toggle Component
 * Switch between Dark and Light modes
 */

"use client"

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const preferred = savedTheme || (prefersDark ? 'dark' : 'light')
    setTheme(preferred)
    document.documentElement.classList.toggle('dark', preferred === 'dark')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  if (!mounted) {
    return (
      <button 
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-all duration-200"
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5" />
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg 
        hover:bg-gray-100 dark:hover:bg-white/[0.04] 
        transition-all duration-200 
        group"
      title={theme === 'light' ? 'Chuyển chế độ tối' : 'Chuyển chế độ sáng'}
      aria-label="Toggle theme"
    >
      <div className="relative w-5 h-5">
        <Sun 
          className={`w-5 h-5 absolute inset-0 transition-all duration-300 
            ${theme === 'light' 
              ? 'opacity-100 rotate-0 scale-100 text-yellow-500' 
              : 'opacity-0 -rotate-90 scale-50 text-yellow-400'
            }`}
        />
        <Moon 
          className={`w-5 h-5 absolute inset-0 transition-all duration-300 
            ${theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100 text-indigo-400' 
              : 'opacity-0 rotate-90 scale-50 text-gray-600'
            }`}
        />
      </div>
    </button>
  )
}
