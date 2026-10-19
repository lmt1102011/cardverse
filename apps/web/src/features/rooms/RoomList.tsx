import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, Users, Lock, Play, RefreshCw } from 'lucide-react'

interface RoomListItem {
  id: string; name: string; code: string; mode: string; isPrivate: boolean
  maxPlayers: number; playerCount: number; status: string; minBet: number; maxBet: number; hostName: string
}

interface RoomListProps {
  mode: string
  rooms: RoomListItem[]
  onBack: () => void
  onJoinRoom: (roomId: string, password?: string) => void
  onCreateRoom: (opts: { name: string; isPrivate: boolean; password?: string; maxPlayers: number; minBet: number; maxBet: number }) => void
  onRefresh: () => void
}

export function RoomList({ mode, rooms, onBack, onJoinRoom, onCreateRoom, onRefresh }: RoomListProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'private'>('all')
  const [joinPassword, setJoinPassword] = useState<string | null>(null)
  const [roomName, setRoomName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [minBet, setMinBet] = useState(10)
  const [maxBet, setMaxBet] = useState(100)

  const modeName = mode === 'xidach' ? 'Xì Dách Việt Nam' : 'Bài Cào Việt Nam'

  const filtered = rooms.filter((r) => {
    if (filter === 'waiting') return r.status === 'waiting'
    if (filter === 'private') return r.isPrivate
    return true
  })

  const handleCreate = () => {
    if (!roomName.trim()) return
    onCreateRoom({ name: roomName, isPrivate, password: isPrivate ? password : undefined, maxPlayers, minBet, maxBet })
    setShowCreate(false)
    setRoomName('')
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">{modeName}</h1>
            <p className="text-xs text-gray-400">{rooms.length} phòng</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onRefresh} className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 transition">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition"
          >
            <Plus size={18} />
            Tạo phòng
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex gap-2 px-6 py-4">
        {(['all', 'waiting', 'private'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              filter === f ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? 'Tất cả' : f === 'waiting' ? 'Đang chờ' : 'Riêng tư'}
          </button>
        ))}
      </div>

      {/* Room list */}
      <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((room) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-yellow-400/30 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold">{room.name}</h3>
                    {room.isPrivate && <Lock size={14} className="text-yellow-400" />}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Mã: {room.code}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  room.status === 'waiting' ? 'bg-green-500/20 text-green-400' :
                  room.status === 'playing' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {room.status === 'waiting' ? 'Đang chờ' : room.status === 'playing' ? 'Đang chơi' : 'Đã đầy'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                <span className="flex items-center gap-1"><Users size={14} />{room.playerCount}/{room.maxPlayers}</span>
                <span>Cược: {room.minBet}-{room.maxBet}</span>
              </div>

              <p className="text-xs text-gray-500 mb-3">Chủ phòng: {room.hostName}</p>

              <button
                onClick={() => {
                  if (room.isPrivate) setJoinPassword(room.id)
                  else onJoinRoom(room.id)
                }}
                disabled={room.playerCount >= room.maxPlayers || room.status === 'playing'}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 transition flex items-center justify-center gap-2"
              >
                <Play size={16} />
                {room.playerCount >= room.maxPlayers ? 'Đã đầy' : room.status === 'playing' ? 'Đang chơi' : 'Tham gia'}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p className="text-lg">Không có phòng nào</p>
            <p className="text-sm mt-1">Tạo phòng mới để bắt đầu chơi</p>
          </div>
        )}
      </div>

      {/* Create room modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
            >
              <h2 className="text-xl font-black text-white mb-4">Tạo phòng mới</h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Tên phòng</label>
                  <input
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                    placeholder="Nhập tên phòng..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Phòng riêng tư</label>
                  <button
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`w-12 h-6 rounded-full transition ${isPrivate ? 'bg-yellow-500' : 'bg-gray-700'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {isPrivate && (
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Mật khẩu</label>
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-yellow-400 focus:outline-none"
                      placeholder="Nhập mật khẩu..."
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Số người tối đa</label>
                    <select
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    >
                      {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Cược tối thiểu</label>
                    <select
                      value={minBet}
                      onChange={(e) => setMinBet(Number(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    >
                      {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 block mb-1">Cược tối đa</label>
                  <select
                    value={maxBet}
                    onChange={(e) => setMaxBet(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    {[50, 100, 200, 500, 1000].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!roomName.trim()}
                    className="flex-1 py-2 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 disabled:opacity-40 transition"
                  >
                    Tạo phòng
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join password modal */}
      <AnimatePresence>
        {joinPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setJoinPassword(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm"
            >
              <h2 className="text-lg font-bold text-white mb-4">Nhập mật khẩu phòng</h2>
              <input
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white mb-4 focus:border-yellow-400 focus:outline-none"
                placeholder="Mật khẩu..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && joinPassword) {
                    onJoinRoom(joinPassword, (e.target as HTMLInputElement).value)
                    setJoinPassword(null)
                  }
                }}
              />
              <div className="flex gap-3">
                <button onClick={() => setJoinPassword(null)} className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-300">Hủy</button>
                <button
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>('.bg-gray-800.mb-4')
                    onJoinRoom(joinPassword, input?.value)
                    setJoinPassword(null)
                  }}
                  className="flex-1 py-2 rounded-lg bg-yellow-500 text-black font-bold"
                >
                  Vào phòng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
