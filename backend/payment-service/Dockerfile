# 경량 JDK 17 이미지 사용
FROM openjdk:17-jdk-slim

# 임시 디렉토리 생성 (Spring Boot가 사용하는 곳)
VOLUME /tmp

# 빌드 결과로 생성된 JAR 파일 경로 (gradlew 빌드 기준)
ARG JAR_FILE=build/libs/payment-service-0.0.1-SNAPSHOT.jar

# 해당 JAR 파일을 이미지에 복사
COPY ${JAR_FILE} app.jar

# 애플리케이션 실
ENTRYPOINT ["java", "-jar", "app.jar"]

