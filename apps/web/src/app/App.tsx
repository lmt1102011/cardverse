import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../stores/app-store'
import { getSocket } from '../services/socket'
import { Home } from '../features/lobby/Home'
import { RoomList } from '../features/rooms/RoomList'
import { GameTable } from '../features/table/GameTable'

type Page = 'home' | 'rooms' | 'table'
type View = 'name' | Page

function App() {
  const [view, setView] = useState<View>('name')
  const [selectedMode, setSelectedMode] = useState<string>('')
  const [inputName, setInputName] = useState('')
  const [rooms, setRooms] = useState<any[]>([])
  const [notification, setNotification] = useState<string | null>(null)
  const [magicRevealed, setMagicRevealed] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const store = useAppStore()
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null)

  useEffect(() => {
    if (view === 'name') return

    const socket = getSocket()
    socketRef.current = socket

    const onConnect = () => store.setConnected(true)
    const onDisconnect = () => {
      store.setConnected(false)
      setNotification('Mất kết nối server...')
    }
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    if (socket.connected) store.setConnected(true)

    socket.on('room:update' as any, (room: any) => {
      store.setCurrentRoom(room)
      const sess = useAppStore.getState().session
      const me = room.players?.find((p: any) => p.id === sess?.id)
      if (me && sess && me.chips !== sess.chips) {
        store.setSession({ ...sess, chips: me.chips })
      }
      if (room.phase === 'playing') setView('table')
    })

    socket.on('player:joined' as any, (data: any) => {
      setNotification(`${data.playerName} đã vào phòng`)
      setTimeout(() => setNotification(null), 2000)
    })

    socket.on('player:left' as any, () => {
      setNotification('Có người chơi đã rời phòng')
      setTimeout(() => setNotification(null), 2000)
    })

    socket.on('notification' as any, (data: any) => {
      setNotification(data.message)
      setTimeout(() => setNotification(null), 3000)
    })

    socket.on('game:dealt' as any, () => {
      setNotification('Đã chia bài!')
      setTimeout(() => setNotification(null), 1500)
    })

    socket.on('game:roundEnded' as any, () => {
      setNotification('Ván đã kết thúc!')
      setTimeout(() => setNotification(null), 2000)
    })

    socket.on('magic:effect' as any, (data: any) => {
      if (data.revealedCards && data.revealedCards.length > 0) {
        setMagicRevealed(data)
        setTimeout(() => setMagicRevealed(null), 8000)
      } else if (data.message) {
        setNotification(data.message)
        setTimeout(() => setNotification(null), 3000)
      }
    })

    socket.on('rooms' as any, (roomList: any[]) => {
      setRooms(roomList)
    })

    socket.on('room:closed' as any, () => {
      store.setCurrentRoom(null)
      setNotification('Phòng đã đóng')
      setTimeout(() => setNotification(null), 2500)
      setView('rooms')
    })

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('room:update')
      socket.off('player:joined')
      socket.off('player:left')
      socket.off('notification')
      socket.off('game:dealt')
      socket.off('game:roundEnded')
      socket.off('magic:effect')
      socket.off('rooms')
      socket.off('room:closed')
    }
  }, [view])

  const refreshRooms = useCallback(() => {
    const socket = getSocket()
    socket.emit('room:list', selectedMode || undefined, (roomList: any[]) => {
      setRooms(roomList)
    })
  }, [selectedMode])

  useEffect(() => {
    if (view === 'rooms') {
      refreshRooms()
      const interval = setInterval(refreshRooms, 3000)
      return () => clearInterval(interval)
    }
  }, [view, refreshRooms])

  const handleNameSubmit = () => {
    if (!inputName.trim()) return
    const socket = getSocket()
    socket.emit('session:create', inputName.trim(), (session: any) => {
      store.setSession(session)
      setView('home')
    })
  }

  const handleSelectMode = (modeId: string) => {
    setSelectedMode(modeId)
    setView('rooms')
  }

  const handleCreateRoom = (opts: any) => {
    const socket = getSocket()
    socket.emit('room:create', { ...opts, mode: selectedMode }, (res: any) => {
      if (res.error) {
        setError(res.error)
        setTimeout(() => setError(null), 3000)
        return
      }
      store.setCurrentRoom(res.room)
      setView('table')
    })
  }

  const handleJoinRoom = (roomId: string, password?: string) => {
    const socket = getSocket()
    socket.emit('room:join', { roomId, password }, (res: any) => {
      if (res.error) {
        setError(res.error)
        setTimeout(() => setError(null), 3000)
        return
      }
      store.setCurrentRoom(res.room)
      setView('table')
    })
  }

  const handleLeaveRoom = () => {
    if (!store.currentRoom) return
    const socket = getSocket()
    socket.emit('room:leave', store.currentRoom.id, () => {
      store.setCurrentRoom(null)
      setView('rooms')
    })
  }

  const handleStart = () => {
    if (!store.currentRoom) return
    const socket = getSocket()
    socket.emit('room:start', store.currentRoom.id, (res: any) => {
      if (res.error) {
        setNotification(res.error)
        setTimeout(() => setNotification(null), 2000)
        return
      }
      store.setCurrentRoom(res.room)
    })
  }

  const handlePlaceBet = (amount: number) => {
    if (!store.currentRoom) return
    const socket = getSocket()
    socket.emit('game:placeBet', { roomId: store.currentRoom.id, amount }, () => {})
  }

  const handleConfirmBet = () => {
    if (!store.currentRoom) return
    const socket = getSocket()
    socket.emit('game:confirmBet', { roomId: store.currentRoom.id }, (res: any) => {
      if (res.error) {
        setNotification(res.error)
        setTimeout(() => setNotification(null), 2000)
      }
    })
  }

  const handleDraw = () => {
    if (!store.currentRoom) return
    const socket = getSocket()
    socket.emit('game:draw', { roomId: store.currentRoom.id }, (res: any) => {
      if (res.error) {
        setNotification(res.error)
        setTimeout(() => setNotification(null), 2000)
      }
    })
  }

  const handleStand = () => {
    if (!store.currentRoom) return
    const socket = getSocket()
    socket.emit('game:stand', { roomId: store.currentRoom.id }, (res: any) => {
      if (res.error) {
        setNotification(res.error)
        setTimeout(() => setNotification(null), 2000)
      }
    })
  }

  const handleUseMagic = (magicCardId: string, targetPlayerId?: string, targetCardId?: string) => {
    if (!store.currentRoom) return
    const socket = getSocket()
    socket.emit('magic:use', {
      roomId: store.currentRoom.id,
      magicCardId,
      targetPlayerId,
      targetCardId
    }, (res: any) => {
      if (!res.success) {
        setNotification(res.message)
        setTimeout(() => setNotification(null), 2000)
      }
    })
  }

  const handleNextRound = () => {
    if (!store.currentRoom) return
    const socket = getSocket()
    socket.emit('game:nextRound', { roomId: store.currentRoom.id }, (res: any) => {
      if (res.room) store.setCurrentRoom(res.room)
    })
  }

  const handleRefreshRooms = () => refreshRooms()

  // Name input screen
  if (view === 'name') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-black text-4xl font-black mb-6">
            ♠
          </div>
          <h1 className="text-3xl font-black text-white mb-1">BÀI QUẨY</h1>
          <p className="text-yellow-400 text-sm tracking-widest mb-8">CARDVERSE</p>

          <div className="space-y-4">
            <input
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-lg focus:border-yellow-400 focus:outline-none"
              placeholder="Nhập tên của bạn..."
              maxLength={16}
              autoFocus
            />
            <button
              onClick={handleNameSubmit}
              disabled={!inputName.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-black text-lg hover:from-yellow-400 hover:to-amber-400 disabled:opacity-40 transition"
            >
              BẮT ĐẦU CHƠI
            </button>
          </div>

          <p className="text-gray-500 text-xs mt-8">Game giải trí — Không có tiền thật</p>
        </div>
      </div>
    )
  }

  if (view === 'home' && store.session) {
    return (
      <div className="relative">
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
            {error}
          </div>
        )}
        <Home
          playerName={store.session.name}
          playerChips={store.session.chips}
          playerAvatar={store.session.avatar}
          onSelectMode={handleSelectMode}
        />
      </div>
    )
  }

  if (view === 'rooms') {
    return (
      <div className="relative">
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
            {error}
          </div>
        )}
        <RoomList
          mode={selectedMode}
          rooms={rooms}
          onBack={() => setView('home')}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          onRefresh={handleRefreshRooms}
        />
      </div>
    )
  }

  if (view === 'table' && store.currentRoom && store.session) {
    return (
      <div className="relative">
        <GameTable
          room={store.currentRoom as any}
          myId={store.session.id}
          onLeave={handleLeaveRoom}
          onStart={handleStart}
          onPlaceBet={handlePlaceBet}
          onConfirmBet={handleConfirmBet}
          onDraw={handleDraw}
          onStand={handleStand}
          onUseMagic={handleUseMagic}
          onNextRound={handleNextRound}
          notification={notification}
          magicRevealed={magicRevealed}
          onClearMagicRevealed={() => setMagicRevealed(null)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="text-center">
        <p className="text-xl">Đang kết nối...</p>
        <button onClick={() => setView('home')} className="mt-4 px-4 py-2 bg-gray-800 rounded-lg">Về trang chủ</button>
      </div>
    </div>
  )
}

export default App
