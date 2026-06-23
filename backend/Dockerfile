# Build stage
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Build the application (downloads deps + compiles in one step)
RUN mvn clean package -DskipTests

# Production stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy JAR from builder
COPY --from=builder /app/target/*.jar app.jar

# Create non-root user
RUN addgroup -S appuser && adduser -S appuser -G appuser
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/v1/health/status || exit 1

# Start the application
ENTRYPOINT ["java", "-jar", "app.jar"]
