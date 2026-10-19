export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
export const MAX_PLAYERS = 8
export const MIN_PLAYERS = 2
export const INITIAL_CHIPS = 1000
export const BET_CHIPS = [
  { value: 10, color: 'bg-emerald-500', borderColor: 'border-emerald-300', label: '10' },
  { value: 20, color: 'bg-sky-500', borderColor: 'border-sky-300', label: '20' },
  { value: 50, color: 'bg-amber-500', borderColor: 'border-amber-300', label: '50' },
  { value: 100, color: 'bg-rose-500', borderColor: 'border-rose-300', label: '100' }
] as const

export const GAME_MODES = [
  { id: 'xidach', name: 'Xì Dách Việt Nam', description: 'Đánh bài Xì Dách kinh điển', color: 'from-emerald-600 to-teal-800' },
  { id: 'baicao', name: 'Bài Cào Việt Nam', description: 'Bài Cào 3 lá nhanh gọn', color: 'from-rose-600 to-pink-800' }
] as const

export const SEAT_POSITIONS = [
  { name: 'top-left', x: 12, y: 8 },
  { name: 'top-center', x: 38, y: 4 },
  { name: 'top-right', x: 64, y: 8 },
  { name: 'right', x: 78, y: 35 },
  { name: 'bottom-right', x: 64, y: 68 },
  { name: 'bottom-center', x: 38, y: 72 },
  { name: 'bottom-left', x: 12, y: 68 },
  { name: 'left', x: -2, y: 35 }
] as const
