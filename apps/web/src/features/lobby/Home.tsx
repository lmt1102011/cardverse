import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Users, Zap } from 'lucide-react'

const MODES = [
  { id: 'xidach', name: 'Xì Dách Việt Nam', description: 'Đánh bài Xì Dách kinh điển với luật Việt Nam', color: 'from-emerald-600 to-teal-900', icon: '🃏', players: '2-8' },
  { id: 'baicao', name: 'Bài Cào Việt Nam', description: 'Bài Cào 3 lá nhanh gọn, may mắn', color: 'from-rose-600 to-pink-900', icon: '🎴', players: '2-8' },
  { id: 'coming1', name: 'Sắp Ra Mắt', description: 'Chế độ mới đang được phát triển', color: 'from-gray-700 to-gray-900', icon: '🔒', players: '--' }
]

interface HomeProps {
  playerName: string
  playerChips: number
  playerAvatar: string
  onSelectMode: (modeId: string) => void
}

export function Home({ playerName, playerChips, playerAvatar, onSelectMode }: HomeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const prev = () => setCurrentIndex((i) => Math.max(0, i - 1))
  const next = () => setCurrentIndex((i) => Math.min(MODES.length - 1, i + 1))

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-black font-black text-xl">
            ♠
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">BÀI QUẨY</h1>
            <p className="text-[10px] text-yellow-400 font-semibold tracking-widest">CARDVERSE</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-800/50 rounded-full px-4 py-2 border border-gray-700">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-lg">
              {playerAvatar}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{playerName}</div>
              <div className="text-xs text-yellow-400 font-bold">{playerChips.toLocaleString()} chip</div>
            </div>
          </div>
        </div>
      </header>

      {/* Mode Carousel */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <h2 className="text-3xl font-black text-white mb-2">Chọn chế độ chơi</h2>
        <p className="text-gray-400 mb-8">Chọn một chế độ để bắt đầu</p>

        <div className="relative w-full max-w-4xl">
          <button
            onClick={prev}
            disabled={currentIndex === 0}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-30 transition"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="overflow-hidden mx-16">
            <motion.div
              className="flex gap-6"
              animate={{ x: `-${currentIndex * (100 / 3)}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {MODES.map((mode) => (
                <motion.button
                  key={mode.id}
                  onClick={() => mode.id !== 'coming1' && onSelectMode(mode.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={mode.id === 'coming1'}
                  className={`
                    flex-shrink-0 w-64 h-80 rounded-2xl bg-gradient-to-br ${mode.color}
                    border border-white/10 flex flex-col items-center justify-center gap-4 p-6
                    transition-all duration-200 cursor-pointer
                    ${mode.id === 'coming1' ? 'opacity-50 cursor-not-allowed' : 'hover:border-yellow-400/50 hover:shadow-xl hover:shadow-yellow-400/10'}
                  `}
                >
                  <div className="text-6xl">{mode.icon}</div>
                  <div className="text-xl font-black text-white text-center">{mode.name}</div>
                  <div className="text-sm text-white/70 text-center">{mode.description}</div>
                  <div className="flex items-center gap-1 text-xs text-white/50 mt-2">
                    <Users size={14} />
                    <span>{mode.players} người</span>
                  </div>
                  {mode.id !== 'coming1' && (
                    <div className="mt-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-bold">
                      Chơi ngay
                    </div>
                  )}
                </motion.button>
              ))}
            </motion.div>
          </div>

          <button
            onClick={next}
            disabled={currentIndex === MODES.length - 1}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-30 transition"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Pagination dots */}
        <div className="flex gap-2 mt-6">
          {MODES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-3 h-3 rounded-full transition ${i === currentIndex ? 'bg-yellow-400' : 'bg-gray-600'}`}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-gray-500 text-xs border-t border-gray-800">
        <Zap size={12} className="inline mr-1" />
        Game đánh bài giải trí — Không có tiền thật
      </footer>
    </div>
  )
}
