package com.hiresmart.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.ses.SesClient;

@Configuration
public class AwsConfig {

    @Value("${aws.region:us-east-1}")
    private String region;

    @Value("${AWS_ACCESS_KEY_ID:}")
    private String accessKeyId;

    @Value("${AWS_SECRET_ACCESS_KEY:}")
    private String secretAccessKey;

    private software.amazon.awssdk.auth.credentials.AwsCredentialsProvider credentialsProvider() {
        if (accessKeyId != null && !accessKeyId.isBlank() &&
            secretAccessKey != null && !secretAccessKey.isBlank()) {
            return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId, secretAccessKey));
        }
        return DefaultCredentialsProvider.create();
    }

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(credentialsProvider())
            .build();
    }

    @Bean
    public SesClient sesClient() {
        return SesClient.builder()
            .region(Region.of(region))
            .credentialsProvider(credentialsProvider())
            .build();
    }
}
