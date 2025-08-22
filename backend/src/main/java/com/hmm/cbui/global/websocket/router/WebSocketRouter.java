package com.hmm.cbui.global.websocket.router;

import com.fasterxml.jackson.databind.ObjectMapper;
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

    // Spring이 MessageHandler 인터페이스를 구현한 모든 Bean을 자동으로 주입해줍니다.
    public WebSocketRouter(List<MessageHandler> handlers, ObjectMapper objectMapper) {
        this.handlers = handlers;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        // 클라이언트로부터 메시지를 수신하는 부분만 처리합니다.
        // 각 핸들러가 메시지를 보내는 로직을 담당하므로, 여기서는 output 스트림이 없습니다.
        return session.receive()
                .flatMap(message -> {
                    try {
                        String payload = message.getPayloadAsText();
                        StompFrame frame = objectMapper.readValue(payload, StompFrame.class);
                        String destination = frame.getDestination();

                        // 처리할 수 있는 핸들러를 찾습니다.
                        return findHandler(destination)
                                .flatMap(handler -> handler.handle(session, frame))
                                .doOnError(e -> log.error("메시지 처리 중 오류 발생: destination={}", destination, e));

                    } catch (Exception e) {
                        log.error("잘못된 형식의 메시지 수신: {}", message.getPayloadAsText(), e);
                        return Mono.empty();
                    }
                })
                .then();
    }

    private Mono<MessageHandler> findHandler(String destination) {
        return Flux.fromIterable(handlers)
                .filter(h -> h.canHandle(destination))
                .next() // 첫 번째로 매칭되는 핸들러를 선택
                .switchIfEmpty(Mono.error(new IllegalArgumentException("처리할 수 없는 destination 입니다: " + destination)));
    }
}