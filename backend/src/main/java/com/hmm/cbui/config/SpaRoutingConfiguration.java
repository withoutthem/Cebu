package com.hmm.cbui.config; // 실제 패키지명 확인 필요

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.RouterFunctions;
import org.springframework.web.reactive.function.server.ServerResponse;

import static org.springframework.web.reactive.function.server.RequestPredicates.GET;
import static org.springframework.web.reactive.function.server.RouterFunctions.route;

@Configuration
public class SpaRoutingConfiguration {

    @Bean
    public RouterFunction<ServerResponse> spaRouter() {
        RouterFunction<ServerResponse> staticResourceRouter =
                RouterFunctions.resources("/**", new ClassPathResource("static/"));

        RouterFunction<ServerResponse> spaFallbackRouter =
                route(GET("/**"), request -> {
                    String path = request.path();
                    if (path.startsWith("/api/") || path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs")) {
                        return ServerResponse.notFound().build();
                    }
                    return ServerResponse.ok().bodyValue(new ClassPathResource("static/index.html"));
                });

        return staticResourceRouter.and(spaFallbackRouter);
    }
}