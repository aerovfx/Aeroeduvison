/**
 * LanguagePicker — standalone dropdown component
 * Dùng trên auth pages, navbar, hoặc bất kỳ đâu cần chuyển ngôn ngữ.
 */
import { useState, useRef, useEffect } from 'react'
import { Globe, Check } from 'lucide-react'
import { useLanguage, type Language } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

const LANG_OPTIONS: Array<{ value: Language; label: string; flag: string; short: string }> = [
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', short: 'VI' },
  { value: 'en', label: 'English',    flag: '🇺🇸', short: 'EN' },
]

interface LanguagePickerProps {
  /** Show full label text (default: true on desktop, short on mobile via CSS) */
  showLabel?: boolean
  /** Extra class on the trigger button */
  className?: string
}

export function LanguagePicker({ showLabel = true, className }: LanguagePickerProps) {
  const { language, setLanguage, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANG_OPTIONS.find((o) => o.value === language)!

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('language')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
          'border border-border text-muted-foreground hover:text-foreground hover:bg-accent',
          open && 'bg-accent text-foreground',
          className,
        )}
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        {showLabel && (
          <span className="hidden sm:inline">{current.short}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[190]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-card border border-border rounded-xl shadow-lg z-[200] overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                {t('language')}
              </p>
            </div>

            {/* Options */}
            <div className="p-1">
              {LANG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setLanguage(opt.value); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                    language === opt.value
                      ? 'bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,58%)]'
                      : 'text-foreground hover:bg-accent',
                  )}
                >
                  <span className="text-base leading-none">{opt.flag}</span>
                  <span className="flex-1 font-medium">{opt.label}</span>
                  {language === opt.value && (
                    <Check className="w-3.5 h-3.5 text-[hsl(262,83%,58%)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
