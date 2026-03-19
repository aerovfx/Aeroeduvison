import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"
import prisma from "@/lib/prisma"

export type TranscriptType = "lecture" | "meeting"

export interface TranscriptRecord {
  id: string
  userId: string
  type: TranscriptType
  title: string
  transcript: string
  summary: string
  duration: number
  createdAt: string
  updatedAt: string
}

interface CreateTranscriptInput {
  userId: string
  type: TranscriptType
  title: string
  transcript: string
  summary?: string
  duration?: number
}

interface ListTranscriptInput {
  userId: string
  type?: TranscriptType
  limit?: number
}

const LOCAL_STORE_PATH = path.join(process.cwd(), ".cache", "transcripts.json")

const toIsoString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  return new Date().toISOString()
}

const normalizeRecord = (record: any): TranscriptRecord => ({
  id: String(record.id),
  userId: String(record.userId),
  type: record.type === "meeting" ? "meeting" : "lecture",
  title: String(record.title || ""),
  transcript: String(record.transcript || ""),
  summary: String(record.summary || ""),
  duration: Number.isFinite(record.duration) ? Number(record.duration) : 0,
  createdAt: toIsoString(record.createdAt),
  updatedAt: toIsoString(record.updatedAt),
})

const hasPrismaTranscriptDelegate = () =>
  Boolean((prisma as any)?.transcript?.create) &&
  Boolean((prisma as any)?.transcript?.findMany) &&
  Boolean((prisma as any)?.transcript?.delete)

const readLocalStore = async (): Promise<TranscriptRecord[]> => {
  try {
    const raw = await fs.readFile(LOCAL_STORE_PATH, "utf8")
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeRecord)
  } catch (error: any) {
    if (error?.code === "ENOENT") return []
    throw error
  }
}

const writeLocalStore = async (records: TranscriptRecord[]) => {
  await fs.mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true })
  await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(records, null, 2), "utf8")
}

export const createTranscriptRecord = async (
  input: CreateTranscriptInput
): Promise<TranscriptRecord> => {
  const cleanTranscript = input.transcript.trim()
  if (!cleanTranscript) {
    throw new Error("Transcript content is empty")
  }

  if (hasPrismaTranscriptDelegate()) {
    const created = await (prisma as any).transcript.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        transcript: cleanTranscript,
        summary: input.summary || "",
        duration: input.duration || 0,
      },
    })
    return normalizeRecord(created)
  }

  const nowIso = new Date().toISOString()
  const fallbackRecord: TranscriptRecord = {
    id: randomUUID(),
    userId: input.userId,
    type: input.type,
    title: input.title,
    transcript: cleanTranscript,
    summary: input.summary || "",
    duration: input.duration || 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  const records = await readLocalStore()
  records.unshift(fallbackRecord)
  await writeLocalStore(records)
  return fallbackRecord
}

export const listTranscriptRecords = async (
  input: ListTranscriptInput
): Promise<TranscriptRecord[]> => {
  const take = Math.max(1, Math.min(input.limit || 20, 100))

  if (hasPrismaTranscriptDelegate()) {
    const rows = await (prisma as any).transcript.findMany({
      where: {
        userId: input.userId,
        ...(input.type ? { type: input.type } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
    })
    return rows.map(normalizeRecord)
  }

  const records = await readLocalStore()
  return records
    .filter((item) => item.userId === input.userId)
    .filter((item) => (input.type ? item.type === input.type : true))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, take)
}

export const deleteTranscriptRecord = async (input: {
  id: string
  userId: string
}): Promise<boolean> => {
  if (hasPrismaTranscriptDelegate()) {
    const existing = await (prisma as any).transcript.findFirst({
      where: { id: input.id, userId: input.userId },
      select: { id: true },
    })

    if (!existing) return false

    await (prisma as any).transcript.delete({
      where: { id: input.id },
    })
    return true
  }

  const records = await readLocalStore()
  const nextRecords = records.filter(
    (item) => !(item.id === input.id && item.userId === input.userId)
  )
  if (nextRecords.length === records.length) return false
  await writeLocalStore(nextRecords)
  return true
}

export const updateTranscriptRecord = async (input: {
  id: string
  userId: string
  title?: string
  summary?: string
}): Promise<TranscriptRecord | null> => {
  const nextTitle = input.title?.trim()

  if (hasPrismaTranscriptDelegate()) {
    const existing = await (prisma as any).transcript.findFirst({
      where: { id: input.id, userId: input.userId },
      select: { id: true },
    })

    if (!existing) return null

    const updated = await (prisma as any).transcript.update({
      where: { id: input.id },
      data: {
        ...(nextTitle ? { title: nextTitle } : {}),
        ...(typeof input.summary === "string" ? { summary: input.summary } : {}),
      },
    })

    return normalizeRecord(updated)
  }

  const records = await readLocalStore()
  const targetIndex = records.findIndex(
    (item) => item.id === input.id && item.userId === input.userId
  )
  if (targetIndex < 0) return null

  const current = records[targetIndex]
  const updated: TranscriptRecord = {
    ...current,
    title: nextTitle || current.title,
    summary: typeof input.summary === "string" ? input.summary : current.summary,
    updatedAt: new Date().toISOString(),
  }

  records[targetIndex] = updated
  await writeLocalStore(records)
  return updated
}
