import { useWs } from '@/app/providers/wsProvider'
import { useCallback, useEffect, useState } from 'react'

// 로그 타입을 명확하게 정의
type LogEntry = {
  timestamp: string
  type: string
  data: unknown
}

export function WebSocketTestPage() {
  const { ws, publish, publishAck, subscribe } = useWs()

  const [status, setStatus] = useState<string>(ws.getState())
  const [eventLogs, setEventLogs] = useState<LogEntry[]>([])
  const [receivedMessages, setReceivedMessages] = useState<LogEntry[]>([])
  const [topic, setTopic] = useState<string>('chat:general')
  const [message, setMessage] = useState<string>('{"text":"Hello World"}')
  const [isSubscribed, setIsSubscribed] = useState(false)

  // 로그 추가 헬퍼 함수
  const addLog = useCallback((type: string, data: unknown = {}) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      type,
      data,
    }
    // 이벤트 로그에 모든 기록 추가
    setEventLogs((prev) => [entry, ...prev].slice(0, 100)) // 최대 100개 로그 유지

    // 'message' 타입일 경우, 수신 메시지 목록에도 추가
    if (type === 'message') {
      setReceivedMessages((prev) => [entry, ...prev].slice(0, 100))
    }
  }, [])

  // WebSocket 이벤트 리스너 등록
  useEffect(() => {
    // 현재 상태를 초기값으로 설정
    setStatus(ws.getState())

    const listeners = [
      ws.on('connecting', (attempt) => {
        setStatus('connecting')
        addLog('connecting', { attempt })
      }),
      ws.on('open', () => {
        setStatus('open')
        addLog('open')
      }),
      ws.on('close', (ev) => {
        setStatus('closed')
        addLog('close', { code: ev.code, reason: ev.reason })
      }),
      ws.on('error', (ev) => addLog('error', ev)),
      ws.on('reconnecting', (attempt, delay) => {
        setStatus(`reconnecting (attempt ${attempt})`)
        addLog('reconnecting', { attempt, delay })
      }),
      ws.on('reconnected', (attempt) => {
        setStatus('open')
        addLog('reconnected', { attempt })
      }),
      ws.on('heartbeat', (missed) => addLog('heartbeat(ping sent)', { missed })),
      ws.on('message', (data) => addLog('message', data)),
    ]

    // 컴포넌트 언마운트 시 모든 리스너 정리
    return () => listeners.forEach((off) => off())
  }, [ws, addLog])

  // 구독/구독해제 처리
  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    if (isSubscribed) {
      addLog('subscribe_attempt', { topic })
      unsubscribe = subscribe(topic, (msg) => {
        // 이미 'message' 이벤트에서 전체를 로깅하므로 여기서는 콘솔에만 기록
        console.log(`[${topic}] 메시지 수신:`, msg)
      })
    }

    return () => {
      if (unsubscribe) {
        addLog('unsubscribe_attempt', { topic })
        unsubscribe()
      }
    }
  }, [isSubscribed, topic, subscribe, addLog])

  // 메시지 발송 핸들러
  const handleSend = async (type: 'publish' | 'publishAck') => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = JSON.parse(message)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      addLog(`send_${type}`, { topic, payload })

      if (type === 'publish') {
        publish(topic, payload)
      } else {
        const ack = await publishAck(topic, payload, 5000)
        addLog('receive_ack', ack)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      addLog('send_error', { error: 'Invalid JSON format', original: message })
      alert('유효한 JSON 형식이 아닙니다.')
    }
  }

  return (
    <div style={{ fontFamily: 'monospace', padding: '16px', display: 'flex', gap: '24px' }}>
      {/* 왼쪽: 컨트롤 패널 */}
      <div style={{ flex: 1 }}>
        <h2>WebSocket Control Panel</h2>
        <div style={{ marginBottom: '16px' }}>
          <strong>Status: </strong>
          <span style={{ color: status === 'open' ? 'green' : 'orange' }}>
            {status.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button onClick={() => ws.connect()}>Connect</button>
          <button onClick={() => ws.disconnect()}>Disconnect</button>
        </div>
        <hr />
        <div>
          <h4>Subscription</h4>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ width: '100%', marginBottom: '8px' }}
          />
          <button onClick={() => setIsSubscribed((s) => !s)}>
            {isSubscribed ? `Unsubscribe from "${topic}"` : `Subscribe to "${topic}"`}
          </button>
        </div>
        <hr />
        <div>
          <h4>Send Message</h4>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            style={{ width: '100%', marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleSend('publish')}>Publish (Fire and Forget)</button>
            <button onClick={() => handleSend('publishAck')}>Publish with ACK</button>
          </div>
        </div>
      </div>

      {/* 오른쪽: 로그 */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h3>All Event Logs (Newest First)</h3>
          <pre
            style={{
              height: '300px',
              overflowY: 'auto',
              border: '1px solid #ccc',
              padding: '8px',
              background: '#f5f5f5',
            }}
          >
            {eventLogs.map((log, i) => (
              <div key={i}>
                <strong>
                  {log.timestamp} [{log.type}]
                </strong>
                : {JSON.stringify(log.data)}
              </div>
            ))}
          </pre>
        </div>
        <div>
          <h3>Received Messages (Newest First)</h3>
          <pre
            style={{
              height: '300px',
              overflowY: 'auto',
              border: '1px solid #ccc',
              padding: '8px',
              background: '#eef',
            }}
          >
            {receivedMessages.map((log, i) => (
              <div key={i}>
                <strong>{log.timestamp}</strong>: {JSON.stringify(log.data)}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  )
}
