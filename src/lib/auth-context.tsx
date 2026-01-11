"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth"
import { auth } from "./firebase"

interface AuthContextType {
  user: User | null
  email: string | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user)

      if (user) {
        // Get and store Firebase ID token
        const idToken = await user.getIdToken()
        localStorage.setItem("dn_token", idToken)
        localStorage.setItem("dn_email", user.email || "")
        setEmail(user.email)
      } else {
        localStorage.removeItem("dn_token")
        localStorage.removeItem("dn_email")
        setEmail(null)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    const idToken = await userCredential.user.getIdToken()
    localStorage.setItem("dn_token", idToken)
    localStorage.setItem("dn_email", email)
  }

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const idToken = await userCredential.user.getIdToken()
    localStorage.setItem("dn_token", idToken)
    localStorage.setItem("dn_email", email)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    localStorage.removeItem("dn_token")
    localStorage.removeItem("dn_email")
  }

  return (
    <AuthContext.Provider value={{ user, email, loading, signUp, signIn, signOut }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
