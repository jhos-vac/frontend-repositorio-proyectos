import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface User {
  id: string
  name: string
  email: string
  roleId: string
  image?: string
  careerId?: string
  role?: { id: string; name: string }
}

interface AuthState {
  isLoggedIn: boolean
  token: string | null
  userId: string | null
  userRole: string | null
  user: User | null
  careerId: string | null
  
  login: (token: string, userId: string, userRole: string) => void
  logout: () => void
  setUser: (user: User) => void
  updateUser: (userData: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      token: null,
      userId: null,
      user: null,
      careerId: null,
      userRole: null,

      login: (token, userId, userRole) => set({ 
        isLoggedIn: true, 
        token, 
        userId, 
        userRole 
      }),

      logout: () => set({ 
        isLoggedIn: false, 
        token: null, 
        userId: null, 
        user: null, 
        userRole: null, 
        careerId: null 
      }),

      setUser: (user) => set({ user }),

      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      })),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => window.localStorage),
    }
  )
)