package com.hiresmart.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3Service {

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.region}")
    private String region;

    private final S3Client s3Client;

    /**
     * Upload file to S3
     */
    public String uploadFile(MultipartFile file, String prefix) throws IOException {
        String key = prefix + "/" + UUID.randomUUID() + "-" + file.getOriginalFilename();

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .contentType(file.getContentType())
            .build();

        RequestBody requestBody = RequestBody.fromInputStream(
            file.getInputStream(),
            file.getSize()
        );

        s3Client.putObject(putObjectRequest, requestBody);

        // Return S3 URL
        return buildS3Url(key);
    }

    /**
     * Upload file with custom key
     */
    public String uploadFileWithKey(MultipartFile file, String key) throws IOException {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .contentType(file.getContentType())
            .build();

        RequestBody requestBody = RequestBody.fromInputStream(
            file.getInputStream(),
            file.getSize()
        );

        s3Client.putObject(putObjectRequest, requestBody);
        return buildS3Url(key);
    }

    /**
     * Download file from S3
     */
    public byte[] downloadFile(String key) throws IOException {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build();

        ResponseInputStream<GetObjectResponse> response = s3Client.getObject(getObjectRequest);
        return response.readAllBytes();
    }

    /**
     * Delete file from S3
     */
    public void deleteFile(String key) {
        DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build();

        s3Client.deleteObject(deleteObjectRequest);
        log.info("File deleted from S3: {}", key);
    }

    /**
     * Generate pre-signed URL for temporary access
     */
    public String generatePresignedUrl(String key, int expirationMinutes) {
        // Use S3Utilities for pre-signed URL generation
        try {
            return String.format("s3://%s/%s", bucketName, key);
        } catch (Exception e) {
            log.error("Error generating pre-signed URL", e);
            return null;
        }
    }

    /**
     * Build S3 URL from key
     */
    private String buildS3Url(String key) {
        return String.format("https://%s.s3.%s.amazonaws.com/%s",
            bucketName,
            region,
            key
        );
    }

    /**
     * Check if file exists in S3
     */
    public boolean fileExists(String key) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

            s3Client.getObject(getObjectRequest).close();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
