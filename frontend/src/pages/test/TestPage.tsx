// src/pages/TestPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Chip, Divider, Paper, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { qk } from '@/shared/query/keys'
import { type LiveChatMessageDto, testService } from '@/domains/test/services/testService'
import { useWs } from '@/app/providers/wsProvider'
import { ws } from '@/shared/platform/ws/wsService'

/* ------------------ 안전 유틸 ------------------ */

/** 안전한 문자열 변환 (no-base-to-string / restrict-template-expressions 대응) */
function toSafeString(input: unknown): string {
  if (typeof input === 'string') return input
  if (typeof input === 'number' || typeof input === 'boolean' || input == null) return String(input)
  try {
    return JSON.stringify(input)
  } catch {
    return '[Unserializable]'
  }
}

/** 고유 id */
function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** 안전한 Vite env 읽기 (eslint: no-unsafe-member-access 방지) */
function readEnvString(key: string): string | undefined {
  const meta = import.meta as unknown as { env?: unknown }
  const env = meta.env
  if (!env || typeof env !== 'object') return undefined
  const value = (env as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

/* ------------------ 서버 푸시 타입(테스트용) + 내로잉 ------------------ */

type TickMsg = { type: 'tick'; seq: number; message?: string }
type BusMsg = { topic: string; data: unknown }

function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object'
}

function isTickMsg(x: unknown): x is TickMsg {
  if (!isObject(x)) return false
  const type = x['type']
  const seq = x['seq']
  return typeof type === 'string' && type === 'tick' && typeof seq === 'number'
}

function isBusMsg(x: unknown): x is BusMsg {
  if (!isObject(x)) return false
  const topic = x['topic']
  return typeof topic === 'string' && 'data' in x
}

/* ------------------ 페이지 ------------------ */

type LogEntry = { id: string; text: string }

const TestPage = () => {
  // UI state
  const [roomId, setRoomId] = useState<string>('')
  const [sender, setSender] = useState<string>('tester')
  const [messageInput, setMessageInput] = useState<string>('hello')

  const [logs, setLogs] = useState<LogEntry[]>([])
  const logRef = useRef<HTMLDivElement | null>(null)

  // ENV 표기 (안전 접근)
  const apiBase = readEnvString('VITE_API_BASE_URL')

  // ------------------ React Query (기존) ------------------
  const pingQuery = useQuery<string, Error>({
    queryKey: qk.test.restPing(),
    queryFn: testService.restPing,
    enabled: false,
    refetchOnWindowFocus: false,
  })

  const pushLog = (text: string) => {
    setLogs((prev) => [...prev, { id: makeId(), text }])
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
    })
  }

  const handlePing = async () => {
    const res = await pingQuery.refetch()
    pushLog(
      res.data != null
        ? `[PING OK] ${new Date().toLocaleTimeString()} - ${toSafeString(res.data)}`
        : `[PING FAIL] ${new Date().toLocaleTimeString()} - ${toSafeString(res.error?.message)}`
    )
  }

  const canBroadcast = useMemo(() => roomId.trim().length > 0, [roomId])

  const broadcastMutation = useMutation<void, Error, LiveChatMessageDto>({
    mutationKey: qk.test.broadcast(roomId || '_'),
    mutationFn: (payload) => testService.broadcast(roomId, payload),
    onSuccess: () =>
      pushLog(`[BROADCAST OK] ${new Date().toLocaleTimeString()} - room="${roomId}"`),
    onError: (e) =>
      pushLog(`[BROADCAST FAIL] ${new Date().toLocaleTimeString()} - ${toSafeString(e.message)}`),
  })

  const handleBroadcast = () => {
    const body: LiveChatMessageDto = { sender: sender || 'tester', message: messageInput || '' }
    broadcastMutation.mutate(body)
  }

  // ------------------ WebSocket 연동 ------------------
  // WsProvider에서 제공하는 퍼사드: 현재 예제에서는 subscribe 만 사용 (unused 경고 방지)
  const { subscribe } = useWs()

  // WS 상태 뱃지
  const [wsStatus, setWsStatus] = useState<
    'idle' | 'connecting' | 'open' | 'closed' | 'reconnecting'
  >('idle')

  // 전역 WS 상태/메시지 리스너
  useEffect(() => {
    const offOpen = ws.on('open', () => setWsStatus('open'))
    const offConn = ws.on('connecting', () => setWsStatus('connecting'))
    const offClose = ws.on('close', () => setWsStatus('closed'))
    const offRe = ws.on('reconnecting', (attempt: number) => {
      setWsStatus('reconnecting')
      pushLog(`[WS] reconnecting attempt #${attempt}`)
    })
    const offErr = ws.on('error', (ev: unknown) => pushLog(`[WS] error: ${toSafeString(ev)}`))
    const offMsg = ws.on('message', (data: unknown) => {
      if (isTickMsg(data)) {
        pushLog(`[TICK] #${data.seq}${data.message ? ` ${data.message}` : ''}`)
      } else if (isBusMsg(data)) {
        pushLog(`[BUS RECV] topic="${data.topic}" data=${toSafeString(data.data)}`)
      }
    })
    return () => {
      offOpen()
      offConn()
      offClose()
      offRe()
      offErr()
      offMsg()
    }
  }, [])

  // Clock: 서버로 start 프레임 전송 → 서버가 3초마다 5회 tick 푸시
  const startClock = () => {
    ws.send({ destination: '/test/clock/start', body: {} })
    pushLog('[CLOCK] start requested')
  }

  // Bus 구독/발행
  const [busTopic, setBusTopic] = useState<string>('chat:general')
  const [busSubOff, setBusSubOff] = useState<(() => void) | null>(null)

  const subscribeBus = () => {
    ws.send({ destination: '/test/bus/subscribe', body: { topic: busTopic } })
    // 클라 로컬 라우팅도 같이
    const off = subscribe(busTopic, (m) => {
      pushLog(`[BUS LOCAL] topic="${busTopic}" data=${toSafeString(m)}`)
    })
    setBusSubOff(() => off)
    pushLog(`[BUS] subscribed "${busTopic}"`)
  }

  const unsubscribeBus = () => {
    ws.send({ destination: '/test/bus/unsubscribe', body: { topic: busTopic } })
    busSubOff?.()
    setBusSubOff(null)
    pushLog(`[BUS] unsubscribed "${busTopic}"`)
  }

  const publishBus = () => {
    ws.send({
      destination: '/test/bus/publish',
      body: { topic: busTopic, data: { text: messageInput || 'hi' } },
    })
    pushLog(`[BUS] publish requested topic="${busTopic}"`)
  }

  /* ------------------ 렌더 ------------------ */
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        🚀 HMM 챗봇UI 테스트 페이지 (REST + WebSocket)
      </Typography>

      {/* ENV & WS 상태 */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">0. 환경 & 연결 상태</Typography>
        <Stack direction="row" spacing={1} mt={1} alignItems="center" flexWrap="wrap">
          <Chip
            label={`API_BASE=${apiBase ?? '(unset)'}`}
            color={apiBase ? 'primary' : 'default'}
            variant="outlined"
          />
          <Chip
            label={`WS=${wsStatus}`}
            color={
              wsStatus === 'open'
                ? 'success'
                : wsStatus === 'connecting' || wsStatus === 'reconnecting'
                  ? 'warning'
                  : wsStatus === 'closed'
                    ? 'error'
                    : 'default'
            }
          />
          <Chip
            label={`Ping: ${
              pingQuery.isFetching
                ? 'loading'
                : pingQuery.isSuccess
                  ? 'success'
                  : pingQuery.isError
                    ? 'error'
                    : 'idle'
            }`}
            color={
              pingQuery.isFetching
                ? 'warning'
                : pingQuery.isSuccess
                  ? 'success'
                  : pingQuery.isError
                    ? 'error'
                    : 'default'
            }
          />
          <Button
            onClick={handlePing}
            variant="contained"
            size="small"
            disabled={pingQuery.isFetching}
          >
            REST /test 핑
          </Button>
        </Stack>
      </Paper>

      {/* Clock 테스트 */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">1. Clock 테스트 (서버 → 3초마다 5회 tick)</Typography>
        <Typography variant="body2" color="text.secondary">
          서버에 <code>/test/clock/start</code> 프레임을 보내면 3초 간격으로 5회{' '}
          {'{type:"tick", seq}'} 푸시.
        </Typography>
        <Box mt={1}>
          <Button variant="outlined" onClick={startClock}>
            Clock 시작
          </Button>
        </Box>
      </Paper>

      {/* Bus 테스트 */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">2. Bus 테스트 (구독/발행)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          A/B 두 탭에서 같은 topic을 구독한 뒤 한쪽에서 발행하면 다른 쪽이 수신됩니다.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            label="Topic"
            variant="outlined"
            size="small"
            value={busTopic}
            onChange={(e) => setBusTopic(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          {busSubOff ? (
            <Button variant="outlined" color="warning" onClick={unsubscribeBus}>
              Unsubscribe
            </Button>
          ) : (
            <Button variant="contained" onClick={subscribeBus} disabled={!busTopic.trim()}>
              Subscribe
            </Button>
          )}
          <Divider flexItem orientation="vertical" />
          <TextField
            label="Message"
            variant="outlined"
            size="small"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            sx={{ minWidth: 260, flex: 1 }}
          />
          <Button variant="contained" onClick={publishBus} disabled={!busTopic.trim()}>
            Publish
          </Button>
        </Stack>
      </Paper>

      {/* REST Broadcast (기존) */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">3. Broadcast 테스트 (POST /test/broadcast/:roomId)</Typography>
        <Box display="flex" alignItems="center" gap={2} mt={1} flexWrap="wrap">
          <TextField
            label="Room ID"
            variant="outlined"
            size="small"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            sx={{ minWidth: 180 }}
          />
          <TextField
            label="Sender"
            variant="outlined"
            size="small"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="Message"
            variant="outlined"
            size="small"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            sx={{ minWidth: 260, flex: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleBroadcast}
            disabled={!canBroadcast || broadcastMutation.isPending}
          >
            Broadcast 전송
          </Button>
          <Chip
            label={
              broadcastMutation.isPending
                ? 'sending...'
                : broadcastMutation.isSuccess
                  ? 'success'
                  : broadcastMutation.isError
                    ? 'error'
                    : 'idle'
            }
            color={
              broadcastMutation.isPending
                ? 'warning'
                : broadcastMutation.isSuccess
                  ? 'success'
                  : broadcastMutation.isError
                    ? 'error'
                    : 'default'
            }
          />
        </Box>
      </Paper>

      {/* 로그 */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6">4. 로그</Typography>
        <Box
          ref={logRef}
          sx={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            p: 2,
            mt: 1,
            height: '300px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            backgroundColor: '#f5f5f5',
            whiteSpace: 'pre-wrap',
          }}
        >
          {logs.length === 0 ? (
            <div>로그가 없습니다. "Clock 시작" 또는 "Subscribe/Publish"를 눌러보세요.</div>
          ) : (
            logs.map((l) => <div key={l.id}>{l.text}</div>)
          )}
        </Box>
      </Paper>
    </Box>
  )
}

export default TestPage
