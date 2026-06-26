package com.hiresmart.util;

import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Wraps pre-read file bytes as a MultipartFile so they can be safely
 * passed across thread boundaries (the original stream is not thread-safe).
 */
public record ByteArrayMultipartFile(
        String name,
        String originalFilename,
        String contentType,
        byte[] bytes
) implements MultipartFile {

    @Override public String  getName()             { return name; }
    @Override public String  getOriginalFilename() { return originalFilename; }
    @Override public String  getContentType()      { return contentType; }
    @Override public boolean isEmpty()             { return bytes == null || bytes.length == 0; }
    @Override public long    getSize()             { return bytes == null ? 0 : bytes.length; }
    @Override public byte[]  getBytes()            { return bytes; }

    @Override
    public InputStream getInputStream() {
        return new ByteArrayInputStream(bytes == null ? new byte[0] : bytes);
    }

    @Override
    public void transferTo(File dest) throws IOException {
        try (var out = new FileOutputStream(dest)) {
            out.write(bytes);
        }
    }
}
