/**
 * useCareerSurveyGuard — gate cho các trang chỉ mở sau khi hoàn thành khảo sát
 *
 * Dùng trong /teacher/knowledge-graph, /admin/knowledge-graph, các trang
 * CPD/skill builder. Nếu user là TEACHER/PARENT/ADMIN và chưa làm survey
 * → redirect tới /profile/career-survey.
 *
 * Student không bị gate (luôn dùng KG được).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAccountType } from '@/hooks/useAccountType'
import { api } from '@/services/api'

export function useCareerSurveyGuard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoading } = useAuth()
  const accountType = useAccountType()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (isLoading) return
    if (!user) { setChecking(false); return }
    // STUDENT không bị gate
    if (accountType === 'STUDENT') {
      setAllowed(true); setChecking(false); return
    }
    // TEACHER / PARENT / ADMIN → check survey
    api.get<{ completed: boolean }>('/users/me/career-survey')
      .then(r => {
        if (r.data?.completed) {
          setAllowed(true)
        } else {
          // Redirect to survey with return URL
          navigate(`/profile/career-survey?return=${encodeURIComponent(location.pathname)}`, { replace: true })
        }
      })
      .catch(() => {
        // Network error: allow access (graceful degradation)
        setAllowed(true)
      })
      .finally(() => setChecking(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, accountType])

  return { checking, allowed }
}
