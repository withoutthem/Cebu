package com.hmm.cbui.domain.livechat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hmm.cbui.domain.livechat.dto.LiveChatMessageDto;
import com.hmm.cbui.global.websocket.dto.StompFrame;
import com.hmm.cbui.global.websocket.handler.MessageHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveChatService implements MessageHandler {

    private final Map<String, Sinks.Many<LiveChatMessageDto>> chatRoomSinks = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    @Override
    public boolean canHandle(String destination) {
        // "/app/livechat/"으로 시작하는 모든 요청을 처리합니다.
        return destination != null && destination.startsWith("/app/livechat/");
    }

    @Override
    public Mono<Void> handle(WebSocketSession session, StompFrame frame) {
        String destination = frame.getDestination();

        if (destination.endsWith("/send")) {
            // 메시지 발행 처리
            LiveChatMessageDto message = objectMapper.convertValue(frame.getBody(), LiveChatMessageDto.class);
            publish(message.getRoomId(), message);
        } else if (destination.endsWith("/subscribe")) {
            // 구독 처리
            String roomId = objectMapper.convertValue(frame.getBody().get("roomId"), String.class);
            return subscribe(session, roomId);
        }
        return Mono.empty();
    }

    // 클라이언트가 특정 방을 구독할 때 호출되는 로직
    private Mono<Void> subscribe(WebSocketSession session, String roomId) {
        return session.send(
                getSink(roomId).asFlux()
                        .flatMap(message -> {
                            try {
                                String json = objectMapper.writeValueAsString(message);
                                return Mono.just(session.textMessage(json));
                            } catch (Exception e) {
                                log.error("메시지 직렬화 오류", e);
                                return Mono.empty();
                            }
                        })
        );
    }

    // 메시지 발행
    public void publish(String roomId, LiveChatMessageDto message) {
        getSink(roomId).tryEmitNext(message);
    }

    // Sink를 가져오거나 생성하는 헬퍼 메소드
    private Sinks.Many<LiveChatMessageDto> getSink(String roomId) {
        return chatRoomSinks.computeIfAbsent(roomId, key ->
                Sinks.many().multicast().onBackpressureBuffer()
        );
    }
}
