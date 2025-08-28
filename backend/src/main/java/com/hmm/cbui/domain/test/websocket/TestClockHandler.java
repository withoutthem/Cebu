package com.hmm.cbui.domain.test.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hmm.cbui.global.websocket.dto.StompFrame;
import com.hmm.cbui.global.websocket.handler.MessageHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;

/**
 * destination: "/test/clock/start"
 * - 요청 수신 시 3초 간격으로 5회 tick 메시지 푸시
 */
@Component
public class TestClockHandler implements MessageHandler {

    private final SessionOutRegistry out;
    private final ObjectMapper om;

    public TestClockHandler(SessionOutRegistry out, ObjectMapper om) {
        this.out = out;
        this.om = om;
    }

    @Override
    public boolean canHandle(String destination) {
        return "/test/clock/start".equals(destination);
    }

    @Override
    public Mono<Void> handle(WebSocketSession session, StompFrame frame) {
        String sessionId = session.getId();
        // 3초마다 5회 전송
        return Flux.interval(Duration.ofSeconds(3))
                .take(5)
                .doOnNext(i -> {
                    ObjectNode node = om.createObjectNode();
                    node.put("type", "tick");
                    node.put("seq", i.intValue() + 1);
                    node.put("message", "server push");
                    // 아웃바운드로 emit
                    out.emit(sessionId, node.toString());
                })
                .then();
    }
}