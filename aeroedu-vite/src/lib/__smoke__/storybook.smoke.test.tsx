// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import React from 'react'

// ── Mocks: tránh gọi mạng + cung cấp user GV ──
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ id: 'u1', role: 'TEACHER', name: 'Cô Hương', email: 't@x.vn' }),
  useCurrentRole: () => 'TEACHER',
}))

const demoBook = {
  id: 'demo-khan-do', title: 'Cô Bé Quàng Khăn Đỏ', description: 'demo',
  coverUrl: '/demo/khan-do/01.svg', mode: 'perPage' as const, narrationUrl: '', autoAdvance: true,
  published: true, ownerId: 'sys', ownerName: 'AeroEduVision',
  pages: [
    { id: 'k1', imageUrl: '/demo/khan-do/01.svg', caption: 'Ngày xửa ngày xưa…', audioUrl: '', flipAtSec: null },
    { id: 'k2', imageUrl: '/demo/khan-do/02.svg', caption: 'Mẹ đưa giỏ bánh…', audioUrl: '', flipAtSec: null },
  ],
}
vi.mock('@/services/storybook.service', () => ({
  listStorybooks: vi.fn().mockResolvedValue([demoBook]),
  getStorybook: vi.fn().mockResolvedValue(demoBook),
  createStorybook: vi.fn().mockResolvedValue(demoBook),
  updateStorybook: vi.fn().mockResolvedValue(demoBook),
  deleteStorybook: vi.fn().mockResolvedValue(undefined),
}))

async function mountRoute(node: React.ReactElement) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => { root.render(node) })
  await act(async () => { await new Promise((r) => setTimeout(r, 30)) }) // cho effect chạy
  const text = el.textContent || ''
  root.unmount()
  el.remove()
  return text
}

describe('Smoke render — module truyện flipbook + mascot', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

  it('StorybookLibrary render + hiện tiêu đề + nút tạo (GV)', async () => {
    const { default: Lib } = await import('@/pages/kids/StorybookLibrary')
    const text = await mountRoute(<MemoryRouter initialEntries={['/kids/storybooks']}><Lib /></MemoryRouter>)
    expect(text).toContain('Truyện tranh')
    expect(text).toContain('Cô Bé Quàng Khăn Đỏ')
    expect(text).toContain('Tạo truyện mới')
  })

  it('StorybookPlayer render trang + overlay "Bắt đầu đọc"', async () => {
    const { default: Player } = await import('@/pages/kids/StorybookPlayer')
    const text = await mountRoute(
      <MemoryRouter initialEntries={['/kids/storybooks/demo-khan-do']}>
        <Routes><Route path="/kids/storybooks/:id" element={<Player />} /></Routes>
      </MemoryRouter>,
    )
    expect(text).toContain('Cô Bé Quàng Khăn Đỏ')
    expect(text).toContain('Bắt đầu đọc')
  })

  it('StorybookEditor (tạo mới) render không crash', async () => {
    const { default: Editor } = await import('@/pages/kids/StorybookEditor')
    const text = await mountRoute(
      <MemoryRouter initialEntries={['/kids/storybooks/new']}>
        <Routes><Route path="/kids/storybooks/new" element={<Editor />} /></Routes>
      </MemoryRouter>,
    )
    expect(text).toContain('Tạo truyện tranh')
    expect(text).toContain('Tải PDF')
  })

  it('Mascot Aero mount không crash', async () => {
    const { default: Mascot } = await import('@/components/mascot/Mascot')
    const text = await mountRoute(<MemoryRouter><Mascot /></MemoryRouter>)
    expect(typeof text).toBe('string') // mount thành công, không throw
  })
})
