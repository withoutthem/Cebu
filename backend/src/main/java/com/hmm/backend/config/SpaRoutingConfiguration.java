package com.hmm.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerResponse;

import static org.springframework.web.reactive.function.server.RequestPredicates.GET;
import static org.springframework.web.reactive.function.server.RouterFunctions.route;
import static org.springframework.web.reactive.function.server.ServerResponse.ok;


@Configuration
public class SpaRoutingConfiguration {

    @Bean
    public RouterFunction<ServerResponse> spaRouter() {
        return route(
                GET("/**"), // 모든 GET 요청에 대해
                request -> {
                    // API 경로 등 특정 경로는 제외
                    if (request.path().startsWith("/api/")) {
                        return ServerResponse.notFound().build();
                    }
                    // 그 외 모든 요청은 index.html로
                    return ok().bodyValue(new ClassPathResource("static/index.html"));
                }
        );
    }
}
