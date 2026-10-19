import type React from 'react'
import type { MagicCardDef, MagicRarity } from '@cardverse/shared'

const RARITY_STYLES: Record<MagicRarity, { bg: string; border: string; text: string; badge: string }> = {
  common: { bg: 'bg-gradient-to-br from-teal-900 to-teal-950', border: 'border-teal-500', text: 'text-teal-300', badge: 'bg-teal-600' },
  rare: { bg: 'bg-gradient-to-br from-blue-900 to-blue-950', border: 'border-blue-500', text: 'text-blue-300', badge: 'bg-blue-600' },
  epic: { bg: 'bg-gradient-to-br from-purple-900 to-purple-950', border: 'border-purple-500', text: 'text-purple-300', badge: 'bg-purple-600' },
  legendary: { bg: 'bg-gradient-to-br from-amber-800 to-amber-950', border: 'border-amber-500', text: 'text-amber-300', badge: 'bg-amber-600' },
  mythic: { bg: 'bg-gradient-to-br from-rose-900 to-purple-950', border: 'border-rose-500', text: 'text-rose-300', badge: 'bg-rose-600' }
}

const RARITY_LABEL: Record<MagicRarity, string> = {
  common: 'Thường', rare: 'Hiếm', epic: 'Sử Thi', legendary: 'Huyền Thoại', mythic: 'Dị Giới'
}

function MagicIllustration({ slug }: { slug: string }) {
  const illustrations: Record<string, React.ReactElement> = {
    'cho-liec-xiu': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="28" r="16" fill="#fbbf24" stroke="#d97706" strokeWidth="2"/>
        <ellipse cx="24" cy="26" rx="4" ry="5" fill="white"/>
        <ellipse cx="40" cy="26" rx="4" ry="5" fill="white"/>
        <circle cx="26" cy="27" r="2.5" fill="#1f2937"/>
        <circle cx="38" cy="27" r="2.5" fill="#1f2937"/>
        <circle cx="27" cy="26" r="1" fill="white"/>
        <circle cx="39" cy="26" r="1" fill="white"/>
        <path d="M24 38 Q32 44 40 38" stroke="#d97706" strokeWidth="2" fill="none"/>
        <rect x="44" y="14" width="14" height="20" rx="2" fill="#fff" stroke="#d97706" strokeWidth="1.5"/>
        <text x="47" y="28" fontSize="10" fill="#d97706" fontWeight="bold">?</text>
        <path d="M20 18 Q16 12 20 8" stroke="#d97706" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    'bua-dung-quac': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <path d="M32 8 L12 20 L12 44 L32 56 L52 44 L52 20 Z" fill="#14b8a6" stroke="#0d9488" strokeWidth="2"/>
        <text x="32" y="36" textAnchor="middle" fontSize="16" fill="white" fontWeight="bold">21</text>
        <path d="M20 28 L28 36 L44 20" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    'hen-chut-chut-de': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="32" r="20" fill="#fbbf24" stroke="#d97706" strokeWidth="2"/>
        <text x="32" y="40" textAnchor="middle" fontSize="20" fill="#92400e" fontWeight="bold">🍀</text>
        <circle cx="20" cy="18" r="3" fill="#fde68a"/>
        <circle cx="44" cy="18" r="3" fill="#fde68a"/>
        <circle cx="48" cy="44" r="3" fill="#fde68a"/>
        <circle cx="16" cy="44" r="3" fill="#fde68a"/>
      </svg>
    ),
    'soi-nha-nguoi-ta': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="24" cy="28" r="12" fill="#3b82f6" stroke="#2563eb" strokeWidth="2"/>
        <circle cx="24" cy="28" r="6" fill="white"/>
        <circle cx="24" cy="28" r="3" fill="#1f2937"/>
        <circle cx="25" cy="27" r="1" fill="white"/>
        <rect x="38" y="16" width="18" height="24" rx="2" fill="white" stroke="#3b82f6" strokeWidth="1.5"/>
        <text x="42" y="24" fontSize="6" fill="#3b82f6">A♠</text>
        <text x="42" y="32" fontSize="6" fill="#3b82f6">K♥</text>
        <text x="42" y="40" fontSize="6" fill="#ef4444">7♦</text>
      </svg>
    ),
    'cam-xai-do': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="32" r="20" fill="#3b82f6" stroke="#2563eb" strokeWidth="2"/>
        <line x1="18" y1="18" x2="46" y2="46" stroke="#ef4444" strokeWidth="4" strokeLinecap="round"/>
        <text x="32" y="58" textAnchor="middle" fontSize="8" fill="#93c5fd">Cấm</text>
      </svg>
    ),
    'ao-giai-nhan-pham': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <path d="M32 6 L10 18 L10 38 Q10 52 32 58 Q54 52 54 38 L54 18 Z" fill="#3b82f6" stroke="#2563eb" strokeWidth="2"/>
        <path d="M22 30 L28 36 L42 22" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
      </svg>
    ),
    'doi-bai-cho-do-ngua': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <rect x="6" y="16" width="18" height="26" rx="2" fill="white" stroke="#a855f7" strokeWidth="1.5" transform="rotate(-10 15 29)"/>
        <rect x="40" y="16" width="18" height="26" rx="2" fill="white" stroke="#a855f7" strokeWidth="1.5" transform="rotate(10 49 29)"/>
        <path d="M28 28 L36 36 M36 28 L28 36" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    'qua-bao-toi-nhanh': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <polygon points="32,4 38,24 58,24 42,36 48,56 32,44 16,56 22,36 6,24 26,24" fill="#a855f7" stroke="#9333ea" strokeWidth="1.5"/>
        <text x="32" y="36" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">⚡</text>
      </svg>
    ),
    'bi-mat-than-bai': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <ellipse cx="32" cy="30" rx="22" ry="14" fill="#a855f7" stroke="#9333ea" strokeWidth="2"/>
        <line x1="12" y1="30" x2="52" y2="30" stroke="#9333ea" strokeWidth="3"/>
        <circle cx="24" cy="24" r="2" fill="#9333ea"/>
        <circle cx="40" cy="24" r="2" fill="#9333ea"/>
        <text x="32" y="52" textAnchor="middle" fontSize="8" fill="#c084fc">Bịt mắt</text>
      </svg>
    ),
    'nhan-doi-keo-thom': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="32" r="22" fill="#f59e0b" stroke="#d97706" strokeWidth="2"/>
        <text x="32" y="28" textAnchor="middle" fontSize="14" fill="#92400e" fontWeight="bold">×2</text>
        <text x="32" y="44" textAnchor="middle" fontSize="10" fill="#92400e">💰</text>
      </svg>
    ),
    'tro-van-menh': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="32" r="20" fill="#f59e0b" stroke="#d97706" strokeWidth="2"/>
        <path d="M20 20 Q32 12 44 20 Q52 32 44 44 Q32 52 20 44 Q12 32 20 20" fill="none" stroke="white" strokeWidth="2"/>
        <text x="32" y="36" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">🔄</text>
      </svg>
    ),
    'phan-don-cuc-gat': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <polygon points="32,6 38,26 58,26 42,38 48,58 32,46 16,58 22,38 6,26 26,26" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5"/>
        <text x="32" y="36" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">🛡</text>
      </svg>
    ),
    'quay-xe-360': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="32" r="22" fill="#e11d48" stroke="#be123c" strokeWidth="2"/>
        <path d="M20 32 A12 12 0 1 1 32 44" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/>
        <polygon points="32,44 28,38 36,38" fill="white"/>
        <text x="32" y="26" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">360°</text>
      </svg>
    ),
    'thoi-gian-quay-dau': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <circle cx="32" cy="32" r="22" fill="#e11d48" stroke="#be123c" strokeWidth="2"/>
        <circle cx="32" cy="32" r="18" fill="none" stroke="white" strokeWidth="1.5"/>
        <line x1="32" y1="32" x2="32" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="32" y1="32" x2="42" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="32" cy="32" r="2" fill="white"/>
        <text x="32" y="58" textAnchor="middle" fontSize="7" fill="#fda4af">⏪</text>
      </svg>
    ),
    'mat-than-biet-tuot': (
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <ellipse cx="32" cy="32" rx="26" ry="16" fill="#e11d48" stroke="#be123c" strokeWidth="2"/>
        <circle cx="32" cy="32" r="10" fill="white" stroke="#be123c" strokeWidth="1.5"/>
        <circle cx="32" cy="32" r="5" fill="#1f2937"/>
        <circle cx="34" cy="30" r="2" fill="white"/>
        <path d="M12 32 Q12 24 20 22" stroke="#fda4af" strokeWidth="1.5" fill="none"/>
        <path d="M52 32 Q52 24 44 22" stroke="#fda4af" strokeWidth="1.5" fill="none"/>
      </svg>
    )
  }

  return illustrations[slug] || (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="16" y="8" width="32" height="48" rx="4" fill="#6b7280" stroke="#4b5563" strokeWidth="2"/>
      <text x="32" y="36" textAnchor="middle" fontSize="20" fill="white">✨</text>
    </svg>
  )
}

interface MagicCardProps {
  def: MagicCardDef
  quantity?: number
  used?: boolean
  onClick?: () => void
  selected?: boolean
  compact?: boolean
}

export function MagicCard({ def, quantity = 1, used = false, onClick, selected = false, compact = false }: MagicCardProps) {
  const style = RARITY_STYLES[def.rarity]
  const rarityLabel = RARITY_LABEL[def.rarity]

  return (
    <button
      onClick={onClick}
      disabled={used || quantity <= 0}
      className={`
        ${style.bg} ${style.border} border-2 rounded-xl p-2 w-32 flex flex-col items-center gap-1
        transition-all duration-200 cursor-pointer
        ${selected ? 'ring-2 ring-yellow-400 scale-105 shadow-lg shadow-yellow-400/30' : 'hover:scale-102 hover:shadow-lg'}
        ${used || quantity <= 0 ? 'opacity-40 cursor-not-allowed' : ''}
        ${style.text}
      `}
    >
      <div className={`${style.badge} text-white text-[10px] px-2 py-0.5 rounded-full font-semibold`}>
        {rarityLabel}
      </div>
      <div className="w-14 h-14">
        <MagicIllustration slug={def.slug} />
      </div>
      <div className="text-[11px] font-bold text-white text-center leading-tight">{def.name}</div>
      {!compact && (
        <div className="text-[9px] text-gray-300 text-center leading-tight line-clamp-2">{def.description}</div>
      )}
      {quantity > 1 && (
        <div className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full">×{quantity}</div>
      )}
    </button>
  )
}
