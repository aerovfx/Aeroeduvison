"use client"

import { useState } from "react"
import { Check, Settings2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  MATRIX_TYPES,
  AVAILABLE_SECTIONS,
  type MatrixSection,
  type MatrixTypeConfig,
} from "@/lib/constants/question-bank"

interface MatrixTypeSelectorProps {
  value: string                         // "type1" | "type2" | "type3" | "custom"
  customSections: MatrixSection[]       // only relevant when value === "custom"
  sectionScores: Record<string, number>
  totalScore: number
  onChange: (
    matrixType: string,
    sections: MatrixSection[],
    sectionScores: Record<string, number>
  ) => void
}

// ─── Type card ────────────────────────────────────────────────────────────────

function TypeCard({
  config,
  selected,
  onClick,
}: {
  config: MatrixTypeConfig
  selected: boolean
  onClick: () => void
}) {
  const colorClass = config.id === "type1" ? "border-blue-400/50" 
    : config.id === "type2" ? "border-emerald-400/50" 
    : config.id === "type3" ? "border-violet-400/50" 
    : "border-amber-400/50"
  
  const badgeClass = config.id === "type1" ? "bg-blue-100 text-blue-700" 
    : config.id === "type2" ? "bg-emerald-100 text-emerald-700" 
    : config.id === "type3" ? "bg-violet-100 text-violet-700" 
    : "bg-amber-100 text-amber-700"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col gap-2 p-3 rounded-xl border-2 text-left transition-all w-full ${
        selected
          ? `${colorClass} bg-foreground/[0.02]`
          : "border-border hover:border-foreground/30 hover:bg-foreground/[0.02]"
      }`}
    >
      {selected && (
        <span className={`absolute top-2 right-2 h-4 w-4 rounded-full flex items-center justify-center ${config.id === "custom" ? "bg-amber-500" : config.id === "type1" ? "bg-blue-500" : config.id === "type2" ? "bg-emerald-500" : "bg-violet-500"}`}>
          <Check className="h-2.5 w-2.5 text-white" />
        </span>
      )}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-xs">{config.name}</span>
        <Badge
          variant="secondary"
          className={`text-[9px] font-medium px-1 py-0 ${
            selected ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {config.badge}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
        {config.description}
      </p>
      {config.sections.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {config.sections.map((s) => (
            <span
              key={s.key}
              className="text-[9px] px-1 py-0.5 rounded bg-muted/50 text-muted-foreground font-medium"
            >
              {s.label}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

// ─── Custom section configurator ──────────────────────────────────────────────

function CustomConfigurator({
  sections,
  sectionScores,
  totalScore,
  onChange,
}: {
  sections: MatrixSection[]
  sectionScores: Record<string, number>
  totalScore: number
  onChange: (sections: MatrixSection[], scores: Record<string, number>) => void
}) {
  const isActive = (key: string) => sections.some((s) => s.key === key)

  const toggle = (avail: MatrixSection) => {
    let newSections: MatrixSection[]
    let newScores = { ...sectionScores }

    if (isActive(avail.key)) {
      // Remove
      newSections = sections.filter((s) => s.key !== avail.key)
      delete newScores[avail.key]
    } else {
      // Add with auto-label = PHẦN N
      const nextIdx = sections.length + 1
      newSections = [
        ...sections,
        { ...avail, label: `PHẦN ${["I","II","III","IV","V"][nextIdx - 1] ?? nextIdx}` },
      ]
      newScores[avail.key] = 0
    }
    onChange(newSections, newScores)
  }

  const updateLabel = (key: string, label: string) => {
    onChange(
      sections.map((s) => (s.key === key ? { ...s, label } : s)),
      sectionScores
    )
  }

  const updateSublabel = (key: string, sublabel: string) => {
    onChange(
      sections.map((s) => (s.key === key ? { ...s, sublabel } : s)),
      sectionScores
    )
  }

  const updateScore = (key: string, score: number) => {
    onChange(sections, { ...sectionScores, [key]: score })
  }

  const scoreSum = sections.reduce((s, sec) => s + (sectionScores[sec.key] || 0), 0)
  const scoresOk = Math.abs(scoreSum - totalScore) < 0.01

  return (
    <div className="mt-3 rounded-xl border bg-muted/[0.02] p-3 space-y-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Cấu hình phần thi
        </span>
      </div>

      {/* Available sections as toggleable rows */}
      <div className="space-y-1.5">
        {AVAILABLE_SECTIONS.map((avail) => {
          const active = isActive(avail.key)
          const section = sections.find((s) => s.key === avail.key)
          return (
            <div
              key={avail.key}
              className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                active
                  ? "bg-background border-foreground/20"
                  : "bg-muted/[0.02] border-border opacity-60"
              }`}
            >
              {/* Toggle checkbox */}
              <button
                type="button"
                onClick={() => toggle(avail)}
                className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  active
                    ? "border-foreground bg-foreground"
                    : "border-border bg-background"
                }`}
              >
                {active && <Check className="h-2.5 w-2.5 text-white" />}
              </button>

              {/* Default name (readonly) */}
              <span className="text-[10px] text-muted-foreground w-28 shrink-0">
                {avail.sublabel.replace(/[()]/g, "")}
              </span>

              {/* Label (editable only if active) */}
              <Input
                value={section?.label ?? avail.label}
                onChange={(e) => active && updateLabel(avail.key, e.target.value)}
                disabled={!active}
                className="h-7 text-[10px] w-16 text-center"
                placeholder="PHẦN I"
              />

              {/* Sublabel (editable only if active) */}
              <Input
                value={section?.sublabel ?? avail.sublabel}
                onChange={(e) => active && updateSublabel(avail.key, e.target.value)}
                disabled={!active}
                className="h-7 text-[10px] flex-1 min-w-0"
                placeholder="(mô tả)"
              />

              {/* Score */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-muted-foreground">Điểm:</span>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  value={active ? (sectionScores[avail.key] ?? 0) : ""}
                  onChange={(e) =>
                    active && updateScore(avail.key, parseFloat(e.target.value) || 0)
                  }
                  disabled={!active}
                  className="h-7 text-[10px] w-14 text-center"
                  placeholder="0"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Score validation */}
      <div
        className={`text-[10px] px-2.5 py-1.5 rounded font-medium text-center ${
          scoresOk
            ? "bg-green-50 text-green-700 border"
            : "bg-red-50 text-red-700 border"
        }`}
      >
        Tổng điểm các phần: {scoreSum} / {totalScore}đ
        {scoresOk ? " ✓" : " — phải bằng tổng điểm toàn bài"}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MatrixTypeSelector({
  value,
  customSections,
  sectionScores,
  totalScore,
  onChange,
}: MatrixTypeSelectorProps) {
  const handleSelectPreset = (type: MatrixTypeConfig) => {
    if (type.id === "custom") {
      // Keep existing custom sections or default to type3 sections
      const defaultCustom =
        customSections.length > 0
          ? customSections
          : MATRIX_TYPES.find((t) => t.id === "type3")!.sections

      // Build default custom scores from existing or preset
      const existingOrDefault =
        Object.keys(sectionScores).length > 0
          ? sectionScores
          : MATRIX_TYPES.find((t) => t.id === "type3")!.defaultSectionScores

      onChange("custom", defaultCustom, existingOrDefault)
    } else {
      const sections = type.sections
      // Scale default section scores to match current totalScore
      const defSum = Object.values(type.defaultSectionScores).reduce((a, b) => a + b, 0)
      const scaledScores: Record<string, number> =
        defSum > 0
          ? Object.fromEntries(
              Object.entries(type.defaultSectionScores).map(([k, v]) => [
                k,
                parseFloat(((v / defSum) * totalScore).toFixed(2)),
              ])
            )
          : { ...type.defaultSectionScores }
      onChange(type.id, sections, scaledScores)
    }
  }

  return (
    <div>
      {/* Type cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MATRIX_TYPES.map((type) => (
          <TypeCard
            key={type.id}
            config={type}
            selected={value === type.id}
            onClick={() => handleSelectPreset(type)}
          />
        ))}
      </div>

      {/* Custom configurator (only when custom is selected) */}
      {value === "custom" && (
        <CustomConfigurator
          sections={customSections}
          sectionScores={sectionScores}
          totalScore={totalScore}
          onChange={(secs, scores) => onChange("custom", secs, scores)}
        />
      )}
    </div>
  )
}
