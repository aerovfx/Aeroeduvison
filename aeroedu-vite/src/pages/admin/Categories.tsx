/**
 * Admin: Category Management
 * Full CRUD — list, create, edit, delete categories
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Tag, Plus, Pencil, Trash2, Check, X, Search, RefreshCw, Loader2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'

// ── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  slug?: string
  description?: string
}

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchCategories = (): Promise<Category[]> =>
  api.get<Category[]>('/categories').then((r: { data: Category[] }) => r.data)

const createCategory = (body: { name: string }): Promise<Category> =>
  api.post<Category>('/categories', body).then((r: { data: Category }) => r.data)

const updateCategory = (id: string, body: { name: string }): Promise<Category> =>
  api.put<Category>(`/categories/${id}`, body).then((r: { data: Category }) => r.data)

const deleteCategory = (id: string): Promise<void> =>
  api.delete(`/categories/${id}`).then(() => undefined)

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminCategories() {
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [newName, setNewName] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  // Inline edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchCategories,
  })

  const addMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Đã thêm danh mục')
      setNewName('')
      setShowAdd(false)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Lỗi khi thêm danh mục'
      toast.error(msg)
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCategory(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Đã cập nhật danh mục')
      setEditId(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Lỗi khi cập nhật'
      toast.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Đã xoá danh mục')
      setDeleteId(null)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Lỗi khi xoá danh mục'
      toast.error(msg)
    },
  })

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const startEdit = (cat: Category) => {
    setEditId(cat.id)
    setEditName(cat.name)
    setShowAdd(false)
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditName('')
  }

  const submitEdit = (id: string) => {
    const trimmed = editName.trim()
    if (!trimmed) return toast.error('Tên không được để trống')
    editMutation.mutate({ id, name: trimmed })
  }

  const submitAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) return toast.error('Tên không được để trống')
    addMutation.mutate({ name: trimmed })
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Tag className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Danh mục khoá học</h1>
            <p className="text-gray-400 text-sm">{categories.length} danh mục</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setShowAdd(true); setEditId(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm danh mục
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm danh mục..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-purple-500/40 bg-purple-500/5">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitAdd()
              if (e.key === 'Escape') { setShowAdd(false); setNewName('') }
            }}
            placeholder="Tên danh mục mới..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={submitAdd}
            disabled={addMutation.isPending}
            className="p-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
          >
            {addMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { setShowAdd(false); setNewName('') }}
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Đang tải...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-2">
            <Tag className="w-8 h-8 opacity-40" />
            <p className="text-sm">
              {search ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục nào'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                <th className="text-left py-3 px-4 text-gray-400 font-medium w-12">#</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Tên danh mục</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((cat, idx) => (
                <tr key={cat.id} className="group hover:bg-white/3 transition-colors">
                  <td className="py-3 px-4 text-gray-500">{idx + 1}</td>
                  <td className="py-3 px-4">
                    {editId === cat.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitEdit(cat.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          className="flex-1 bg-white/5 border border-purple-500/50 rounded-md px-3 py-1.5 text-white text-sm focus:outline-none focus:border-purple-400"
                        />
                        <button
                          onClick={() => submitEdit(cat.id)}
                          disabled={editMutation.isPending}
                          className="p-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
                        >
                          {editMutation.isPending
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-white font-medium">{cat.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editId !== cat.id && (
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(cat)}
                          className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-purple-400 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(cat.id)}
                          className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                          title="Xoá"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Xoá danh mục?</h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-lg border border-white/20 hover:border-white/40 text-gray-300 text-sm transition-colors"
              >
                Huỷ
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {deleteMutation.isPending ? 'Đang xoá...' : 'Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
