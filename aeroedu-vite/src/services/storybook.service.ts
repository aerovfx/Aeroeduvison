/** API cho module Flipbook có audio cho thiếu nhi (KidsStorybook). */
import { api } from './api'
import type { Storybook } from '@/types/storybook'

export async function listStorybooks(mine = false): Promise<Storybook[]> {
  const { data } = await api.get('/kids/storybooks', { params: mine ? { mine: 1 } : {} })
  return data.storybooks || []
}
export async function getStorybook(id: string): Promise<Storybook> {
  const { data } = await api.get(`/kids/storybooks/${id}`)
  return data.storybook
}
export async function createStorybook(body: Partial<Storybook>): Promise<Storybook> {
  const { data } = await api.post('/kids/storybooks', body)
  return data.storybook
}
export async function updateStorybook(id: string, body: Partial<Storybook>): Promise<Storybook> {
  const { data } = await api.put(`/kids/storybooks/${id}`, body)
  return data.storybook
}
export async function deleteStorybook(id: string): Promise<void> {
  await api.delete(`/kids/storybooks/${id}`)
}
