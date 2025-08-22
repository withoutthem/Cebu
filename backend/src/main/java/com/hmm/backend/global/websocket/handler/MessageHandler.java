package com.hmm.backend.global.websocket.handler;


import com.hmm.backend.global.websocket.dto.StompFrame;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;

/**
 * STOMP 프레임을 처리하는 모든 핸들러가 구현해야 할 인터페이스
 */
public interface MessageHandler {
    /**
     * 이 핸들러가 처리할 수 있는 destination인지 확인합니다.
     * @param destination 메시지의 destination
     * @return 처리 가능 여부
     */
    boolean canHandle(String destination);

    /**
     * 실제 메시지를 처리합니다.
     * @param session WebSocket 세션
     * @param frame STOMP 프레임
     * @return 처리 완료 Mono
     */
    Mono<Void> handle(WebSocketSession session, StompFrame frame);
}