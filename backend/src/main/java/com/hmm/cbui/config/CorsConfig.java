// src/main/java/com/hmm/cbui/config/CorsConfig.java
package com.hmm.cbui.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration cfg = new CorsConfiguration();

        // 개발용: 프론트 오리진
        cfg.addAllowedOriginPattern("http://localhost:5173");

        cfg.addAllowedHeader("*");      // 모든 헤더 허용
        cfg.addAllowedMethod("*");      // GET, POST, PUT, DELETE, OPTIONS 등
        cfg.setAllowCredentials(false); // 쿠키/인증정보 안 쓰면 false가 단순함
        cfg.setMaxAge(3600L);           // preflight 캐시(초)

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // API 경로 전체 허용
        source.registerCorsConfiguration("/api/**", cfg);
        // swagger도 보려면 필요시 추가:
        source.registerCorsConfiguration("/v3/api-docs/**", cfg);
        source.registerCorsConfiguration("/swagger-ui/**", cfg);
        source.registerCorsConfiguration("/swagger-ui.html", cfg);

        return new CorsWebFilter(source);
    }
}