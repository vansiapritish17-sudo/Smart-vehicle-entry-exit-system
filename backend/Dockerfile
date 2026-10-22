# API-only image for hosts such as Render. The React app is deployed separately (Vercel),
# so ../frontend/dist is not in the build context and the jar ships without static files.

# ── Build ──
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
# Resolve dependencies in their own layer so code changes do not re-download them.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

# ── Run ──
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 svems
COPY --from=build /app/target/svems-backend-*.jar app.jar
USER svems

# Credentials come from FIREBASE_SERVICE_ACCOUNT_BASE64; the port from $PORT (set by the host).
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
