package com.hmm.backend.global.websocket.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import lombok.Setter;

/**
 * 클라이언트와 주고받는 STOMP 유사 메시지 프레임.
 * destination을 통해 메시지를 라우팅.
 */
@Getter
@Setter
public class StompFrame {
    private String destination; // 예: "/app/livechat/send", "/app/llm/ask"
    private JsonNode body;      // 실제 내용 (JSON)
}