import * as React from 'react'
import { useAuth } from '@clerk/tanstack-react-start'
import { setTokenGetter } from '~/api/client'

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()

  React.useEffect(() => {
    setTokenGetter(getToken)
  }, [getToken])

  return <>{children}</>
}
