package com.hmm.backend.config;

import com.hmm.backend.util.AES128Util;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AESConfig {
    @Value("${aes.key}")
    private String aesKey;

    @Bean
    public AES128Util aes128Util() {
        return new AES128Util(aesKey);
    }

}
