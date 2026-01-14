"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { User, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { AuthModal } from "./auth-modal"

export function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [authModalOpen, setAuthModalOpen] = useState(false)

  if (!user) {
    return (
      <>
        <Button variant="default" size="sm" onClick={() => setAuthModalOpen(true)}>
          Sign In
        </Button>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <User className="h-5 w-5" />
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/preferences")}>
          <User className="mr-2 h-4 w-4" />
          <span>User Preferences</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/business-settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
