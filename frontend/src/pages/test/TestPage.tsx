// /src/pages/TestPage.tsx
import { Box, Button, Chip, Paper, TextField, Typography } from '@mui/material'

// --- Type Definitions ---
// 백엔드의 StompFrame.java 와 일치하는 타입 정의
// interface StompFrame {
//   destination: string;
//   body: any;
// }

// 백엔드의 LiveChatMessageDto.java 와 일치하는 타입 정의
// interface LiveChatMessageDto {
//   roomId: string;
//   sender: string;
//   content: string;
//   timestamp: string;
// }

// type WsStatus = 'connecting' | 'open' | 'closing' | 'closed';

const TestPage = () => {
  // --- State Management ---
  // const [status, setStatus] = useState<WsStatus>('closed');
  // const [messages, setMessages] = useState<string[]>([]);
  // const [roomId, setRoomId] = useState('general'); // 기본 채팅방 ID
  // const [sender, setSender] = useState('Victor'); // 기본 발신자 이름
  // const [messageInput, setMessageInput] = useState('');
  // const ws = useRef<WebSocket | null>(null);
  //
  // // --- Helper Functions ---
  // const logMessage = useCallback((msg: string) => {
  //   setMessages((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  // }, []);
  //
  // // --- Message Sending Logic ---
  // const sendJson = useCallback(
  //   (frame: StompFrame) => {
  //     if (status !== 'open' || !ws.current) {
  //       logMessage('⚠️ WebSocket is not connected.');
  //       return;
  //     }
  //     ws.current.send(JSON.stringify(frame));
  //   },
  //   [status, logMessage],
  // );
  //
  // // 구독 메시지 전송
  // const handleSubscribe = useCallback(() => {
  //   const frame: StompFrame = {
  //     destination: '/app/livechat/subscribe',
  //     body: { roomId: roomId },
  //   };
  //   sendJson(frame);
  //   logMessage(`[발신] 구독 요청: ${roomId}`);
  // }, [roomId, sendJson, logMessage]);
  //
  // // --- WebSocket Event Handlers ---
  // const onOpen = useCallback(() => {
  //   setStatus('open');
  //   logMessage('✅ WebSocket Connected.');
  //   // 연결 성공 시 자동으로 구독 메시지 전송
  //   handleSubscribe();
  // }, [handleSubscribe, logMessage]);
  //
  // const onMessage = useCallback(
  //   (event: MessageEvent) => {
  //     try {
  //       const receivedMsg: LiveChatMessageDto = JSON.parse(event.data);
  //       logMessage(`[수신] ${receivedMsg.sender}: ${receivedMsg.content}`);
  //     } catch (error) {
  //       logMessage(`[오류] 잘못된 형식의 메시지 수신: ${event.data}`);
  //     }
  //   },
  //   [logMessage],
  // );
  //
  // const onError = useCallback(
  //   (event: Event) => {
  //     logMessage(`❌ WebSocket Error: ${event.type}`);
  //     setStatus('closed');
  //   },
  //   [logMessage],
  // );
  //
  // const onClose = useCallback(() => {
  //   logMessage('🔌 WebSocket Disconnected.');
  //   setStatus('closed');
  // }, [logMessage]);
  //
  // // --- WebSocket Connection Logic ---
  // const connect = useCallback(() => {
  //   if (ws.current && ws.current.readyState < 2) {
  //     return;
  //   }
  //   setStatus('connecting');
  //   logMessage(`🔌 Connecting to ws://localhost:8080/ws/chat/${roomId}...`);
  //
  //   ws.current = new WebSocket(`ws://localhost:8080/ws/chat/${roomId}`);
  //   ws.current.onopen = onOpen;
  //   ws.current.onmessage = onMessage;
  //   ws.current.onerror = onError;
  //   ws.current.onclose = onClose;
  // }, [roomId, onOpen, onMessage, onError, onClose, logMessage]);
  //
  // const disconnect = () => {
  //   ws.current?.close();
  // };
  //
  // // 채팅 메시지 전송
  // const handleSendMessage = () => {
  //   if (!messageInput.trim()) return;
  //   const messageDto: LiveChatMessageDto = {
  //     roomId: roomId,
  //     sender: sender,
  //     content: messageInput,
  //     timestamp: new Date().toISOString(),
  //   };
  //   const frame: StompFrame = {
  //     destination: '/app/livechat/send',
  //     body: messageDto,
  //   };
  //   sendJson(frame);
  //   logMessage(`[발신] ${sender}: ${messageInput}`);
  //   setMessageInput('');
  // };
  //
  // // --- Effects ---
  // useEffect(() => {
  //   return () => {
  //     ws.current?.close();
  //   };
  // }, []);

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        🚀 HMM 챗봇UI 웹소켓 테스트 페이지입니다.! (아직안됨)
      </Typography>

      {/* --- Connection Control --- */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">1. 연결 관리</Typography>
        <Box display="flex" alignItems="center" gap={2} mt={1}>
          <TextField
            label="Room ID"
            variant="outlined"
            size="small"
            // value={roomId}
            // onChange={(e) => setRoomId(e.target.value)}
            disabled={status === 'open'}
          />
          <Button
            variant="contained"
            // onClick={connect}
            disabled={status === 'connecting' || status === 'open'}
          >
            연결 및 구독
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            // onClick={disconnect}
            disabled={status !== 'open'}
          >
            연결 끊기
          </Button>
          <Chip label={`상태: ${status}`} color={status === 'open' ? 'success' : 'default'} />
        </Box>
      </Paper>

      {/* --- Message Sending --- */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">2. 메시지 발신</Typography>
        <Box display="flex" alignItems="center" gap={2} mt={1}>
          <TextField
            label="Sender"
            variant="outlined"
            size="small"
            // value={sender}
            // onChange={(e) => setSender(e.target.value)}
          />
          <TextField
            label="Message"
            variant="outlined"
            size="small"
            fullWidth
            // value={messageInput}
            // onChange={(e) => setMessageInput(e.target.value)}
          />
          {/*<Button variant="contained" onClick={handleSendMessage} disabled={status !== 'open'}>*/}
          {/*  전송*/}
          {/*</Button>*/}
        </Box>
      </Paper>

      {/* --- Message Log --- */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6">3. 메시지 로그</Typography>
        <Box
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
          }}
        >
          {/*{messages.map((msg, i) => (*/}
          {/*  <div key={i}>{msg}</div>*/}
          {/*))}*/}
        </Box>
      </Paper>
    </Box>
  )
}

export default TestPage
