package com.hiresmart.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Configuration
public class VirtualThreadConfig {

    @Bean(destroyMethod = "shutdown")
    public ExecutorService resumeAnalysisExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }

    @Bean("interviewRestTemplate")
    public RestTemplate interviewRestTemplate() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(60_000);
        return new RestTemplate(factory);
    }
}
