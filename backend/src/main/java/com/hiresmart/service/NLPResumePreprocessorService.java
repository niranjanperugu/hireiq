package com.hiresmart.service;

import edu.stanford.nlp.ling.CoreLabel;
import edu.stanford.nlp.pipeline.CoreDocument;
import edu.stanford.nlp.pipeline.CoreSentence;
import edu.stanford.nlp.pipeline.StanfordCoreNLP;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Year;
import java.util.*;
import java.util.regex.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class NLPResumePreprocessorService {

    private StanfordCoreNLP pipeline;

    // ─── Resume section header keywords ───────────────────────────────────────
    private static final Set<String> EXPERIENCE_HEADERS = Set.of(
        "EXPERIENCE", "WORK EXPERIENCE", "PROFESSIONAL EXPERIENCE", "EMPLOYMENT HISTORY",
        "WORK HISTORY", "CAREER HISTORY", "PROFESSIONAL BACKGROUND", "EMPLOYMENT",
        "PROFESSIONAL SUMMARY", "CAREER SUMMARY"
    );
    private static final Set<String> EDUCATION_HEADERS = Set.of(
        "EDUCATION", "ACADEMIC BACKGROUND", "QUALIFICATIONS", "ACADEMIC QUALIFICATIONS",
        "EDUCATIONAL BACKGROUND", "ACADEMIC", "DEGREES"
    );
    private static final Set<String> SKILLS_HEADERS = Set.of(
        "SKILLS", "TECHNICAL SKILLS", "CORE COMPETENCIES", "KEY SKILLS",
        "TECHNOLOGIES", "TECH STACK", "TOOLS & TECHNOLOGIES", "COMPETENCIES",
        "EXPERTISE", "TECHNICAL EXPERTISE", "PROGRAMMING SKILLS"
    );

    // ─── Comprehensive skills gazetteer ───────────────────────────────────────
    private static final List<String> SKILLS_GAZETTEER = List.of(
        // Languages
        "Java", "Python", "JavaScript", "TypeScript", "C#", "C++", "C", "Go", "Rust",
        "Kotlin", "Swift", "Ruby", "PHP", "Scala", "R", "MATLAB", "Perl", "Dart",
        "Groovy", "F#", "Elixir", "Haskell", "Lua", "VB.NET", "COBOL", "Assembly",
        // Web Frameworks
        "Spring Boot", "Spring", "Spring MVC", "Spring Security", "Spring Cloud",
        "React", "React.js", "Angular", "Vue.js", "Vue", "Next.js", "Nuxt.js",
        "Node.js", "Express.js", "Express", "Django", "Flask", "FastAPI",
        "ASP.NET", ".NET Core", ".NET", "Laravel", "Ruby on Rails", "Rails",
        "Struts", "Hibernate", "JPA", "JSF", "Vaadin",
        // Databases
        "PostgreSQL", "MySQL", "Oracle", "SQL Server", "MongoDB", "Redis",
        "Elasticsearch", "Cassandra", "DynamoDB", "SQLite", "MariaDB",
        "Neo4j", "CouchDB", "InfluxDB", "HBase", "Snowflake", "BigQuery",
        // Cloud
        "AWS", "Azure", "GCP", "Google Cloud", "Amazon Web Services",
        "EC2", "S3", "Lambda", "EKS", "ECS", "RDS", "CloudFormation",
        "Azure DevOps", "Azure Functions",
        // DevOps & Infra
        "Docker", "Kubernetes", "Terraform", "Ansible", "Helm", "Jenkins",
        "GitLab CI", "GitHub Actions", "CircleCI", "Travis CI", "ArgoCD",
        "Prometheus", "Grafana", "Datadog", "ELK Stack", "Splunk",
        // Messaging & Streaming
        "Kafka", "Apache Kafka", "RabbitMQ", "ActiveMQ", "SQS", "Pub/Sub",
        "NATS", "gRPC", "WebSocket", "SignalR",
        // API & Architecture
        "REST API", "RESTful", "GraphQL", "Microservices", "SOA",
        "Event-Driven", "CQRS", "Domain-Driven Design", "DDD",
        "API Gateway", "Service Mesh", "Istio",
        // Testing
        "JUnit", "Mockito", "TestNG", "Selenium", "Cypress", "Jest",
        "Pytest", "NUnit", "xUnit", "Postman", "SoapUI",
        // Mobile
        "Android", "iOS", "React Native", "Flutter", "Xamarin",
        // Data & ML
        "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
        "Scikit-learn", "Pandas", "NumPy", "Spark", "Hadoop", "Hive",
        "Airflow", "dbt", "Tableau", "Power BI",
        // Other Tools
        "Git", "Maven", "Gradle", "npm", "Webpack", "Vite",
        "Linux", "Unix", "Bash", "PowerShell", "CI/CD", "Agile", "Scrum",
        "JIRA", "Confluence", "Bitbucket", "GitHub"
    );

    // ─── Date patterns ─────────────────────────────────────────────────────────
    private static final Pattern DATE_RANGE_PATTERN = Pattern.compile(
        "(?:(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|" +
        "Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)" +
        "[\\s,]*)?(\\d{4})\\s*[-–—~to]+\\s*" +
        "(?:(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|" +
        "Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)" +
        "[\\s,]*)?(\\d{4}|[Pp]resent|[Cc]urrent|[Nn]ow|[Tt]ill\\s*[Dd]ate)",
        Pattern.CASE_INSENSITIVE
    );

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PHONE_PATTERN = Pattern.compile(
        "(?:\\+?1[\\s.\\-]?)?\\(?\\d{3}\\)?[\\s.\\-]\\d{3}[\\s.\\-]\\d{4}" + // US: (555) 123-4567
        "|\\+\\d{1,3}[\\s.\\-]\\d{2,5}[\\s.\\-]\\d{4,6}(?:[\\s.\\-]\\d{1,4})?" // International: +44 20 7946 0958
    );
    // Proper name: 2–4 words, each starting with capital, only letters/dots/hyphens
    private static final Pattern NAME_LINE_PATTERN =
        Pattern.compile("^[A-Z][a-zA-Z'-]+(?: [A-Z][a-zA-Z'-]+){1,3}$");

    // Words that can never be part of a person's name at word-boundary level
    private static final Set<String> NON_NAME_WORDS = Set.of(
        "SUMMARY", "PROFILE", "OBJECTIVE", "OVERVIEW", "RESUME", "CV",
        "CURRICULUM", "VITAE", "PROJECT", "PROJECTS", "EXPERIENCE", "WORK",
        "EDUCATION", "SKILLS", "TECHNICAL", "PROFESSIONAL", "CAREER",
        "CONTACT", "INTRODUCTION", "EXPERTISE", "PROVEN", "LEAD", "SENIOR",
        "JUNIOR", "DEVELOPER", "ENGINEER", "MANAGER", "ARCHITECT", "ANALYST",
        "CONSULTANT", "SPECIALIST", "COORDINATOR", "DIRECTOR", "EXECUTIVE",
        "ACHIEVEMENTS", "CERTIFICATIONS", "REFERENCES", "ABOUT", "JAVA",
        "PYTHON", "SOFTWARE", "FULL", "STACK", "BACKEND", "FRONTEND"
    );

    // ─── Init ──────────────────────────────────────────────────────────────────

    @PostConstruct
    public void init() {
        try {
            Properties props = new Properties();
            // Only tokenize + sentence-split — these are rule-based and need NO model files
            props.setProperty("annotators", "tokenize,ssplit");
            props.setProperty("tokenize.language", "en");
            this.pipeline = new StanfordCoreNLP(props);
            log.info("Stanford CoreNLP tokenize+ssplit pipeline ready");
        } catch (Exception e) {
            log.warn("CoreNLP pipeline init failed (will use line-based fallback): {}", e.getMessage());
        }
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    public NLPExtractedData extract(String text) {
        if (text == null || text.isBlank()) {
            return emptyData();
        }

        List<String> sentences = tokenizeIntoSentences(text);
        Map<String, List<String>> sections = segmentSections(sentences);

        String email = extractEmail(text);
        String phone = extractPhone(text);
        String name = extractName(text, sections);
        String education = extractEducation(sections, text);
        String currentRole = extractCurrentRole(sections);
        List<String> skills = extractSkills(text, sections);
        List<NLPExtractedData.WorkEntry> workHistory = extractWorkHistory(sections, text);
        int totalExp = computeTotalExperience(workHistory, text);

        String structuredContext = buildStructuredContext(name, email, phone, currentRole,
            totalExp, education, skills, workHistory);

        return NLPExtractedData.builder()
            .candidateName(name)
            .email(email)
            .phone(phone)
            .currentRole(currentRole)
            .yearsOfExperience(totalExp)
            .education(education)
            .extractedSkills(skills)
            .workHistory(workHistory)
            .structuredContext(structuredContext)
            .build();
    }

    // ─── Sentence tokenization ─────────────────────────────────────────────────

    private List<String> tokenizeIntoSentences(String text) {
        if (pipeline != null) {
            try {
                CoreDocument doc = new CoreDocument(text);
                pipeline.annotate(doc);
                return doc.sentences().stream()
                    .map(CoreSentence::text)
                    .collect(Collectors.toList());
            } catch (Exception e) {
                log.debug("CoreNLP sentence split failed, using line fallback");
            }
        }
        return Arrays.stream(text.split("[\\n\\r]+"))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());
    }

    // ─── Section segmentation ──────────────────────────────────────────────────

    private Map<String, List<String>> segmentSections(List<String> lines) {
        Map<String, List<String>> sections = new LinkedHashMap<>();
        String currentSection = "CONTACT";
        sections.put(currentSection, new ArrayList<>());

        for (String line : lines) {
            String upper = line.trim().toUpperCase().replaceAll("[^A-Z &/]", "").trim();
            if (isSection(upper, EXPERIENCE_HEADERS)) {
                currentSection = "EXPERIENCE";
            } else if (isSection(upper, EDUCATION_HEADERS)) {
                currentSection = "EDUCATION";
            } else if (isSection(upper, SKILLS_HEADERS)) {
                currentSection = "SKILLS";
            } else if (upper.matches("(?:SUMMARY|OBJECTIVE|PROFILE|ABOUT ME)")) {
                currentSection = "SUMMARY";
            } else if (upper.matches("(?:CERTIFICATIONS?|CERTIFICATES?|ACHIEVEMENTS?|PROJECTS?|AWARDS?)")) {
                currentSection = "OTHER";
            }
            sections.computeIfAbsent(currentSection, k -> new ArrayList<>()).add(line.trim());
        }
        return sections;
    }

    private boolean isSection(String upper, Set<String> headers) {
        return headers.contains(upper) ||
            headers.stream().anyMatch(h -> upper.startsWith(h) && upper.length() < h.length() + 5);
    }

    // ─── Entity extractors ─────────────────────────────────────────────────────

    private String extractName(String fullText, Map<String, List<String>> sections) {
        // Try CONTACT section first (highest precision)
        List<String> contactLines = sections.getOrDefault("CONTACT", List.of());
        for (String line : contactLines) {
            String cleaned = line.trim();
            if (cleaned.isEmpty() || cleaned.contains("@") || cleaned.matches(".*\\d.*")
                    || cleaned.contains(".") || cleaned.contains(",")) continue;
            if (containsNonNameWord(cleaned)) continue;
            // 2–4 word proper name
            if (NAME_LINE_PATTERN.matcher(cleaned).matches()) {
                return cleaned.equals(cleaned.toUpperCase()) ? toTitleCase(cleaned) : cleaned;
            }
            // Single capitalised word that is not a keyword (e.g. "Swathi")
            if (!cleaned.contains(" ") && cleaned.matches("[A-Z][a-zA-Z'-]{1,20}")) {
                return cleaned; // don't return immediately; keep searching for a full name
            }
        }

        // Single-word candidate from CONTACT (only if no multi-word found above)
        for (String line : contactLines) {
            String cleaned = line.trim();
            if (cleaned.isEmpty() || cleaned.contains("@") || cleaned.matches(".*\\d.*")
                    || cleaned.contains(".") || cleaned.contains(",")) continue;
            if (!cleaned.contains(" ") && cleaned.matches("[A-Z][a-zA-Z'-]{1,20}")
                    && !containsNonNameWord(cleaned)) {
                return cleaned;
            }
        }

        // Fallback: scan first 25 lines of the full text only
        String[] lines = fullText.split("[\\n\\r]+");
        int limit = Math.min(lines.length, 25);
        for (int i = 0; i < limit; i++) {
            String t = lines[i].trim();
            if (t.isEmpty() || t.contains("@") || t.length() > 50 || t.length() < 3) continue;
            if (t.contains(".") || t.contains(",")) continue;
            if (containsNonNameWord(t)) continue;
            if (NAME_LINE_PATTERN.matcher(t).matches()) {
                return t.equals(t.toUpperCase()) ? toTitleCase(t) : t;
            }
            // ALL_CAPS multi-word (e.g. "NIRANJAN BABU PERUGU")
            if (t.equals(t.toUpperCase()) && t.matches("[A-Z]+(?: [A-Z]+){1,3}") && t.split(" ").length >= 2)
                return toTitleCase(t);
        }
        return null;
    }

    private boolean containsNonNameWord(String line) {
        for (String word : line.toUpperCase().split("[^A-Z]+")) {
            if (word.length() > 2 && NON_NAME_WORDS.contains(word)) return true;
        }
        return false;
    }

    private String toTitleCase(String allCaps) {
        String[] parts = allCaps.split(" ");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty()) {
                if (sb.length() > 0) sb.append(' ');
                sb.append(p.charAt(0)).append(p.substring(1).toLowerCase());
            }
        }
        return sb.toString();
    }

    /** Extract a likely name from the resume filename (e.g. "Niranjan_Babu_Resume.docx" → "Niranjan Babu") */
    public String nameFromFilename(String filename) {
        if (filename == null || filename.isBlank()) return null;
        String base = filename.replaceAll("\\.[^.]+$", ""); // strip extension
        String[] parts = base.split("[_\\s-]+");
        List<String> nameParts = new ArrayList<>();
        for (String p : parts) {
            // Stop on empty, non-letter start (e.g. ".Net"), or digits
            if (p.isEmpty() || !Character.isLetter(p.charAt(0)) || p.matches(".*\\d.*")) break;
            String upper = p.toUpperCase().replaceAll("[^A-Z]", "");
            if (upper.isEmpty() || NON_NAME_WORDS.contains(upper)) break;
            nameParts.add(p.substring(0, 1).toUpperCase() + p.substring(1).toLowerCase());
            if (nameParts.size() >= 3) break;
        }
        // Accept single-word names (e.g. "Swathi") as well as multi-word
        return !nameParts.isEmpty() ? String.join(" ", nameParts) : null;
    }

    private String extractEmail(String text) {
        Matcher m = EMAIL_PATTERN.matcher(text);
        return m.find() ? m.group() : null;
    }

    private String extractPhone(String text) {
        Matcher m = PHONE_PATTERN.matcher(text);
        return m.find() ? m.group().trim() : null;
    }

    private String extractCurrentRole(Map<String, List<String>> sections) {
        List<String> expLines = sections.getOrDefault("EXPERIENCE", List.of());
        for (String line : expLines) {
            String t = line.trim();
            // Skip header lines, date lines, and very short lines
            if (t.length() < 4 || t.toUpperCase().equals(t) || DATE_RANGE_PATTERN.matcher(t).find()) continue;
            if (EXPERIENCE_HEADERS.contains(t.toUpperCase())) continue;
            // Likely a job title if it's Title Case and not too long
            if (t.matches("[A-Z][A-Za-z /()+.,-]{3,60}") && !t.contains("@")) {
                return t;
            }
        }
        List<String> summaryLines = sections.getOrDefault("SUMMARY", List.of());
        if (!summaryLines.isEmpty()) {
            return summaryLines.stream()
                .filter(l -> !l.toUpperCase().equals(l) && l.length() > 5)
                .findFirst().orElse(null);
        }
        return null;
    }

    private String extractEducation(Map<String, List<String>> sections, String fullText) {
        String combined = String.join(" ",
            sections.getOrDefault("EDUCATION", List.of())) + " " + fullText;
        String lower = combined.toLowerCase();
        if (lower.contains("phd") || lower.contains("ph.d") || lower.contains("doctorate")) return "PhD";
        if (lower.contains("master") || lower.contains("m.s") || lower.contains("m.e")
            || lower.contains("mba") || lower.contains("m.tech")) return "Master's";
        if (lower.contains("bachelor") || lower.contains("b.s") || lower.contains("b.e")
            || lower.contains("b.tech") || lower.contains("b.sc") || lower.contains("b.a")
            || lower.contains("be ") || lower.contains("btech")) return "Bachelor's";
        if (lower.contains("diploma") || lower.contains("associate")) return "Diploma";
        return null;
    }

    private List<String> extractSkills(String fullText, Map<String, List<String>> sections) {
        String lowerText = fullText.toLowerCase();
        String skillsSection = String.join(" ", sections.getOrDefault("SKILLS", List.of())).toLowerCase();

        return SKILLS_GAZETTEER.stream()
            .filter(skill -> {
                String lowerSkill = skill.toLowerCase();
                // Check full text and skills section (skills section gets double priority)
                return lowerText.contains(lowerSkill) || skillsSection.contains(lowerSkill);
            })
            .distinct()
            .collect(Collectors.toList());
    }

    // ─── Work history & experience ─────────────────────────────────────────────

    private List<NLPExtractedData.WorkEntry> extractWorkHistory(
            Map<String, List<String>> sections, String fullText) {

        List<NLPExtractedData.WorkEntry> entries = new ArrayList<>();
        // Only use EXPERIENCE section — falling back to fullText picks up education dates
        String expText = String.join("\n", sections.getOrDefault("EXPERIENCE", List.of()));
        if (expText.isBlank()) return entries; // let Claude handle it from full text

        String[] lines = expText.split("[\\n\\r]+");
        for (int i = 0; i < lines.length; i++) {
            Matcher m = DATE_RANGE_PATTERN.matcher(lines[i]);
            if (m.find()) {
                int[] range = extractYearRange(m);
                if (range == null) continue;

                String title = null, company = null;
                if (i > 0) {
                    String prev = lines[i - 1].trim();
                    if (!prev.isEmpty() && !DATE_RANGE_PATTERN.matcher(prev).find()) title = prev;
                }
                if (i + 1 < lines.length) {
                    String next = lines[i + 1].trim();
                    if (!next.isEmpty() && !DATE_RANGE_PATTERN.matcher(next).find()) {
                        if (title != null) company = next;
                        else title = next;
                    }
                }

                int duration = Math.max(1, range[1] - range[0]); // at least 1 year for same-year roles
                entries.add(new NLPExtractedData.WorkEntry(title, company, m.group(), duration));
            }
        }
        return entries;
    }

    private int computeTotalExperience(List<NLPExtractedData.WorkEntry> workHistory, String text) {
        // Prefer explicit "X years of experience" statements — candidates state this correctly
        Matcher explicit = Pattern.compile(
            "(\\d{1,2})\\s*\\+?\\s*years?\\s*(?:of\\s+)?(?:IT\\s+|work\\s+|professional\\s+|total\\s+|industry\\s+)?experience",
            Pattern.CASE_INSENSITIVE).matcher(text);
        int maxExplicit = 0;
        while (explicit.find()) {
            try { maxExplicit = Math.max(maxExplicit, Integer.parseInt(explicit.group(1))); }
            catch (NumberFormatException ignored) {}
        }
        if (maxExplicit > 0) return maxExplicit;

        // Deduplicate overlapping work history spans before summing
        if (!workHistory.isEmpty()) {
            // Re-extract (startYear, endYear) pairs and merge overlapping ranges
            int currentYear = Year.now().getValue();
            List<int[]> ranges = new ArrayList<>();
            Matcher m2 = DATE_RANGE_PATTERN.matcher(text);
            while (m2.find()) {
                int[] r = extractYearRange(m2);
                if (r != null) ranges.add(r);
            }
            int merged = mergeAndSum(ranges, currentYear);
            if (merged > 0) return Math.min(merged, 45);
        }

        return 0;
    }

    /** Merge overlapping (startYear, endYear) ranges and return total years */
    private int mergeAndSum(List<int[]> ranges, int currentYear) {
        if (ranges.isEmpty()) return 0;
        ranges.sort(Comparator.comparingInt(r -> r[0]));
        int total = 0;
        int curStart = ranges.get(0)[0], curEnd = ranges.get(0)[1];
        for (int i = 1; i < ranges.size(); i++) {
            int s = ranges.get(i)[0], e = ranges.get(i)[1];
            if (s <= curEnd) {
                curEnd = Math.max(curEnd, e); // extend
            } else {
                total += Math.max(1, curEnd - curStart);
                curStart = s; curEnd = e;
            }
        }
        total += Math.max(1, curEnd - curStart);
        return total;
    }

    /** Returns [startYear, endYear] from a DATE_RANGE_PATTERN match, or null if invalid */
    private int[] extractYearRange(Matcher m) {
        int currentYear = Year.now().getValue();
        try {
            int startYear = Integer.parseInt(m.group(2));
            String endRaw = m.group(4);
            int endYear = (endRaw == null || endRaw.matches("(?i)present|current|now|till.?date"))
                ? currentYear : Integer.parseInt(endRaw);
            if (startYear >= 1970 && startYear <= currentYear
                    && endYear >= startYear && endYear <= currentYear + 1) {
                return new int[]{startYear, endYear};
            }
        } catch (Exception ignored) {}
        return null;
    }

    // kept for backwards compat; not used in new flow
    private int computeRangeDuration(Matcher m) {
        int[] r = extractYearRange(m);
        return r != null ? Math.max(1, r[1] - r[0]) : 0;
    }

    // ─── Structured context builder ────────────────────────────────────────────

    private String buildStructuredContext(String name, String email, String phone,
            String currentRole, int exp, String education,
            List<String> skills, List<NLPExtractedData.WorkEntry> workHistory) {

        StringBuilder sb = new StringBuilder();
        sb.append("=== NLP PRE-EXTRACTED ENTITIES ===\n");
        sb.append("Candidate Name   : ").append(orUnknown(name)).append("\n");
        sb.append("Email            : ").append(orUnknown(email)).append("\n");
        sb.append("Phone            : ").append(orUnknown(phone)).append("\n");
        sb.append("Current Role     : ").append(orUnknown(currentRole)).append("\n");
        sb.append("Education        : ").append(orUnknown(education)).append("\n");
        sb.append("Experience (NLP) : ").append(exp).append(" year(s)\n");

        if (!workHistory.isEmpty()) {
            sb.append("Work History     :\n");
            for (NLPExtractedData.WorkEntry e : workHistory) {
                sb.append("  - ").append(orUnknown(e.getTitle()));
                if (e.getCompany() != null) sb.append(" @ ").append(e.getCompany());
                sb.append("  [").append(e.getDateRange()).append("]");
                sb.append("  (~").append(e.getDurationYears()).append(" yr)\n");
            }
        }

        if (!skills.isEmpty()) {
            sb.append("Skills (NLP)     : ").append(String.join(", ", skills)).append("\n");
        }
        sb.append("=== END NLP ENTITIES ===\n");
        return sb.toString();
    }

    private String orUnknown(String s) { return s != null && !s.isBlank() ? s : "Not found"; }

    private NLPExtractedData emptyData() {
        return NLPExtractedData.builder()
            .extractedSkills(List.of())
            .workHistory(List.of())
            .yearsOfExperience(0)
            .structuredContext("")
            .build();
    }
}
