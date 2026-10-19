import type { Card } from '../types/index.js'

export function getBlackjackValue(cards: Card[]): number {
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
  return cards.length === 2 && getBlackjackValue(cards) === 21
}

export function isBust(cards: Card[]): boolean {
  return getBlackjackValue(cards) > 21
}
