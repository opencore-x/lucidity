import * as React from 'react'
import { useAuth } from '@clerk/tanstack-react-start'
import { setTokenGetter } from '~/api/client'

const AuthContext = React.createContext(false)

export function useAuthReady() {
  return React.useContext(AuthContext)
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const ready = isLoaded && !!isSignedIn

  // Set token getter synchronously on each render so it's always current
  if (ready) {
    setTokenGetter(getToken)
  }

  return <AuthContext.Provider value={ready}>{children}</AuthContext.Provider>
}
