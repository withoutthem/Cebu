package com.hmm.cbui.domain.test.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 세션별 서버→클라이언트 전송 채널을 관리합니다.
 * - Router가 세션 시작 시 register(session) 호출
 * - Handler는 emit(sessionId, jsonString)으로 안전 발행
 * - Router 종료 훅에서 remove(sessionId)
 */
@Component
public class SessionOutRegistry {

    private static final int DEFAULT_BUFFER = 512;

    private final Map<String, Sinks.Many<String>> outBySession = new ConcurrentHashMap<>();

    /** 세션 등록: sink 생성 및 반환 */
    public Sinks.Many<String> register(WebSocketSession session) {
        return outBySession.computeIfAbsent(session.getId(),
                id -> Sinks.many().multicast().onBackpressureBuffer(DEFAULT_BUFFER, false));
    }

    /** 세션 전용 outbound Flux */
    public Flux<String> outboundFlux(String sessionId) {
        Sinks.Many<String> sink = outBySession.get(sessionId);
        return sink != null ? sink.asFlux() : Flux.never();
    }

    /** JSON 텍스트를 해당 세션으로 발행 */
    public void emit(String sessionId, String json) {
        Sinks.Many<String> sink = outBySession.get(sessionId);
        if (sink != null) sink.tryEmitNext(json);
    }

    /** 세션 종료/에러 시 정리 */
    public void remove(String sessionId) {
        Sinks.Many<String> sink = outBySession.remove(sessionId);
        if (sink != null) sink.tryEmitComplete();
    }
}