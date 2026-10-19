import type { Card as CardType } from '@cardverse/shared'

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠'
}
const SUIT_COLORS: Record<string, string> = {
  hearts: 'text-red-500', diamonds: 'text-red-500', clubs: 'text-gray-900', spades: 'text-gray-900'
}

interface CardProps {
  card: CardType
  faceDown?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PlayingCard({ card, faceDown = false, size = 'md', className = '' }: CardProps) {
  const sizeClasses = {
    sm: 'w-10 h-14 text-xs',
    md: 'w-14 h-20 text-sm',
    lg: 'w-18 h-26 text-base'
  }[size]

  if (faceDown) {
    return (
      <div className={`${sizeClasses} rounded-md bg-gradient-to-br from-indigo-800 to-indigo-950 border border-indigo-600 flex items-center justify-center shadow-lg ${className}`}>
        <div className="w-6 h-8 rounded bg-indigo-700 border border-indigo-500 flex items-center justify-center">
          <span className="text-indigo-300 text-xs font-bold">?</span>
        </div>
      </div>
    )
  }

  const suit = SUIT_SYMBOLS[card.suit] || '?'
  const color = SUIT_COLORS[card.suit] || 'text-gray-900'

  return (
    <div className={`${sizeClasses} rounded-md bg-white border border-gray-300 flex flex-col items-center justify-center shadow-lg ${className}`}>
      <span className={`${color} font-bold text-lg leading-none`}>{card.rank}</span>
      <span className={`${color} text-xl leading-none`}>{suit}</span>
    </div>
  )
}
