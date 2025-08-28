package com.hmm.cbui.aspect;

import com.hmm.cbui.annotation.OnWebSocketMessage;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class WebSocketMessageAspect {

    @Around("@annotation(onWebSocketMessage)")
    public Object handleWebSocketMessage(ProceedingJoinPoint joinPoint, OnWebSocketMessage onWebSocketMessage) throws Throwable {
        // 메시지 경로 확인
        String path = onWebSocketMessage.path();

        // 메시지 로깅 또는 공통 처리
        System.out.println("WebSocket 메시지 수신: " + path);

        // 실제 메서드 실행
        return joinPoint.proceed();
    }
}
