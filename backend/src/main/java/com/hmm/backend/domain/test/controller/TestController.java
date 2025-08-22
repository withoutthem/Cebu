package com.hmm.backend.domain.test.controller;

import com.hmm.backend.domain.livechat.dto.LiveChatMessageDto;
import com.hmm.backend.domain.livechat.service.LiveChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController {

    private final LiveChatService liveChatService; // 주입 대상을 LiveChatService로 변경

    @GetMapping
    public Mono<ResponseEntity<String>> testRestApi() {
        return Mono.just(ResponseEntity.ok("HTTP REST API is working!"));
    }

    @PostMapping("/broadcast/{roomId}")
    public Mono<ResponseEntity<Void>> testWebSocketBroadcast(
            @PathVariable String roomId,
            @RequestBody LiveChatMessageDto message) {
        // LiveChatService의 publish 메소드를 호출
        liveChatService.publish(roomId, message);
        return Mono.just(ResponseEntity.ok().build());
    }
}