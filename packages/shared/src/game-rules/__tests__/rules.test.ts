import { describe, it, expect } from 'vitest'
import {
  createDeck, blackjackScore, isBlackjack, isBust,
  baCaoScore, settleBlackjack, settleBaCao, baCaoHandRank
} from '../index.js'
import type { Card } from '../../types/index.js'

function makeCard(rank: string, suit: string = 'hearts'): Card {
  const value = rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank, 10)
  return { id: rank + suit, suit: suit as any, rank: rank as any, value }
}

describe('Deck', () => {
  it('creates 52 cards', () => {
    const deck = createDeck()
    expect(deck.length).toBe(52)
  })

  it('has unique ids', () => {
    const deck = createDeck()
    const ids = new Set(deck.map((c) => c.id))
    expect(ids.size).toBe(52)
  })
})

describe('Blackjack scoring', () => {
  it('A + 10 = 21 (blackjack)', () => {
    const cards = [makeCard('A'), makeCard('10')]
    expect(blackjackScore(cards)).toBe(21)
    expect(isBlackjack(cards)).toBe(true)
  })

  it('A + A + 9 = 21', () => {
    const cards = [makeCard('A'), makeCard('A'), makeCard('9')]
    expect(blackjackScore(cards)).toBe(21)
  })

  it('K + Q + 5 = 25 (bust)', () => {
    const cards = [makeCard('K'), makeCard('Q'), makeCard('5')]
    expect(blackjackScore(cards)).toBe(25)
    expect(isBust(cards)).toBe(true)
  })

  it('A + A + A + A = 14', () => {
    const cards = [makeCard('A'), makeCard('A'), makeCard('A'), makeCard('A')]
    expect(blackjackScore(cards)).toBe(14)
  })
})

describe('Ba Cao scoring', () => {
  it('A + A + A = 3', () => {
    const cards = [makeCard('A'), makeCard('A'), makeCard('A')]
    expect(baCaoScore(cards)).toBe(3)
  })

  it('10 + J + K = 0', () => {
    const cards = [makeCard('10'), makeCard('J'), makeCard('K')]
    expect(baCaoScore(cards)).toBe(0)
  })

  it('9 + 10 + K = 9', () => {
    const cards = [makeCard('9'), makeCard('10'), makeCard('K')]
    expect(baCaoScore(cards)).toBe(9)
  })
})

describe('Blackjack settlement', () => {
  it('player wins with higher score', () => {
    const results = settleBlackjack(
      [{ id: 'p1', cards: [makeCard('10'), makeCard('9')], bet: 50 }],
      { cards: [makeCard('10'), makeCard('7')] },
      { blackjackPayout: 1.5, pushOnTie: true }
    )
    expect(results[0].result).toBe('win')
    expect(results[0].payout).toBe(50)
  })

  it('dealer wins with higher score', () => {
    const results = settleBlackjack(
      [{ id: 'p1', cards: [makeCard('10'), makeCard('5')], bet: 50 }],
      { cards: [makeCard('10'), makeCard('9')] },
      { blackjackPayout: 1.5, pushOnTie: true }
    )
    expect(results[0].result).toBe('lose')
    expect(results[0].payout).toBe(-50)
  })

  it('push on tie', () => {
    const results = settleBlackjack(
      [{ id: 'p1', cards: [makeCard('10'), makeCard('8')], bet: 50 }],
      { cards: [makeCard('10'), makeCard('8')] },
      { blackjackPayout: 1.5, pushOnTie: true }
    )
    expect(results[0].result).toBe('push')
    expect(results[0].payout).toBe(0)
  })

  it('player bust loses', () => {
    const results = settleBlackjack(
      [{ id: 'p1', cards: [makeCard('10'), makeCard('9'), makeCard('5')], bet: 50 }],
      { cards: [makeCard('10'), makeCard('7')] },
      { blackjackPayout: 1.5, pushOnTie: true }
    )
    expect(results[0].result).toBe('lose')
    expect(results[0].payout).toBe(-50)
  })
})

describe('Ba Cao hand rank', () => {
  it('detects Sáp (3 same rank)', () => {
    const r = baCaoHandRank([makeCard('9', 'hearts'), makeCard('9', 'clubs'), makeCard('9', 'spades')])
    expect(r.tier).toBe(3)
    expect(r.label).toBe('Sáp')
  })

  it('detects Liêng (3 consecutive same suit)', () => {
    const r = baCaoHandRank([makeCard('5', 'hearts'), makeCard('6', 'hearts'), makeCard('7', 'hearts')])
    expect(r.tier).toBe(2)
    expect(r.label).toBe('Liêng')
  })

  it('detects Ba Tây (3 face cards)', () => {
    const r = baCaoHandRank([makeCard('J', 'hearts'), makeCard('Q', 'clubs'), makeCard('K', 'spades')])
    expect(r.tier).toBe(1)
    expect(r.label).toBe('Ba Tây')
  })

  it('falls back to point total', () => {
    const r = baCaoHandRank([makeCard('10', 'hearts'), makeCard('7', 'clubs'), makeCard('2', 'spades')])
    expect(r.tier).toBe(0)
    expect(r.value).toBe(9)
  })
})

describe('Ba Cao settlement', () => {
  it('player wins with higher score', () => {
    const results = settleBaCao(
      [{ id: 'p1', cards: [makeCard('9'), makeCard('9'), makeCard('K')], bet: 30 }],
      { cards: [makeCard('5'), makeCard('5'), makeCard('5')], id: 'dealer' },
      { pushOnTie: true }
    )
    expect(results[0].result).toBe('win')
    expect(results[0].payout).toBe(30)
  })
})
