/**
 * useAuth — hook chính thay thế useSession() của NextAuth
 *
 * // Next.js cũ:
 * const { data: session } = useSession()
 * const user = session?.user
 *
 * // Vite mới:
 * const { user, isLoading, isAuthenticated } = useAuth()
 */
export { useAuthContext as useAuth } from '@/contexts/AuthContext'
