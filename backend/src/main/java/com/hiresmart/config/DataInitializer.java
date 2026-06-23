package com.hiresmart.config;

import com.hiresmart.entity.*;
import com.hiresmart.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final OrganizationRepository   organizationRepository;
    private final UserRepository            userRepository;
    private final DepartmentRepository      departmentRepository;
    private final JobRepository             jobRepository;
    private final ResumeAnalysisRepository  resumeAnalysisRepository;
    private final PasswordEncoder           passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (organizationRepository.count() > 0) {
            log.info("Seed data already present, skipping initialization");
            return;
        }

        log.info("Initializing demo seed data...");

        // ── Organization ──────────────────────────────────────────────────────
        Organization org = organizationRepository.save(Organization.builder()
                .name("HireIQ Demo Corp")
                .email("admin@hireiq.ai")
                .phone("+1-555-0100")
                .address("123 Tech Avenue")
                .city("San Francisco")
                .country("USA")
                .postalCode("94105")
                .website("www.hireiq.ai")
                .industry("Technology")
                .companySize("MEDIUM")
                .build());

        String orgId = org.getId().toString();

        // ── Departments ───────────────────────────────────────────────────────
        Department engineering = departmentRepository.save(Department.builder()
                .organization(org).name("Engineering").description("Software Engineering").build());
        Department hr = departmentRepository.save(Department.builder()
                .organization(org).name("Human Resources").description("HR and Recruitment").build());
        Department infra = departmentRepository.save(Department.builder()
                .organization(org).name("Infrastructure").description("DevOps and Cloud Platform").build());
        Department product = departmentRepository.save(Department.builder()
                .organization(org).name("Product").description("Product Management").build());

        // ── Users ─────────────────────────────────────────────────────────────
        userRepository.save(User.builder().organization(org).email("admin@hireiq.ai")
                .passwordHash(passwordEncoder.encode("Admin123!"))
                .firstName("Admin").lastName("User")
                .role(UserRole.HR_ADMINISTRATOR).department(hr).isActive(true).build());

        userRepository.save(User.builder().organization(org).email("recruiter@hireiq.ai")
                .passwordHash(passwordEncoder.encode("Admin123!"))
                .firstName("Jane").lastName("Smith")
                .role(UserRole.RECRUITER).department(hr).isActive(true).build());

        User hiringManager = userRepository.save(User.builder().organization(org)
                .email("manager@hireiq.ai")
                .passwordHash(passwordEncoder.encode("Admin123!"))
                .firstName("John").lastName("Manager")
                .role(UserRole.HIRING_MANAGER).department(engineering).isActive(true).build());

        // 10 panel members (INTERVIEW_PANEL_MEMBER users)
        String[][] panelData = {
            {"sarah.chen@hireiq.ai",       "Sarah",    "Chen",       "Principal Software Engineer"},
            {"michael.torres@hireiq.ai",   "Michael",  "Torres",     "Senior Backend Engineer"},
            {"priya.sharma@hireiq.ai",     "Priya",    "Sharma",     "Frontend Architect"},
            {"emma.davis@hireiq.ai",       "Emma",     "Davis",      "Senior Full-Stack Developer"},
            {"david.kim@hireiq.ai",        "David",    "Kim",        "QA Lead Engineer"},
            {"james.wilson@hireiq.ai",     "James",    "Wilson",     "DevOps Lead"},
            {"carlos.rodriguez@hireiq.ai", "Carlos",   "Rodriguez",  "Cloud Solutions Architect"},
            {"rahul.gupta@hireiq.ai",      "Rahul",    "Gupta",      "ML Engineer"},
            {"angela.white@hireiq.ai",     "Angela",   "White",      "VP of Technology"},
            {"kevin.lee@hireiq.ai",        "Kevin",    "Lee",        "Product Manager"},
        };
        for (String[] p : panelData) {
            userRepository.save(User.builder().organization(org).email(p[0])
                    .passwordHash(passwordEncoder.encode("Admin123!"))
                    .firstName(p[1]).lastName(p[2])
                    .role(UserRole.INTERVIEW_PANEL_MEMBER).department(engineering).isActive(true).build());
        }

        // ── 15 Jobs (seeds 1-4 first so resume_analysis can reference them) ──────
        Job jobReact = jobRepository.save(Job.builder()
                .organization(org).department(engineering).createdByUser(hiringManager)
                .jobCode("JOB-1-00001")
                .title("Senior React Developer")
                .description("We are looking for a talented Senior React Developer to join our growing frontend team. " +
                    "Required: React, TypeScript, Redux, Next.js, REST APIs, GraphQL, Jest. " +
                    "Nice to have: AWS experience, performance optimization, micro-frontend architecture.")
                .minExperienceYears(4).maxExperienceYears(9)
                .employmentType(Enums.EmploymentType.FULL_TIME).workMode(Enums.WorkMode.HYBRID)
                .salaryMin(new BigDecimal("110000")).salaryMax(new BigDecimal("150000"))
                .salaryCurrency("USD").location("San Francisco, CA")
                .status(Enums.JobStatus.OPEN).postedDate(LocalDateTime.now().minusDays(5))
                .deadline(LocalDateTime.of(2026, 4, 30, 23, 59))
                .build());

        Job jobJava = jobRepository.save(Job.builder()
                .organization(org).department(engineering).createdByUser(hiringManager)
                .jobCode("JOB-1-00002")
                .title("Senior Backend Engineer - Java/Spring")
                .description("Join our platform engineering team to build high-throughput distributed systems. " +
                    "Required: Java, Spring Boot, PostgreSQL, Microservices, Docker, AWS, Kafka, Redis. " +
                    "Nice to have: Kubernetes, gRPC, Elasticsearch, performance tuning.")
                .minExperienceYears(5).maxExperienceYears(10)
                .employmentType(Enums.EmploymentType.FULL_TIME).workMode(Enums.WorkMode.HYBRID)
                .salaryMin(new BigDecimal("130000")).salaryMax(new BigDecimal("175000"))
                .salaryCurrency("USD").location("San Francisco, CA")
                .status(Enums.JobStatus.OPEN).postedDate(LocalDateTime.now().minusDays(8))
                .deadline(LocalDateTime.of(2026, 4, 30, 23, 59))
                .build());

        Job jobDevOps = jobRepository.save(Job.builder()
                .organization(org).department(infra).createdByUser(hiringManager)
                .jobCode("JOB-1-00003")
                .title("DevOps / Cloud Engineer")
                .description("We are scaling our cloud infrastructure and need a DevOps engineer to own CI/CD, " +
                    "containerization, and cloud cost optimization. " +
                    "Required: Docker, Kubernetes, AWS, Terraform, Jenkins/GitHub Actions, Linux, Python.")
                .minExperienceYears(3).maxExperienceYears(8)
                .employmentType(Enums.EmploymentType.FULL_TIME).workMode(Enums.WorkMode.REMOTE)
                .salaryMin(new BigDecimal("120000")).salaryMax(new BigDecimal("160000"))
                .salaryCurrency("USD").location("Remote")
                .status(Enums.JobStatus.OPEN).postedDate(LocalDateTime.now().minusDays(3))
                .deadline(LocalDateTime.of(2026, 5, 15, 23, 59))
                .build());

        Job jobPM = jobRepository.save(Job.builder()
                .organization(org).department(product).createdByUser(hiringManager)
                .jobCode("JOB-1-00004")
                .title("Senior Product Manager")
                .description("Lead product strategy for our enterprise SaaS platform. " +
                    "Required: Product Strategy, Agile/Scrum, Data Analysis, Stakeholder Management, Roadmapping, User Research.")
                .minExperienceYears(4).maxExperienceYears(9)
                .employmentType(Enums.EmploymentType.FULL_TIME).workMode(Enums.WorkMode.HYBRID)
                .salaryMin(new BigDecimal("140000")).salaryMax(new BigDecimal("180000"))
                .salaryCurrency("USD").location("San Francisco, CA")
                .status(Enums.JobStatus.OPEN).postedDate(LocalDateTime.now().minusDays(10))
                .deadline(LocalDateTime.of(2026, 5, 31, 23, 59))
                .build());

        String jidReact = jobReact.getId().toString();
        String jidJava  = jobJava.getId().toString();
        String jidOps   = jobDevOps.getId().toString();
        String jidPM    = jobPM.getId().toString();

        // ── 30 Candidates (ResumeAnalysis) ────────────────────────────────────
        //   Job 1 — Senior React Developer (10 candidates)
        saveRA(orgId, jidReact, "Senior React Developer",
            "Arjun Sharma",      "arjun.sharma@gmail.com",     "+91-9876543210", "Sr. React Developer",
            87.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"React\",\"TypeScript\",\"Redux\",\"Next.js\",\"GraphQL\",\"REST APIs\",\"Jest\",\"CSS\"]",
            "[\"Micro-frontend\",\"AWS\"]",
            5, "B.Tech Computer Science, IIT Bombay",
            "Full-stack developer with 5 years building scalable React applications. Deep expertise in Redux, " +
            "performance optimization, and AWS deployments. Previously at Flipkart and a Y-Combinator startup. " +
            "Strong communicator and team player.",
            5, LocalDateTime.now().minusDays(2));

        saveRA(orgId, jidReact, "Senior React Developer",
            "Preethi Nair",      "preethi.nair@gmail.com",     "+91-9845671234", "Frontend Lead",
            92.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"React\",\"TypeScript\",\"Redux\",\"Next.js\",\"GraphQL\",\"Jest\",\"CSS\",\"REST APIs\",\"AWS\"]",
            "[\"Micro-frontend\"]",
            6, "M.S. Software Engineering, Stanford University",
            "Frontend lead with 6 years of experience building enterprise React applications. " +
            "Contributed to open-source Next.js projects. Expert at performance optimization and design systems. " +
            "Led a team of 5 engineers at Swiggy.",
            6, LocalDateTime.now().minusDays(1));

        saveRA(orgId, jidReact, "Senior React Developer",
            "Karan Mehta",       "karan.mehta@outlook.com",    "+91-9812345678", "React Developer",
            74.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"React\",\"TypeScript\",\"Redux\",\"REST APIs\",\"CSS\",\"Jest\"]",
            "[\"Next.js\",\"GraphQL\",\"AWS\"]",
            3, "B.E. Information Technology, VIT University",
            "Passionate React developer with 3 years of experience in SaaS products. " +
            "Built reusable component libraries and integrated third-party APIs. Looking to grow into a senior role.",
            3, LocalDateTime.now().minusDays(4));

        saveRA(orgId, jidReact, "Senior React Developer",
            "Shivani Kumar",     "shivani.kumar@yahoo.com",    "+91-9901234567", "UI Engineer",
            71.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"React\",\"TypeScript\",\"CSS\",\"REST APIs\",\"Redux\",\"Jest\"]",
            "[\"Next.js\",\"GraphQL\",\"AWS\"]",
            4, "B.Sc Computer Science, Delhi University",
            "UI Engineer specializing in accessibility and responsive design. " +
            "4 years of experience at product companies. Strong eye for design and attention to detail.",
            4, LocalDateTime.now().minusDays(3));

        saveRA(orgId, jidReact, "Senior React Developer",
            "Rohit Das",         "rohit.das@protonmail.com",   "+91-8834567890", "Frontend Developer",
            63.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"React\",\"TypeScript\",\"Redux\",\"REST APIs\",\"CSS\"]",
            "[\"Next.js\",\"GraphQL\",\"Jest\",\"AWS\"]",
            2, "B.Tech Electronics, NIT Trichy",
            "Self-taught frontend developer with 2 years of product experience. " +
            "Transitioned from electronics to web development. Fast learner with a strong portfolio.",
            2, LocalDateTime.now().minusDays(6));

        saveRA(orgId, jidReact, "Senior React Developer",
            "Ananya Patel",      "ananya.patel@gmail.com",     "+91-9823456789", "React Developer",
            68.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"React\",\"TypeScript\",\"CSS\",\"REST APIs\",\"Redux\",\"Jest\"]",
            "[\"Next.js\",\"GraphQL\",\"AWS\"]",
            3, "B.E. Computer Engineering, Pune University",
            "React developer at a fintech startup for 3 years. Built dashboards handling 1M+ daily transactions. " +
            "Good understanding of data visualization and chart libraries.",
            3, LocalDateTime.now().minusDays(7));

        saveRA(orgId, jidReact, "Senior React Developer",
            "Siddharth Rao",     "siddharth.rao@hotmail.com",  "+91-9756789012", "Web Developer",
            55.0, ResumeAnalysis.ATSRating.FAIR,
            "[\"React\",\"CSS\",\"REST APIs\",\"Redux\"]",
            "[\"TypeScript\",\"Next.js\",\"GraphQL\",\"Jest\",\"AWS\"]",
            2, "B.Sc IT, Osmania University",
            "Web developer with 2 years of experience primarily in React. " +
            "Looking to deepen TypeScript skills. Has worked on e-commerce and educational platforms.",
            2, LocalDateTime.now().minusDays(9));

        saveRA(orgId, jidReact, "Senior React Developer",
            "Deepa Iyer",        "deepa.iyer@gmail.com",       "+91-9934561234", "Frontend Developer",
            79.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"React\",\"TypeScript\",\"Redux\",\"Next.js\",\"CSS\",\"REST APIs\",\"Jest\"]",
            "[\"GraphQL\",\"AWS\"]",
            5, "M.C.A, Bangalore University",
            "Frontend developer with 5 years building React SPAs. " +
            "Strong in server-side rendering with Next.js. Led frontend migration at a Series B startup.",
            5, LocalDateTime.now().minusDays(5));

        saveRA(orgId, jidReact, "Senior React Developer",
            "Vikram Singh",      "vikram.singh@gmail.com",     "+91-9867890123", "UI/UX Developer",
            82.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"React\",\"TypeScript\",\"Redux\",\"Next.js\",\"CSS\",\"GraphQL\",\"Jest\",\"REST APIs\"]",
            "[\"AWS\",\"Micro-frontend\"]",
            4, "B.Tech CSE, IIIT Hyderabad",
            "UI/UX developer blending design sensibility with engineering excellence. " +
            "4 years at product companies. Built Storybook design systems used by 20+ engineers.",
            4, LocalDateTime.now().minusDays(8));

        saveRA(orgId, jidReact, "Senior React Developer",
            "Meera Thomas",      "meera.thomas@gmail.com",     "+91-8845678901", "Junior Frontend Developer",
            48.0, ResumeAnalysis.ATSRating.FAIR,
            "[\"React\",\"CSS\",\"REST APIs\"]",
            "[\"TypeScript\",\"Redux\",\"Next.js\",\"GraphQL\",\"Jest\",\"AWS\"]",
            1, "B.Tech IT, KTU Kerala",
            "Fresher with internship experience in React development. " +
            "Built a college event management portal. Eager to learn and grow quickly.",
            1, LocalDateTime.now().minusDays(10));

        //   Job 2 — Senior Backend Engineer - Java/Spring (9 candidates)
        saveRA(orgId, jidJava, "Senior Backend Engineer - Java/Spring",
            "Rajesh Kumar",      "rajesh.kumar@gmail.com",     "+91-9876501234", "Java Developer",
            89.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"Java\",\"Spring Boot\",\"PostgreSQL\",\"Microservices\",\"Docker\",\"AWS\",\"Kafka\",\"Redis\"]",
            "[\"Kubernetes\",\"gRPC\"]",
            7, "B.Tech CSE, IIT Madras",
            "Senior Java developer with 7 years in distributed systems. " +
            "Built payment processing microservices at HDFC Bank processing ₹50Cr daily. Expert in Spring ecosystem.",
            7, LocalDateTime.now().minusDays(3));

        saveRA(orgId, jidJava, "Senior Backend Engineer - Java/Spring",
            "Suresh Patel",      "suresh.patel@outlook.com",   "+91-9812345001", "Backend Engineer",
            85.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"Java\",\"Spring Boot\",\"PostgreSQL\",\"Docker\",\"AWS\",\"Kafka\",\"Redis\",\"Microservices\"]",
            "[\"Kubernetes\",\"gRPC\",\"Elasticsearch\"]",
            5, "M.Tech Software Systems, BITS Pilani",
            "Backend engineer with 5 years in SaaS products. " +
            "Designed event-driven architecture for an e-commerce platform with 500K daily orders.",
            5, LocalDateTime.now().minusDays(2));

        saveRA(orgId, jidJava, "Senior Backend Engineer - Java/Spring",
            "Amit Verma",        "amit.verma@gmail.com",       "+91-9823401234", "Sr. Java Developer",
            93.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"Java\",\"Spring Boot\",\"PostgreSQL\",\"Microservices\",\"Docker\",\"Kubernetes\",\"AWS\",\"Kafka\",\"Redis\",\"gRPC\"]",
            "[\"Elasticsearch\"]",
            8, "B.Tech CSE, IIT Delhi",
            "Principal-level Java architect with 8 years designing large-scale microservices. " +
            "Holds AWS Solutions Architect certification. Led teams of 10+ at Uber India.",
            8, LocalDateTime.now().minusDays(1));

        saveRA(orgId, jidJava, "Senior Backend Engineer - Java/Spring",
            "Neeraj Gupta",      "neeraj.gupta@yahoo.com",     "+91-9845001234", "Backend Developer",
            76.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"Java\",\"Spring Boot\",\"PostgreSQL\",\"Docker\",\"REST APIs\",\"Kafka\"]",
            "[\"Kubernetes\",\"AWS\",\"Redis\",\"Microservices\"]",
            4, "B.E. Computer Science, Jadavpur University",
            "Backend developer with 4 years of Java experience at a logistics startup. " +
            "Good understanding of concurrency patterns and database optimization.",
            4, LocalDateTime.now().minusDays(6));

        saveRA(orgId, jidJava, "Senior Backend Engineer - Java/Spring",
            "Pooja Sharma",      "pooja.sharma@gmail.com",     "+91-9901001234", "Java Developer",
            69.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"Java\",\"Spring Boot\",\"PostgreSQL\",\"Docker\",\"REST APIs\"]",
            "[\"Kafka\",\"Redis\",\"Kubernetes\",\"AWS\",\"Microservices\"]",
            3, "B.Sc Computer Science, Mumbai University",
            "Java developer building REST APIs for a banking app. " +
            "Strong in JPA/Hibernate and SQL optimization. Looking for backend challenges at scale.",
            3, LocalDateTime.now().minusDays(7));

        saveRA(orgId, jidJava, "Senior Backend Engineer - Java/Spring",
            "Manoj Singh",       "manoj.singh@protonmail.com", "+91-9756001234", "Backend Engineer",
            78.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"Java\",\"Spring Boot\",\"PostgreSQL\",\"Docker\",\"Kafka\",\"Redis\",\"REST APIs\"]",
            "[\"Kubernetes\",\"AWS\",\"Microservices\"]",
            6, "M.Sc Computer Science, Hyderabad Central University",
            "Backend engineer with 6 years at EdTech companies. " +
            "Designed scalable quiz and assessment engines serving 2M students.",
            6, LocalDateTime.now().minusDays(4));

        saveRA(orgId, jidJava, "Senior Backend Engineer - Java/Spring",
            "Divya Krishnan",    "divya.krishnan@gmail.com",   "+91-9867001234", "Full-Stack Java Developer",
            82.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"Java\",\"Spring Boot\",\"PostgreSQL\",\"Docker\",\"AWS\",\"Kafka\",\"Microservices\",\"REST APIs\"]",
            "[\"Kubernetes\",\"Redis\",\"gRPC\"]",
            5, "B.E. CSE, Anna University",
            "Full-stack developer with a backend focus. " +
            "Built multi-tenant SaaS platform serving 10K+ SME clients. Expert in Spring Security and OAuth.",
            5, LocalDateTime.now().minusDays(5));

        saveRA(orgId, jidJava, "Senior Backend Engineer - Java/Spring",
            "Arun Reddy",        "arun.reddy@outlook.com",     "+91-9834001234", "Microservices Developer",
            71.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"Java\",\"Spring Boot\",\"Docker\",\"Kafka\",\"REST APIs\",\"PostgreSQL\"]",
            "[\"Kubernetes\",\"AWS\",\"Redis\",\"gRPC\"]",
            4, "B.Tech IT, JNTU Hyderabad",
            "Developer with 4 years migrating monoliths to microservices. " +
            "Good grasp of DDD and clean architecture. Worked at a telecom startup.",
            4, LocalDateTime.now().minusDays(8));

        saveRA(orgId, jidJava, "Senior Backend Engineer - Java/Spring",
            "Kavita Shah",       "kavita.shah@gmail.com",      "+91-8856001234", "Backend Developer",
            58.0, ResumeAnalysis.ATSRating.FAIR,
            "[\"Java\",\"Spring Boot\",\"PostgreSQL\",\"REST APIs\"]",
            "[\"Docker\",\"Kafka\",\"Redis\",\"Kubernetes\",\"AWS\",\"Microservices\"]",
            2, "B.E. Information Science, Symbiosis University",
            "Junior backend developer with 2 years at a startup. " +
            "Good Java fundamentals, actively learning Docker and cloud technologies.",
            2, LocalDateTime.now().minusDays(9));

        //   Job 3 — DevOps / Cloud Engineer (6 candidates)
        saveRA(orgId, jidOps, "DevOps / Cloud Engineer",
            "Sanjay Pillai",     "sanjay.pillai@gmail.com",    "+91-9898001234", "DevOps Engineer",
            88.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"Docker\",\"Kubernetes\",\"AWS\",\"Terraform\",\"Jenkins\",\"Linux\",\"Python\",\"CI/CD\"]",
            "[\"Istio\",\"ArgoCD\"]",
            6, "B.Tech Computer Science, NIT Calicut",
            "DevOps engineer with 6 years automating infrastructure at scale. " +
            "Reduced deployment time by 60% at a Series C startup. AWS Certified DevOps Professional.",
            6, LocalDateTime.now().minusDays(2));

        saveRA(orgId, jidOps, "DevOps / Cloud Engineer",
            "Riya Bhatt",        "riya.bhatt@outlook.com",     "+91-9845112345", "Cloud Architect",
            91.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"Docker\",\"Kubernetes\",\"AWS\",\"Terraform\",\"Jenkins\",\"Linux\",\"Python\",\"CI/CD\",\"Istio\",\"ArgoCD\"]",
            "[]",
            7, "M.Tech Systems, IIT Bombay",
            "Cloud architect designing multi-cloud solutions for Fortune 500 companies. " +
            "AWS + Azure dual-certified. Saved $2M annually through cloud cost optimization.",
            7, LocalDateTime.now().minusDays(1));

        saveRA(orgId, jidOps, "DevOps / Cloud Engineer",
            "Gaurav Joshi",      "gaurav.joshi@gmail.com",     "+91-9823112345", "DevOps Lead",
            80.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"Docker\",\"Kubernetes\",\"AWS\",\"Terraform\",\"CI/CD\",\"Linux\",\"Python\",\"Jenkins\"]",
            "[\"Istio\",\"ArgoCD\",\"Datadog\"]",
            5, "B.E. CSE, BITS Goa",
            "DevOps lead with 5 years building self-healing infrastructure. " +
            "Managed Kubernetes clusters for 200+ microservices. Passionate about GitOps.",
            5, LocalDateTime.now().minusDays(4));

        saveRA(orgId, jidOps, "DevOps / Cloud Engineer",
            "Tanvi Chawla",      "tanvi.chawla@yahoo.com",     "+91-9901112345", "Site Reliability Engineer",
            72.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"Docker\",\"Kubernetes\",\"AWS\",\"Linux\",\"Python\",\"CI/CD\"]",
            "[\"Terraform\",\"Jenkins\",\"Istio\",\"ArgoCD\"]",
            4, "B.Tech CSE, DTU Delhi",
            "SRE focused on availability and observability. " +
            "Maintained 99.99% SLA for a healthcare platform. Good at incident response and postmortems.",
            4, LocalDateTime.now().minusDays(5));

        saveRA(orgId, jidOps, "DevOps / Cloud Engineer",
            "Manish Kapoor",     "manish.kapoor@gmail.com",    "+91-9756112345", "Cloud Engineer",
            65.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"Docker\",\"AWS\",\"Linux\",\"Python\",\"CI/CD\",\"Jenkins\"]",
            "[\"Kubernetes\",\"Terraform\",\"Istio\",\"ArgoCD\"]",
            3, "B.Sc IT, Amity University",
            "Cloud engineer with 3 years managing AWS infrastructure. " +
            "Familiar with CloudFormation and basic Kubernetes. Looking to deepen DevOps expertise.",
            3, LocalDateTime.now().minusDays(7));

        saveRA(orgId, jidOps, "DevOps / Cloud Engineer",
            "Reshma Ali",        "reshma.ali@protonmail.com",  "+91-8834112345", "Junior DevOps Developer",
            53.0, ResumeAnalysis.ATSRating.FAIR,
            "[\"Docker\",\"Linux\",\"Python\",\"CI/CD\"]",
            "[\"Kubernetes\",\"AWS\",\"Terraform\",\"Jenkins\",\"Istio\",\"ArgoCD\"]",
            2, "B.E. Computer Science, Osmania University",
            "Junior DevOps engineer with 2 years of experience. " +
            "Good scripting skills in Python and Bash. Actively studying Kubernetes and cloud certifications.",
            2, LocalDateTime.now().minusDays(10));

        //   Job 4 — Senior Product Manager (5 candidates)
        saveRA(orgId, jidPM, "Senior Product Manager",
            "Neha Jain",         "neha.jain@gmail.com",        "+91-9898112345", "Product Manager",
            84.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"Product Strategy\",\"Agile/Scrum\",\"Data Analysis\",\"Stakeholder Management\",\"Roadmapping\",\"User Research\",\"SQL\"]",
            "[\"B2B SaaS experience\"]",
            5, "MBA, IIM Ahmedabad",
            "Product manager with 5 years in B2C SaaS. " +
            "Launched 3 products from 0 to 1. Strong data-driven approach and experience with A/B testing.",
            5, LocalDateTime.now().minusDays(3));

        saveRA(orgId, jidPM, "Senior Product Manager",
            "Vivek Malhotra",    "vivek.malhotra@outlook.com", "+91-9845212345", "Senior Product Manager",
            86.0, ResumeAnalysis.ATSRating.EXCELLENT,
            "[\"Product Strategy\",\"Agile/Scrum\",\"Data Analysis\",\"Stakeholder Management\",\"Roadmapping\",\"User Research\",\"SQL\",\"B2B SaaS experience\"]",
            "[\"Technical background\"]",
            6, "B.Tech + MBA, IIT Kanpur",
            "Senior PM at a B2B SaaS company managing a $20M ARR product. " +
            "Strong technical background allowing deep collaboration with engineering. Built enterprise integrations.",
            6, LocalDateTime.now().minusDays(2));

        saveRA(orgId, jidPM, "Senior Product Manager",
            "Sneha Pandey",      "sneha.pandey@gmail.com",     "+91-9823212345", "Product Lead",
            77.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"Product Strategy\",\"Agile/Scrum\",\"Stakeholder Management\",\"Roadmapping\",\"User Research\",\"Data Analysis\"]",
            "[\"SQL\",\"B2B SaaS experience\",\"Technical background\"]",
            4, "MBA, ISB Hyderabad",
            "Product lead with 4 years defining product vision at a Series B healthtech startup. " +
            "Expert at customer discovery and iterative product development.",
            4, LocalDateTime.now().minusDays(5));

        saveRA(orgId, jidPM, "Senior Product Manager",
            "Akash Bansal",      "akash.bansal@yahoo.com",     "+91-9901212345", "Associate Product Manager",
            62.0, ResumeAnalysis.ATSRating.GOOD,
            "[\"Agile/Scrum\",\"Roadmapping\",\"User Research\",\"Stakeholder Management\"]",
            "[\"Product Strategy\",\"Data Analysis\",\"SQL\",\"B2B SaaS experience\"]",
            2, "B.Tech CSE + Product Fellowship, IIT Roorkee",
            "Associate PM with 2 years at a consumer app. " +
            "Good at user research and writing PRDs. Completed an APM fellowship at Google.",
            2, LocalDateTime.now().minusDays(8));

        saveRA(orgId, jidPM, "Senior Product Manager",
            "Pallavi Bose",      "pallavi.bose@gmail.com",     "+91-8856212345", "Product Analyst",
            56.0, ResumeAnalysis.ATSRating.FAIR,
            "[\"Data Analysis\",\"User Research\",\"Agile/Scrum\",\"Roadmapping\"]",
            "[\"Product Strategy\",\"Stakeholder Management\",\"SQL\",\"B2B SaaS experience\"]",
            3, "MBA, XLRI Jamshedpur",
            "Product analyst transitioning into a PM role. " +
            "3 years of strong analytics experience with Mixpanel and Amplitude. Clear communicator.",
            3, LocalDateTime.now().minusDays(9));

        // ── 11 Additional Jobs (codes 00005–00015) ────────────────────────────
        saveJob(jobRepository, org, product, hiringManager, "JOB-1-00005",
            "Data Analyst", Enums.EmploymentType.FULL_TIME, Enums.WorkMode.HYBRID,
            "45000", "65000", "Head Office - Mumbai", Enums.JobStatus.OPEN,
            false, 2026, 3, 15);

        saveJob(jobRepository, org, product, hiringManager, "JOB-1-00006",
            "Project Manager", Enums.EmploymentType.INTERNSHIP, Enums.WorkMode.ON_SITE,
            "70000", "100000", "Service Center - Hyderabad", Enums.JobStatus.OPEN,
            true, 2026, 2, 21);

        saveJob(jobRepository, org, engineering, hiringManager, "JOB-1-00007",
            "UX Designer", Enums.EmploymentType.FULL_TIME, Enums.WorkMode.REMOTE,
            "55000", "80000", "Remote Work - India", Enums.JobStatus.DRAFT,
            false, 2026, 3, 19);

        saveJob(jobRepository, org, infra, hiringManager, "JOB-1-00008",
            "DevOps Engineer", Enums.EmploymentType.FULL_TIME, Enums.WorkMode.HYBRID,
            "65000", "95000", "Remote Work - Global", Enums.JobStatus.OPEN,
            false, 2026, 2, 21);

        saveJob(jobRepository, org, product, hiringManager, "JOB-1-00009",
            "Sales Executive", Enums.EmploymentType.FULL_TIME, Enums.WorkMode.ON_SITE,
            "35000", "55000", "Head Office - Mumbai", Enums.JobStatus.OPEN,
            false, 2026, 2, 21);

        saveJob(jobRepository, org, engineering, hiringManager, "JOB-1-00010",
            "Quality Assurance Engineer", Enums.EmploymentType.PART_TIME, Enums.WorkMode.ON_SITE,
            "45000", "70000", "Branch Office - Delhi", Enums.JobStatus.OPEN,
            false, 2026, 2, 21);

        saveJob(jobRepository, org, product, hiringManager, "JOB-1-00011",
            "Business Analyst", Enums.EmploymentType.CONTRACT, Enums.WorkMode.ON_SITE,
            "50000", "75000", "Tech Hub - Bangalore", Enums.JobStatus.DRAFT,
            false, 2026, 2, 8);

        saveJob(jobRepository, org, engineering, hiringManager, "JOB-1-00012",
            "Content Writer", Enums.EmploymentType.TEMPORARY, Enums.WorkMode.ON_SITE,
            "30000", "45000", "Development Center - Pune", Enums.JobStatus.OPEN,
            false, 2026, 2, 21);

        saveJob(jobRepository, org, infra, hiringManager, "JOB-1-00013",
            "Network Administrator", Enums.EmploymentType.FREELANCE, Enums.WorkMode.ON_SITE,
            "55000", "80000", "Regional Office - Chennai", Enums.JobStatus.OPEN,
            false, 2026, 2, 21);

        saveJob(jobRepository, org, product, hiringManager, "JOB-1-00014",
            "Financial Analyst", Enums.EmploymentType.INTERNSHIP, Enums.WorkMode.ON_SITE,
            "45000", "65000", "Service Center - Hyderabad", Enums.JobStatus.DRAFT,
            false, 2026, 1, 9);

        saveJob(jobRepository, org, hr, hiringManager, "JOB-1-00015",
            "Customer Support Representative", Enums.EmploymentType.FULL_TIME, Enums.WorkMode.REMOTE,
            "25000", "35000", "Remote Work - India", Enums.JobStatus.OPEN,
            false, 2026, 2, 21);

        log.info("✓ Seeded: 1 org, 4 depts, 13 users, 15 jobs, 30 candidates");
        log.info("  Login: admin@hireiq.ai / Admin123!");
    }

    private void saveJob(
        JobRepository repo, Organization org, Department dept, User creator,
        String code, String title,
        Enums.EmploymentType empType, Enums.WorkMode workMode,
        String salMin, String salMax, String location,
        Enums.JobStatus status, boolean featured,
        int year, int month, int day
    ) {
        repo.save(Job.builder()
            .organization(org).department(dept).createdByUser(creator)
            .jobCode(code).title(title)
            .description("We are hiring a " + title + ". Apply now with your updated resume.")
            .employmentType(empType).workMode(workMode)
            .salaryMin(new BigDecimal(salMin)).salaryMax(new BigDecimal(salMax))
            .salaryCurrency("USD").location(location)
            .status(status)
            .featured(featured)
            .deadline(LocalDateTime.of(year, month, day, 23, 59))
            .postedDate(status == Enums.JobStatus.OPEN ? LocalDateTime.now().minusDays(7) : null)
            .build());
    }

    private void saveRA(
        String orgId, String jobId, String jobTitle,
        String name, String email, String phone, String role,
        double score, ResumeAnalysis.ATSRating rating,
        String matchedJson, String missingJson,
        int experience, String education, String summary,
        int daysOld, LocalDateTime analyzedAt
    ) {
        resumeAnalysisRepository.save(ResumeAnalysis.builder()
            .organizationId(orgId)
            .jobId(jobId)
            .jobTitle(jobTitle)
            .candidateName(name)
            .email(email)
            .phone(phone)
            .currentRole(role)
            .atsScore(score)
            .rating(rating)
            .matchedSkillsJson(matchedJson)
            .missingSkillsJson(missingJson)
            .yearsOfExperience(experience)
            .education(education)
            .professionalSummary(summary)
            .resumeFileName(name.toLowerCase().replace(" ", "_") + "_resume.pdf")
            .resumeS3Url(null)
            .isApplied(true)
            .source("PUBLIC_APPLY")
            .analyzedBy("seed")
            .analyzedAt(analyzedAt)
            .build());
    }
}
