package com.hmm.backend.config;

import com.hmm.backend.global.websocket.router.WebSocketRouter; // 👈 Import 변경
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;

import java.util.Map;

@Configuration
@RequiredArgsConstructor
public class WebSocketConfig {

    private final WebSocketRouter webSocketRouter; // 👈 주입 대상 변경

    @Bean
    public HandlerMapping webSocketHandlerMapping() {
        // 이제 모든 WebSocket 요청은 WebSocketRouter가 담당합니다.
        Map<String, Object> map = Map.of(
                "/ws/**", webSocketRouter // 👈 핸들러 변경
        );
        return new SimpleUrlHandlerMapping(map, -1);
    }

    @Bean
    public WebSocketHandlerAdapter handlerAdapter() {
        return new WebSocketHandlerAdapter();
    }
}