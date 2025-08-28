package com.hmm.cbui.domain.test.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.hmm.cbui.global.websocket.dto.StompFrame;
import com.hmm.cbui.global.websocket.handler.MessageHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Mono;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 간단한 in-memory pub/sub 브로커
 * destination:
 *  - "/test/bus/subscribe"  : body = { "topic": "chat:general" }
 *  - "/test/bus/unsubscribe": body = { "topic": "chat:general" }
 *  - "/test/bus/publish"    : body = { "topic": "chat:general", "data": {...} }
 */
@Component
public class TestBusHandler implements MessageHandler {

    private final SessionOutRegistry out;
    private final ObjectMapper om;

    // topic -> sessionId 집합
    private final Map<String, Set<String>> subs = new ConcurrentHashMap<>();

    public TestBusHandler(SessionOutRegistry out, ObjectMapper om) {
        this.out = out;
        this.om = om;
    }

    @Override
    public boolean canHandle(String destination) {
        return destination != null && destination.startsWith("/test/bus/");
    }

    @Override
    public Mono<Void> handle(WebSocketSession session, StompFrame frame) {
        final String dest = frame.getDestination();
        final JsonNode body = frame.getBody();
        final String sessionId = session.getId();

        switch (dest) {
            case "/test/bus/subscribe": {
                String topic = required(body);
                subs.computeIfAbsent(topic, t -> ConcurrentHashMap.newKeySet()).add(sessionId);
                emitOk(sessionId, "subscribed", topic);
                return Mono.empty();
            }
            case "/test/bus/unsubscribe": {
                String topic = required(body);
                Optional.ofNullable(subs.get(topic)).ifPresent(set -> set.remove(sessionId));
                emitOk(sessionId, "unsubscribed", topic);
                return Mono.empty();
            }
            case "/test/bus/publish": {
                String topic = required(body);
                JsonNode data = body.get("data");
                broadcast(topic, data);
                emitOk(sessionId, "publish-ack", topic); // 발행자 ACK
                return Mono.empty();
            }
            default:
                emitError(sessionId, "unsupported destination: " + dest);
                return Mono.empty();
        }
    }

    private String required(JsonNode node) {
        if (node == null || !node.hasNonNull("topic")) {
            throw new IllegalArgumentException("missing field: " + "topic");
        }
        return node.get("topic").asText();
    }

    private void broadcast(String topic, JsonNode data) {
        ObjectNode msg = om.createObjectNode();
        msg.put("topic", topic);
        msg.set("data", data == null ? om.createObjectNode() : data);

        Set<String> targets = subs.getOrDefault(topic, Collections.emptySet());
        String payload = msg.toString();
        for (String sid : targets) {
            out.emit(sid, payload);
        }
    }

    private void emitOk(String sessionId, String label, String topic) {
        ObjectNode n = om.createObjectNode();
        n.put("type", label);
        if (topic != null) n.put("topic", topic);
        n.put("ok", true);
        out.emit(sessionId, n.toString());
    }

    private void emitError(String sessionId, String message) {
        ObjectNode n = om.createObjectNode();
        n.put("type", "unsupported");
        n.put("ok", false);
        n.put("error", message);
        out.emit(sessionId, n.toString());
    }
}