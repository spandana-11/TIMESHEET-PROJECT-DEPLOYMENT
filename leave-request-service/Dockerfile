# Stage 1: Build the application
FROM maven:3.8.4-openjdk-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=build /app/target/leave-request-service-0.0.1-SNAPSHOT.jar /app/leave-request-service.jar
ENTRYPOINT ["java", "-jar", "leave-request-service.jar"]
