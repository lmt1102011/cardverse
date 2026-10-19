import type { Card } from '../types/index.js'

export function getBaCaoValue(cards: Card[]): number {
  const sum = cards.reduce((s, c) => s + c.value, 0)
  return sum % 10
}

export function getBaCaoMax(cards: Card[]): number {
  return Math.max(...cards.map((c) => c.value))
}
