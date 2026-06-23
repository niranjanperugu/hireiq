package com.hiresmart.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/sourcing")
@RequiredArgsConstructor
@Slf4j
public class SourcingController {

    private final ObjectMapper objectMapper;

    @Value("${rapidapi.key:}")
    private String rapidApiKey;

    @Value("${rapidapi.jsearch.host:jsearch.p.rapidapi.com}")
    private String rapidApiHost;

    // Shared tech skill keyword list for skill inference
    private static final List<String> SKILL_KEYWORDS = List.of(
        "Java", "Python", "JavaScript", "TypeScript", "C#", "C++", "Go", "Rust", "Kotlin",
        "Swift", "Ruby", "PHP", "Scala", "React", "Angular", "Vue", "Next.js", "Node.js",
        "Express", "Django", "Flask", "FastAPI", "Spring Boot", "Spring", "ASP.NET", ".NET",
        "Laravel", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins",
        "GraphQL", "REST API", "Microservices", "Kafka", "RabbitMQ", "Machine Learning",
        "TensorFlow", "PyTorch", "React Native", "Flutter", "Android", "iOS",
        "Git", "Linux", "CI/CD", "Agile", "Scrum", "DevOps", "SQL"
    );

    @PostMapping("/search")
    public ResponseEntity<Map<String, Object>> searchJobs(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new LinkedHashMap<>();

        if (rapidApiKey == null || rapidApiKey.isBlank()) {
            response.put("apiKeyMissing", true);
            response.put("results", List.of());
            return ResponseEntity.ok(response);
        }

        try {
            String jobTitle  = request.getOrDefault("jobTitle", "Software Engineer");
            String keywords  = request.getOrDefault("keywords", "");
            String location  = request.getOrDefault("location", "");
            String remote    = request.getOrDefault("remoteOnly", "false");

            String query = jobTitle + (keywords.isBlank() ? "" : " " + keywords)
                + (location.isBlank() ? "" : " " + location)
                + ("true".equalsIgnoreCase(remote) ? " remote" : "");

            String url = "https://jsearch.p.rapidapi.com/search?query="
                + java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8)
                + "&page=1&num_pages=2&date_posted=all";

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-RapidAPI-Key", rapidApiKey);
            headers.set("X-RapidAPI-Host", rapidApiHost);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<String> apiResponse = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), String.class);

            JsonNode root = objectMapper.readTree(apiResponse.getBody());
            JsonNode data = root.path("data");

            List<Map<String, Object>> results = new ArrayList<>();
            if (data.isArray()) {
                for (JsonNode job : data) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("jobTitle",      getText(job, "job_title"));
                    item.put("employerName",  getText(job, "employer_name"));
                    item.put("jobCity",       getText(job, "job_city"));
                    item.put("jobCountry",    getText(job, "job_country"));
                    item.put("jobApplyLink",  getText(job, "job_apply_link"));
                    item.put("postedAt",      getText(job, "job_posted_at_datetime_utc"));
                    item.put("isRemote",      job.path("job_is_remote").asBoolean(false));
                    String description = getText(job, "job_description");
                    item.put("jobDescription", description.length() > 500
                        ? description.substring(0, 500) + "..." : description);
                    item.put("inferredSkills", inferSkills(description));
                    results.add(item);
                }
            }

            response.put("apiKeyMissing", false);
            response.put("results", results);
            response.put("query", query);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("JSearch API error: {}", e.getMessage());
            response.put("apiKeyMissing", false);
            response.put("results", List.of());
            response.put("error", e.getMessage());
            return ResponseEntity.ok(response);
        }
    }

    private String getText(JsonNode node, String field) {
        JsonNode n = node.path(field);
        return n.isMissingNode() || n.isNull() ? "" : n.asText();
    }

    private List<String> inferSkills(String description) {
        if (description == null || description.isBlank()) return List.of();
        String lower = description.toLowerCase();
        return SKILL_KEYWORDS.stream()
            .filter(skill -> {
                String pattern = "\\b" + Pattern.quote(skill.toLowerCase()) + "\\b";
                return Pattern.compile(pattern).matcher(lower).find();
            })
            .limit(12)
            .collect(Collectors.toList());
    }
}
