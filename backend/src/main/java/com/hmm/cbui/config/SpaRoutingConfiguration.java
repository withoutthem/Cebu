package com.hmm.cbui.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.reactive.function.server.RequestPredicate;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.ServerResponse;

import static org.springframework.web.reactive.function.server.RequestPredicates.GET;
import static org.springframework.web.reactive.function.server.RequestPredicates.path;
import static org.springframework.web.reactive.function.server.RouterFunctions.resources;
import static org.springframework.web.reactive.function.server.RouterFunctions.route;

@Configuration
public class SpaRoutingConfiguration {

    @Bean
    @Order(Ordered.LOWEST_PRECEDENCE)
    public RouterFunction<ServerResponse> spaRouter() {
        // 정적 리소스 제공
        RouterFunction<ServerResponse> staticResources =
                resources("/**", new ClassPathResource("static/"));

        // SPA Fallback: /api/**, /v3/api-docs/**, /swagger-ui/** 는 '제외'
        RequestPredicate isSpaPage =
                GET("/**")
                        .and(path("/api/**").negate())
                        .and(path("/v3/api-docs/**").negate())
                        .and(path("/swagger-ui/**").negate())
                        .and(path("/swagger-ui.html").negate());

        RouterFunction<ServerResponse> spaFallback =
                route(isSpaPage, req ->
                        ServerResponse.ok().bodyValue(new ClassPathResource("static/index.html"))
                );

        return staticResources.and(spaFallback);
    }
}