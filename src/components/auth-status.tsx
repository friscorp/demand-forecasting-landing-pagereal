"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { AuthModal } from "./auth-modal"
import { LogOut, User } from "lucide-react"

export function AuthStatus() {
  const { email, signOut, loading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)

  if (loading) {
    return null
  }

  if (email) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{email}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button variant="default" size="sm" onClick={() => setAuthModalOpen(true)}>
        Sign In
      </Button>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  )
}
