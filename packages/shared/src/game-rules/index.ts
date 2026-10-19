import type { Card, Suit, Rank } from '../types/index.js'

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

function cardValue(rank: Rank): number {
  if (rank === 'A') return 11
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10
  return parseInt(rank, 10)
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: uuid(), suit, rank, value: cardValue(rank) })
    }
  }
  return shuffle(deck)
}

export function shuffle(deck: Card[]): Card[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

export function blackjackScore(cards: Card[]): number {
  let total = 0
  let aces = 0
  for (const c of cards) {
    if (c.rank === 'A') aces++
    total += c.value
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return total
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && blackjackScore(cards) === 21
}

export function isBust(cards: Card[]): boolean {
  return blackjackScore(cards) > 21
}

export function baCaoScore(cards: Card[]): number {
  const sum = cards.reduce((s, c) => {
    if (c.rank === 'A') return s + 1
    if (c.rank === 'J' || c.rank === 'Q' || c.rank === 'K') return s + 10
    return s + parseInt(c.rank, 10)
  }, 0)
  return sum % 10
}

export function isBaCaoSpecial(cards: Card[]): boolean {
  if (cards.length !== 3) return false
  const allFace = cards.every((c) => ['J', 'Q', 'K'].includes(c.rank))
  const allSame = cards.every((c) => c.suit === cards[0].suit)
  return allFace || allSame
}

const RANK_ORDER: Record<Rank, number> = {
  A: 14, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13
}

function isLieng(cards: Card[]): boolean {
  const vals = cards.map((c) => RANK_ORDER[c.rank])
  const hi = [...vals].sort((a, b) => a - b)
  if (hi[2] - hi[0] === 2 && hi[1] - hi[0] === 1) return true
  const lowA = vals.map((v) => (v === 14 ? 1 : v)).sort((a, b) => a - b)
  if (lowA[2] - lowA[0] === 2 && lowA[1] - lowA[0] === 1) return true
  return false
}

function liengHigh(cards: Card[]): number {
  const vals = cards.map((c) => RANK_ORDER[c.rank])
  const normal = Math.max(...vals)
  const lowA = vals.map((v) => (v === 14 ? 1 : v))
  const lowHigh = Math.max(...lowA)
  return normal === 14 && lowHigh === 3 ? 3 : normal
}

export interface BaCaoRank {
  tier: number
  label: string
  value: number
}

export function baCaoHandRank(cards: Card[]): BaCaoRank {
  if (cards.length === 3) {
    const ranks = cards.map((c) => c.rank)
    if (ranks.every((r) => r === ranks[0])) {
      return { tier: 3, label: 'Sáp', value: RANK_ORDER[ranks[0]] }
    }
    if (cards.every((c) => c.suit === cards[0].suit) && isLieng(cards)) {
      return { tier: 2, label: 'Liêng', value: liengHigh(cards) }
    }
    if (cards.every((c) => ['J', 'Q', 'K'].includes(c.rank))) {
      return { tier: 1, label: 'Ba Tây', value: 0 }
    }
  }
  return { tier: 0, label: '', value: baCaoScore(cards) }
}

export interface Settlement {
  playerId: string
  payout: number
  result: 'win' | 'lose' | 'push' | 'blackjack'
}

export function settleBlackjack(
  players: { id: string; cards: Card[]; bet: number }[],
  dealer: { cards: Card[] },
  config: { blackjackPayout: number; pushOnTie: boolean }
): Settlement[] {
  const dealerScore = blackjackScore(dealer.cards)
  const dealerBJ = isBlackjack(dealer.cards)
  return players.map((p) => {
    const score = blackjackScore(p.cards)
    const playerBJ = isBlackjack(p.cards)
    if (score > 21) return { playerId: p.id, payout: -p.bet, result: 'lose' as const }
    if (playerBJ && !dealerBJ) return { playerId: p.id, payout: Math.floor(p.bet * config.blackjackPayout), result: 'blackjack' as const }
    if (dealerBJ && !playerBJ) return { playerId: p.id, payout: -p.bet, result: 'lose' as const }
    if (playerBJ && dealerBJ) return { playerId: p.id, payout: 0, result: 'push' as const }
    if (dealerScore > 21) return { playerId: p.id, payout: p.bet, result: 'win' as const }
    if (score > dealerScore) return { playerId: p.id, payout: p.bet, result: 'win' as const }
    if (score < dealerScore) return { playerId: p.id, payout: -p.bet, result: 'lose' as const }
    return { playerId: p.id, payout: 0, result: 'push' as const }
  })
}

export function settleBaCao(
  players: { id: string; cards: Card[]; bet: number }[],
  dealer: { cards: Card[]; id: string },
  config: { pushOnTie: boolean }
): Settlement[] {
  const dealerScore = baCaoScore(dealer.cards)
  return players.map((p) => {
    if (p.id === dealer.id) return { playerId: p.id, payout: 0, result: 'push' as const }
    const score = baCaoScore(p.cards)
    if (score > dealerScore) return { playerId: p.id, payout: p.bet, result: 'win' as const }
    if (score < dealerScore) return { playerId: p.id, payout: -p.bet, result: 'lose' as const }
    return { playerId: p.id, payout: 0, result: 'push' as const }
  })
}
