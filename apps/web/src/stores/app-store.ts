import { create } from 'zustand'
import type { PlayerSession } from '@cardverse/shared'

interface RoomData {
  id: string
  name: string
  code: string
  mode: string
  phase?: string
  roundNumber?: number
  deckCount?: number
  roundResults?: unknown[]
  hostId: string
  dealerId: string | null
  currentRoundId: string | null
  players: any[]
}

interface AppState {
  session: PlayerSession | null
  rooms: unknown[]
  currentRoom: RoomData | null
  connected: boolean
  notification: { type: string; message: string } | null
  magicRevealed: { casterId: string; message: string; revealedCards: unknown[] } | null
  setSession: (s: PlayerSession | null) => void
  setRooms: (r: unknown[]) => void
  setCurrentRoom: (r: RoomData | null) => void
  setConnected: (c: boolean) => void
  setNotification: (n: { type: string; message: string } | null) => void
  setMagicRevealed: (m: { casterId: string; message: string; revealedCards: unknown[] } | null) => void
}

export const useAppStore = create<AppState>((set: any) => ({
  session: null,
  rooms: [],
  currentRoom: null,
  connected: false,
  notification: null,
  magicRevealed: null,
  setSession: (session: PlayerSession | null) => set({ session }),
  setRooms: (rooms: unknown[]) => set({ rooms }),
  setCurrentRoom: (currentRoom: RoomData | null) => set({ currentRoom }),
  setConnected: (connected: boolean) => set({ connected }),
  setNotification: (notification: AppState['notification']) => set({ notification }),
  setMagicRevealed: (magicRevealed: AppState['magicRevealed']) => set({ magicRevealed })
}))
