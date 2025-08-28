package com.hmm.cbui.global.websocket.router;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hmm.cbui.domain.test.websocket.SessionOutRegistry;
import com.hmm.cbui.global.websocket.dto.StompFrame;
import com.hmm.cbui.global.websocket.handler.MessageHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;

@Slf4j
@Component
public class WebSocketRouter implements WebSocketHandler {

    private final List<MessageHandler> handlers;
    private final ObjectMapper objectMapper;
    private final SessionOutRegistry outRegistry; // ✅ 추가

    public WebSocketRouter(
            List<MessageHandler> handlers,
            ObjectMapper objectMapper,
            SessionOutRegistry outRegistry // ✅ 추가
    ) {
        this.handlers = handlers;
        this.objectMapper = objectMapper;
        this.outRegistry = outRegistry;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        // ✅ 세션 시작 시 아웃바운드 sink 등록
        outRegistry.register(session);

        // 1) 서버→클라 전송 파이프(세션 당 단일 send)
        Mono<Void> send = session
                .send(outRegistry
                        .outboundFlux(session.getId())
                        .map(session::textMessage))
                .doFinally(s -> outRegistry.remove(session.getId())); // 정리

        // 2) 클라→서버 수신 처리 (기존과 동일하나, 핸들러는 emit만 수행)
        Mono<Void> receive = session
                .receive()
                .flatMap(message -> {
                    try {
                        String payload = message.getPayloadAsText();
                        StompFrame frame = objectMapper.readValue(payload, StompFrame.class);
                        String destination = frame.getDestination();

                        return findHandler(destination)
                                .flatMap(handler -> handler.handle(session, frame))
                                .doOnError(e -> log.error("메시지 처리 중 오류: destination={}", destination, e));

                    } catch (Exception e) {
                        log.error("잘못된 메시지: {}", message.getPayloadAsText(), e);
                        return Mono.empty();
                    }
                })
                .then();

        // 3) 양방향 결합
        return Mono.when(send, receive);
    }

    private Mono<MessageHandler> findHandler(String destination) {
        return Flux.fromIterable(handlers)
                .filter(h -> h.canHandle(destination))
                .next()
                .switchIfEmpty(Mono.error(new IllegalArgumentException("처리 불가 destination: " + destination)));
    }
}