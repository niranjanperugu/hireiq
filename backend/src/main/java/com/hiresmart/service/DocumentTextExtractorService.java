package com.hiresmart.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Service
@Slf4j
public class DocumentTextExtractorService {

    public String extractText(MultipartFile file) {
        String name = file.getOriginalFilename() != null
            ? file.getOriginalFilename().toLowerCase() : "";

        try {
            String text;
            if (name.endsWith(".pdf")) {
                text = extractFromPdf(file);
            } else if (name.endsWith(".docx")) {
                text = extractFromDocx(file);
            } else if (name.endsWith(".doc")) {
                text = extractFromDoc(file);
            } else {
                // Plain text — safe to read as UTF-8
                text = new String(file.getBytes(), StandardCharsets.UTF_8);
            }
            return sanitize(text);
        } catch (Exception e) {
            log.warn("Text extraction failed for {}: {}", name, e.getMessage());
            // For binary formats we must NOT fall back to raw bytes — they contain null bytes
            // that Postgres rejects and garbled content that confuses the AI.
            return "";
        }
    }

    private String sanitize(String text) {
        if (text == null) return "";
        // Remove null bytes and other control chars Postgres can't store in UTF-8
        return text.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]", " ").trim();
    }

    private String extractFromPdf(MultipartFile file) throws IOException {
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(doc);
        }
    }

    private String extractFromDocx(MultipartFile file) throws IOException {
        try (XWPFDocument doc = new XWPFDocument(file.getInputStream());
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        }
    }

    private String extractFromDoc(MultipartFile file) throws IOException {
        try (HWPFDocument doc = new HWPFDocument(file.getInputStream());
             WordExtractor extractor = new WordExtractor(doc)) {
            return extractor.getText();
        }
    }
}
