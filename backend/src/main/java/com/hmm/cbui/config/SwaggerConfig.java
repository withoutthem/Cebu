package com.hmm.cbui.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {
    @Bean
    public OpenAPI openAPI() {
        Info info = new Info()
                .title("HMM API")
                .version("v1.0")
                .description("Spring Boot API Documentation");
        return new OpenAPI().info(info);
    }
}
