# 1단계: React 빌드
FROM node:22 AS builder
WORKDIR /app

# 빌드 인자를 사용해 VITE_MAPBOX_ACCESS_TOKEN 변수를 전달
ARG VITE_MAPBOX_ACCESS_TOKEN
ENV VITE_MAPBOX_ACCESS_TOKEN=${VITE_MAPBOX_ACCESS_TOKEN}

ARG VITE_IMP_CODE
ENV VITE_IMP_CODE=${VITE_IMP_CODE}

COPY . .
RUN npm install && npm run build

# 2단계: Nginx로 정적 파일 서빙
FROM nginx:stable-alpine

# Nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드된 정적 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# HTTPS 인증서 디렉토리 마운트를 위해 미리 경로 확보
VOLUME ["/etc/letsencrypt"]

EXPOSE 80
EXPOSE 443
