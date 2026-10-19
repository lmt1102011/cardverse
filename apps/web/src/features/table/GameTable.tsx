import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Play, ChevronUp, Eye, Hand, RotateCcw, Star, X } from 'lucide-react'
import { PlayingCard } from '../../components/PlayingCard'
import { MagicCard } from '../../components/MagicCard'
import { MAGIC_CARDS } from '@cardverse/shared'

interface PlayerData {
  id: string; name: string; avatar: string; chips: number; isHost: boolean; isDealer: boolean
  seatIndex: number; connected: boolean; bet: number; betConfirmed: boolean; status: string
  hand: { cards: any[]; score: number; isBlackjack: boolean; isBust: boolean; isStand: boolean; revealed: boolean } | null
  magicCards?: Array<{ id: string; slug: string; quantity: number; usedInRound: boolean }>
  magicUsedThisRound: boolean; magicShield: boolean; magicLocked: boolean; blindUntil?: number
}

interface GameTableProps {
  room: {
    id: string; name: string; code: string; mode: string; phase: string
    dealerId: string | null; hostId: string; currentRoundId: string | null
    deckCount: number; roundNumber: number; roundResults: any[]
    currentTurnPlayerId: string | null
    minBet: number; maxBet: number; players: PlayerData[]
  }
  myId: string
  onLeave: () => void
  onStart: () => void
  onPlaceBet: (amount: number) => void
  onConfirmBet: () => void
  onDraw: () => void
  onStand: () => void
  onUseMagic: (magicCardId: string, targetPlayerId?: string, targetCardId?: string) => void
  onNextRound: () => void
  notification: string | null
  magicRevealed: { casterId: string; message: string; revealedCards: any[] } | null
  onClearMagicRevealed: () => void
}

const SEAT_STYLES = [
  { top: '8%', left: '10%' },
  { top: '4%', left: '38%' },
  { top: '8%', left: '66%' },
  { top: '35%', left: '82%' },
  { top: '68%', left: '66%' },
  { top: '72%', left: '38%' },
  { top: '68%', left: '10%' },
  { top: '35%', left: '-2%' }
]

const BET_CHIPS = [
  { value: 10, bg: 'bg-emerald-500', border: 'border-emerald-300' },
  { value: 20, bg: 'bg-sky-500', border: 'border-sky-300' },
  { value: 50, bg: 'bg-amber-500', border: 'border-amber-300' },
  { value: 100, bg: 'bg-rose-500', border: 'border-rose-300' }
]

export function GameTable({
  room, myId, onLeave, onStart, onPlaceBet, onConfirmBet, onDraw, onStand,
  onUseMagic, onNextRound, notification, magicRevealed, onClearMagicRevealed
}: GameTableProps) {
  const [selectedBet, setSelectedBet] = useState(0)
  const [showMagic, setShowMagic] = useState(false)
  const [selectedMagic, setSelectedMagic] = useState<string | null>(null)
  const [selectingTarget, setSelectingTarget] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const me = room.players.find((p) => p.id === myId) || null

  useEffect(() => {
    if (!me?.blindUntil || me.blindUntil <= Date.now()) return
    const t = setInterval(() => setNowTick(Date.now()), 500)
    return () => clearInterval(t)
  }, [me?.blindUntil])

  const blindActive = !!me?.blindUntil && me.blindUntil > nowTick

  const isHost = room.hostId === myId
  const myTurn = !!me && room.phase === 'playing' && room.currentTurnPlayerId === myId
  const canBet = room.phase === 'betting' && me && !me.isDealer && !me.betConfirmed

  const handleMagicToggle = useCallback(() => {
    setShowMagic(!showMagic)
    setSelectedMagic(null)
    setSelectingTarget(false)
    setSelectedTarget(null)
  }, [showMagic])

  const handleMagicSelect = (slug: string) => {
    const def = MAGIC_CARDS.find((c) => c.slug === slug)
    if (!def) return
    if (def.targetType === 'any_player' || def.targetType === 'player') {
      setSelectedMagic(slug)
      setSelectingTarget(true)
    } else {
      setSelectedMagic(slug)
    }
  }

  const handleTargetSelect = (playerId: string) => {
    if (playerId === myId) return
    setSelectedTarget(playerId)
    setSelectingTarget(false)
  }

  const handleUseMagic = () => {
    if (!selectedMagic || !me?.magicCards) return
    const owned = me.magicCards.find((m) => m.slug === selectedMagic && m.quantity > 0 && !m.usedInRound)
    if (!owned) return
    onUseMagic(owned.id, selectedTarget || undefined)
    setShowMagic(false)
    setSelectedMagic(null)
    setSelectingTarget(false)
    setSelectedTarget(null)
  }

  const handleAddChip = (value: number) => {
    if (!canBet) return
    setSelectedBet((v) => v + value)
  }

  const handleConfirmBet = () => {
    if (selectedBet >= room.minBet) {
      onPlaceBet(selectedBet)
      onConfirmBet()
      setSelectedBet(0)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onLeave} className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700">
            <LogOut size={16} />
          </button>
          <div>
            <div className="text-sm font-bold text-white">{room.name}</div>
            <div className="text-[10px] text-gray-400">Mã: {room.code} | Ván {room.roundNumber} | Bài: {room.deckCount}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
            room.phase === 'waiting' ? 'bg-green-500/20 text-green-400' :
            room.phase === 'betting' ? 'bg-yellow-500/20 text-yellow-400' :
            room.phase === 'playing' ? 'bg-blue-500/20 text-blue-400' :
            room.phase === 'settled' ? 'bg-purple-500/20 text-purple-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {room.phase === 'waiting' ? 'Chờ bắt đầu' :
             room.phase === 'betting' ? 'Đặt cược' :
             room.phase === 'playing' ? 'Đang chơi' :
             room.phase === 'settled' ? 'Kết quả' : room.phase}
          </span>
          <div className="text-xs text-yellow-400 font-bold">{me?.chips.toLocaleString()} chip</div>
        </div>
      </header>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Magic revealed overlay */}
      <AnimatePresence>
        {magicRevealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={onClearMagicRevealed}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-purple-500 rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-purple-300">🪄 Magic Card</h3>
                <button onClick={onClearMagicRevealed} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <p className="text-white mb-4">{magicRevealed.message}</p>
              {magicRevealed.revealedCards.length > 0 && (
                <div className="flex gap-2 justify-center">
                  {magicRevealed.revealedCards.map((card: any, i: number) => (
                    <PlayingCard key={i} card={card} size="lg" />
                  ))}
                </div>
              )}
              <button onClick={onClearMagicRevealed} className="w-full mt-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500">
                Đóng
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blind overlay */}
      <AnimatePresence>
        {blindActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="fixed inset-0 z-50 pointer-events-none bg-purple-900/70 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-center">
              <div className="text-6xl mb-2">🙈</div>
              <p className="text-white text-xl font-black tracking-widest">BỊ BỊT MẮT!</p>
              <p className="text-purple-200 text-sm mt-1">{Math.ceil((me!.blindUntil! - nowTick) / 1000)}s</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main table area */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {/* Table oval */}
        <div className="absolute w-[80%] h-[70%] rounded-[50%] bg-gradient-to-b from-emerald-900/60 to-emerald-950/60 border-2 border-emerald-700/50 shadow-2xl shadow-emerald-900/50" />

        {/* Center info */}
        <div className="relative z-10 text-center">
          {room.phase === 'waiting' && (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm">Chờ chủ phòng bắt đầu ván mới</p>
              {isHost && room.players.length >= 2 && (
                <button
                  onClick={onStart}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black text-lg hover:from-yellow-400 hover:to-amber-400 transition flex items-center gap-2 mx-auto"
                >
                  <Play size={22} /> BẮT ĐẦU
                </button>
              )}
              {isHost && room.players.length < 2 && (
                <p className="text-gray-500 text-xs">Cần ít nhất 2 người để bắt đầu</p>
              )}
            </div>
          )}

          {room.phase === 'betting' && me && !me.isDealer && canBet && (
            <div className="space-y-3">
              <p className="text-yellow-300 font-semibold">Đặt cược (tối thiểu {room.minBet})</p>
              <div className="flex gap-2 justify-center">
                {BET_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    onClick={() => handleAddChip(chip.value)}
                    className={`w-14 h-14 rounded-full ${chip.bg} border-2 ${chip.border} text-white font-black text-lg hover:scale-110 transition shadow-lg`}
                  >
                    {chip.value}
                  </button>
                ))}
              </div>
              <div className="text-white text-xl font-bold">Cược: {selectedBet}</div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setSelectedBet(0)} className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm">Xóa</button>
                <button
                  onClick={handleConfirmBet}
                  disabled={selectedBet < room.minBet}
                  className="px-8 py-2 rounded-lg bg-yellow-500 text-black font-bold disabled:opacity-40 hover:bg-yellow-400 transition"
                >
                  XÁC NHẬN CƯỢC
                </button>
              </div>
            </div>
          )}

          {room.phase === 'betting' && me && !me.isDealer && me.betConfirmed && (
            <p className="text-green-400 font-semibold">✓ Đã xác nhận cược ({me.bet})</p>
          )}

          {room.phase === 'betting' && me?.isDealer && (
            <p className="text-blue-300 font-semibold">Bạn là Nhà cái — chờ người chơi đặt cược</p>
          )}

          {room.phase === 'playing' && me?.hand && (
            <div className="space-y-3">
              <div className="flex gap-1 justify-center">
                {me.hand.cards.map((card, i) => (
                  <motion.div
                    key={card.id || i}
                    initial={{ y: -50, opacity: 0, rotate: -10 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <PlayingCard card={card} faceDown={!me.hand!.revealed && card.id?.startsWith('hidden')} size="lg" />
                  </motion.div>
                ))}
              </div>
              <div className="text-white font-bold text-lg">Điểm: {me.hand.score}</div>
              {myTurn && (
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={onDraw}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-500 hover:to-indigo-500 transition flex items-center gap-2"
                  >
                    <ChevronUp size={18} /> RÚT BÀI
                  </button>
                  <button
                    onClick={onStand}
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 text-white font-bold hover:from-gray-500 hover:to-gray-600 transition flex items-center gap-2"
                  >
                    <Hand size={18} /> DỪNG
                  </button>
                </div>
              )}
              {!myTurn && <p className="text-gray-400 text-sm">Chờ người khác chơi...</p>}
            </div>
          )}

          {room.phase === 'playing' && !me?.hand && (
            <p className="text-gray-400">Đang chờ lượt...</p>
          )}
        </div>

        {/* Seats */}
        {room.players.map((player) => {
          const seatStyle = SEAT_STYLES[player.seatIndex] || SEAT_STYLES[0]
          const isMe = player.id === myId
          const isCurrentTurn = room.phase === 'playing' && room.currentTurnPlayerId === player.id

          return (
            <motion.div
              key={player.id}
              className={`absolute z-10 flex flex-col items-center gap-1 ${isMe ? '' : ''}`}
              style={{ top: seatStyle.top, left: seatStyle.left }}
              animate={isCurrentTurn ? { scale: 1.05 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {/* Player info */}
              <div className={`relative rounded-xl px-3 py-2 border-2 transition ${
                isCurrentTurn ? 'border-yellow-400 bg-gray-800/90 shadow-lg shadow-yellow-400/20' :
                player.isDealer ? 'border-blue-400 bg-gray-800/90' :
                'border-gray-700 bg-gray-800/80'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    player.connected ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 'bg-gray-600'
                  }`}>
                    {player.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{player.name}</div>
                    <div className="text-[10px] text-yellow-400">{player.chips.toLocaleString()}</div>
                  </div>
                </div>
                {player.isHost && <div className="absolute -top-2 -right-2 text-[9px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-bold">CHỦ</div>}
                {player.isDealer && <div className="absolute -top-2 -left-2 text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">NHÀ CÁI</div>}
                {player.magicShield && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full">🛡</div>}
                {player.betConfirmed && <div className="absolute -bottom-2 -right-2 text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">✓ {player.bet}</div>}
              </div>

              {/* Cards */}
              {player.hand && (
                <div className={`flex gap-0.5 ${player.seatIndex < 4 ? 'flex-row' : 'flex-row'}`}>
                  {player.hand.cards.map((card, i) => {
                    const isHidden = card.id?.startsWith('hidden') && !player.hand!.revealed
                    return (
                      <motion.div
                        key={card.id || i}
                        initial={{ y: -30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.08 }}
                        className="origin-bottom"
                        style={{
                          transform: `rotate(${(i - (player.hand!.cards.length - 1) / 2) * 8}deg) translateY(${-i * 2}px)`
                        }}
                      >
                        <PlayingCard card={card} faceDown={isHidden} size="sm" />
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Score */}
              {player.hand && (player.hand.revealed || isMe) && (
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  player.hand.isBust ? 'bg-red-500/30 text-red-300' :
                  player.hand.isBlackjack ? 'bg-yellow-500/30 text-yellow-300' :
                  'bg-gray-700/50 text-gray-300'
                }`}>
                  {player.hand.isBust ? 'QUẮC' : player.hand.isBlackjack ? 'XÌ DÁCH!' : `${player.hand.score} điểm`}
                </div>
              )}

              {/* Target selection */}
              {selectingTarget && !isMe && (
                <button
                  onClick={() => handleTargetSelect(player.id)}
                  className="absolute inset-0 rounded-xl border-2 border-yellow-400 bg-yellow-400/10 animate-pulse flex items-center justify-center"
                >
                  <span className="text-[10px] text-yellow-400 font-bold">CHỌN</span>
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-gray-800 px-4 py-3 flex items-center justify-between z-20">
        {/* Magic Card button */}
        <button
          onClick={handleMagicToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition ${
            showMagic ? 'bg-purple-600 text-white' : 'bg-gray-800 text-purple-300 border border-purple-500/50 hover:bg-gray-700'
          }`}
        >
          <Star size={18} /> MAGIC CARD
        </button>

        {/* Phase-specific controls */}
        <div className="flex items-center gap-2">
          {room.phase === 'settled' && (
            <button
              onClick={onNextRound}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold hover:from-yellow-400 hover:to-amber-400 transition flex items-center gap-2"
            >
              <RotateCcw size={18} /> VÁN TIẾP THEO
            </button>
          )}
        </div>

        {/* My hand quick view */}
        {me?.hand && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 mr-2">Bài:</span>
            {me.hand.cards.map((card, i) => (
              <PlayingCard key={i} card={card} faceDown={false} size="sm" />
            ))}
            <span className="text-sm font-bold text-white ml-2">{me.hand.score}</span>
          </div>
        )}
      </div>

      {/* Magic Card panel */}
      <AnimatePresence>
        {showMagic && me?.magicCards && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="absolute bottom-20 left-0 right-0 z-30 bg-gray-900/95 border-t-2 border-purple-500 p-4 backdrop-blur"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-purple-300">Kho phép của bạn</h3>
              <button onClick={handleMagicToggle} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>

            {selectingTarget && (
              <p className="text-yellow-300 text-sm mb-3">🎯 Chọn mục tiêu — bấm vào avatar người chơi</p>
            )}

            <div className="flex gap-3 overflow-x-auto pb-2">
              {me.magicCards.map((owned) => {
                const def = MAGIC_CARDS.find((c) => c.slug === owned.slug)
                if (!def) return null
                return (
                  <MagicCard
                    key={owned.id}
                    def={def}
                    quantity={owned.quantity}
                    used={owned.usedInRound || owned.quantity <= 0}
                    selected={selectedMagic === owned.slug}
                    onClick={() => handleMagicSelect(owned.slug)}
                    compact
                  />
                )
              })}
              {me.magicCards.length === 0 && (
                <p className="text-gray-500 text-sm py-4">Chưa có Magic Card nào. Chơi ván đầu tiên để nhận!</p>
              )}
            </div>

            {selectedMagic && !selectingTarget && (
              <div className="mt-3 flex items-center gap-3">
                <div className="text-sm text-gray-300">
                  <span className="text-yellow-400 font-bold">{MAGIC_CARDS.find((c) => c.slug === selectedMagic)?.name}</span>
                  {' '}— {MAGIC_CARDS.find((c) => c.slug === selectedMagic)?.description}
                </div>
                <button
                  onClick={handleUseMagic}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500"
                >
                  DÙNG PHÉP
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results overlay */}
      <AnimatePresence>
        {room.phase === 'settled' && room.roundResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-40"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full mx-4"
            >
              <h2 className="text-2xl font-black text-white text-center mb-4">KẾT QUẢ VÁN {room.roundNumber}</h2>
              <div className="space-y-2">
                {room.roundResults.map((result: any, i: number) => {
                  const player = room.players.find((p) => p.id === result.playerId)
                  return (
                    <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{player?.avatar || '👤'}</span>
                        <span className="text-white font-semibold text-sm">{player?.name || 'Unknown'}</span>
                        {result.isBlackjack && <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded">XÌ DÁCH</span>}
                        {result.isBust && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">QUẮC</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm">{result.score} điểm</span>
                        <span className={`font-bold ${
                          result.payout > 0 ? 'text-green-400' : result.payout < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {result.payout > 0 ? '+' : ''}{result.payout}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={onNextRound}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black hover:from-yellow-400 hover:to-amber-400 transition"
              >
                VÁN TIẾP THEO
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
