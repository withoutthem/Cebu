// src/pages/TestPage.tsx
import { useMemo, useRef, useState } from 'react'
import { Box, Button, Chip, Paper, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { qk } from '@/shared/query/keys'
import { type LiveChatMessageDto, testService } from '@/domains/test/services/testService'

/** 안전한 문자열 변환 (eslint/no-base-to-string, restrict-template-expressions 대응) */
function toSafeString(input: unknown): string {
  if (typeof input === 'string') return input
  if (typeof input === 'number' || typeof input === 'boolean' || input == null) return String(input)
  try {
    return JSON.stringify(input)
  } catch {
    return '[Unserializable]'
  }
}

/** 로그 항목 (index 키 사용 금지 → 고유 id 생성) */
type LogEntry = { id: string; text: string }
const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const TestPage = () => {
  // UI state
  const [roomId, setRoomId] = useState<string>('')
  const [sender, setSender] = useState<string>('tester')
  const [messageInput, setMessageInput] = useState<string>('hello')

  const [logs, setLogs] = useState<LogEntry[]>([])
  const logRef = useRef<HTMLDivElement | null>(null)

  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined

  // 1) REST Ping (수동 트리거) — TData=string, TError=unknown(기본) 대신 안전하게 지정
  const pingQuery = useQuery<string, Error>({
    queryKey: qk.test.restPing(),
    queryFn: testService.restPing, // Promise<string>
    enabled: false,
    refetchOnWindowFocus: false,
  })

  const handlePing = async () => {
    const res = await pingQuery.refetch() // QueryObserverResult<string, Error>
    const line =
      res.data != null
        ? `[PING OK] ${new Date().toLocaleTimeString()} - ${toSafeString(res.data)}`
        : `[PING FAIL] ${new Date().toLocaleTimeString()} - ${toSafeString(res.error?.message)}`
    setLogs((prev) => [...prev, { id: makeId(), text: line }])
    requestAnimationFrame(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
    })
  }

  // 2) Broadcast 테스트 (Mutation) — TData=void, TError=Error, TVariables=LiveChatMessageDto
  const canBroadcast = useMemo(() => roomId.trim().length > 0, [roomId])

  const broadcastMutation = useMutation<void, Error, LiveChatMessageDto>({
    mutationKey: qk.test.broadcast(roomId || '_'),
    mutationFn: (payload) => testService.broadcast(roomId, payload),
    onSuccess: () => {
      setLogs((prev) => [
        ...prev,
        {
          id: makeId(),
          text: `[BROADCAST OK] ${new Date().toLocaleTimeString()} - room="${roomId}"`,
        },
      ])
      requestAnimationFrame(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
      })
    },
    onError: (e) => {
      setLogs((prev) => [
        ...prev,
        {
          id: makeId(),
          text: `[BROADCAST FAIL] ${new Date().toLocaleTimeString()} - ${toSafeString(e.message)}`,
        },
      ])
      requestAnimationFrame(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
      })
    },
  })

  const handleBroadcast = () => {
    const body: LiveChatMessageDto = { sender: sender || 'tester', message: messageInput || '' }
    broadcastMutation.mutate(body)
  }

  const pingStatus: 'idle' | 'loading' | 'success' | 'error' = pingQuery.isFetching
    ? 'loading'
    : pingQuery.isSuccess
      ? 'success'
      : pingQuery.isError
        ? 'error'
        : 'idle'

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        🚀 HMM 챗봇UI 테스트 페이지 (REST 먼저 점검)
      </Typography>

      {/* --- Env 디버그 --- */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">0. 환경 확인</Typography>
        <Box mt={1}>
          <Chip
            sx={{ mr: 1 }}
            label={`API_BASE=${apiBase ?? '(unset)'}`}
            color={apiBase ? 'primary' : 'default'}
            variant="outlined"
          />
          <Chip
            label={`Ping: ${pingStatus}`}
            color={
              pingStatus === 'success'
                ? 'success'
                : pingStatus === 'error'
                  ? 'error'
                  : pingStatus === 'loading'
                    ? 'warning'
                    : 'default'
            }
          />
          <Button
            onClick={handlePing}
            variant="contained"
            size="small"
            sx={{ ml: 2 }}
            disabled={pingQuery.isFetching}
          >
            REST /test 핑
          </Button>
        </Box>
      </Paper>

      {/* --- Broadcast 테스트 --- */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">1. Broadcast 테스트 (POST /test/broadcast/:roomId)</Typography>
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

      {/* --- 로그 --- */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6">2. 로그</Typography>
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
            <div>로그가 없습니다. 먼저 "REST /test 핑" 또는 "Broadcast 전송"을 눌러보세요.</div>
          ) : (
            logs.map((l) => <div key={l.id}>{l.text}</div>)
          )}
        </Box>
      </Paper>
    </Box>
  )
}

export default TestPage
