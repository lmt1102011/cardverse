export type GameMode = 'xidach' | 'baicao'
export type RoomStatus = 'waiting' | 'playing' | 'full' | 'closed'
export type PlayerStatus = 'idle' | 'betting' | 'playing' | 'stand' | 'bust' | 'done'
export type SeatIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
export type MagicRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
export type MagicPhase = 'any' | 'betting' | 'playing' | 'reveal'
export type MagicTargetType = 'self' | 'player' | 'any_player' | 'none'
export type MagicEffectType =
  | 'peek_card' | 'block_negative' | 'lucky_refund'
  | 'reveal_total' | 'lock_magic' | 'shield'
  | 'swap_card' | 'counter' | 'blind'
  | 'double_bet' | 'fate_swap' | 'cancel_effect'
  | 'negate' | 'rewind' | 'reveal_all'

export interface Card {
  id: string
  suit: Suit
  rank: Rank
  value: number
}

export interface PlayerPublic {
  id: string
  name: string
  avatar: string
  chips: number
  isHost: boolean
  isDealer: boolean
  seatIndex: number
  connected: boolean
  ready: boolean
}

export interface PlayerHand {
  playerId: string
  cards: Card[]
  score: number
  isBlackjack: boolean
  isBust: boolean
  isStand: boolean
  revealed: boolean
}

export interface RoomPlayer extends PlayerPublic {
  bet: number
  betConfirmed: boolean
  status: PlayerStatus
  hand: PlayerHand | null
  magicCards: OwnedMagicCard[]
  magicUsedThisRound: boolean
  magicShield: boolean
  magicLocked: boolean
}

export interface Room {
  id: string
  name: string
  code: string
  mode: GameMode
  isPrivate: boolean
  maxPlayers: number
  minPlayers: number
  minBet: number
  maxBet: number
  status: RoomStatus
  hostId: string
  players: RoomPlayer[]
  dealerId: string | null
  currentRoundId: string | null
  createdAt: number
}

export interface OwnedMagicCard {
  id: string
  slug: string
  quantity: number
  usedInRound: boolean
}

export interface MagicCardDef {
  slug: string
  name: string
  nameEn: string
  rarity: MagicRarity
  description: string
  fullDescription: string
  effectType: MagicEffectType
  phase: MagicPhase
  targetType: MagicTargetType
  needsCardPick: boolean
  consumeOnUse: boolean
  compatibleModes: GameMode[]
  maxTargets: number
  duration: string
}

export interface MagicUseRequest {
  magicCardId: string
  targetPlayerId?: string
  targetCardId?: string
}

export interface MagicResult {
  success: boolean
  magicSlug: string
  casterId: string
  targetPlayerId?: string
  revealedCards?: Card[]
  message: string
}

export interface RoundResult {
  roundId: string
  mode: GameMode
  dealerId: string
  results: RoundPlayerResult[]
  payouts: Record<string, number>
  rewardsGiven: boolean
}

export interface RoundPlayerResult {
  playerId: string
  hand: Card[]
  score: number
  isBlackjack: boolean
  isBust: boolean
  result: 'win' | 'lose' | 'push' | 'blackjack'
  payout: number
}

export interface BetChipDenomination {
  value: number
  color: string
  borderColor: string
  label: string
}

export interface PlayerSession {
  id: string
  name: string
  avatar: string
  chips: number
  roomId: string | null
}

export interface SocketEvents {
  'room:list': { mode: GameMode }
  'room:create': { name: string; mode: GameMode; isPrivate: boolean; password?: string; maxPlayers: number; minBet: number; maxBet: number }
  'room:join': { roomId: string; password?: string }
  'room:leave': { roomId: string }
  'room:kick': { roomId: string; targetId: string }
  'room:start': { roomId: string }
  'game:placeBet': { roomId: string; amount: number }
  'game:confirmBet': { roomId: string }
  'game:draw': { roomId: string }
  'game:stand': { roomId: string }
  'magic:use': { roomId: string; magicCardId: string; targetPlayerId?: string; targetCardId?: string }
  'magic:cancel': { roomId: string }
  'game:nextRound': { roomId: string }
}
