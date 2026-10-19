# Vanish 프로젝트 정보 | Project Information

> **작성 기준**: 저장소의 README, 소스 구조, ROS launch 설정을 바탕으로 정리했습니다. 개인별 역할과 기여도는 작성자를 특정할 수 없어 의도적으로 비워 두었습니다. 아래의 각 항목은 Sanity `project` 스키마에 옮겨 적기 좋도록 구성했습니다.

## 1. Sanity 입력값 | Copy-ready fields

### title

`Vanish — 자율주행 기반 자동 주차 및 호출 시스템`

### slug

`vanish-autonomous-driving`

### summary

Vanish는 사용자가 하차한 뒤 차량이 스스로 인근 주차 공간을 찾아 주차하고, 필요할 때 모바일 웹앱에서 차량을 호출하면 사용자 위치까지 자율주행으로 복귀하는 스마트 모빌리티 서비스입니다. MORAI Simulator와 ROS를 중심으로 자율주행 흐름을 구현하고, React PWA, Spring Boot 기반 마이크로서비스, 실시간 메시징을 연결해 주차·호출·결제·알림 경험을 하나의 서비스로 통합했습니다.

### type

`engineering`

**표시명 / Display name:** `Engineering`

### status

`completed`

**표시명 / Display name:** `Completed`

### period

| Field | Value |
| --- | --- |
| `startDate` | `2025-02-24` |
| `endDate` | `2025-04-11` |

### role

<!-- intentionally blank -->

> 저장소 정보만으로 이 문서를 사용할 개인의 역할을 확인할 수 없습니다.

### highlights

```text
하차 후 차량이 주차 공간을 탐색하고 자동 주차까지 수행하는 end-to-end 자율주행 시나리오 구현
모바일 PWA에서 차량 위치 확인, 자동 주차·배회·호출, 결제, 알림을 연결한 사용자 경험 설계
ROS·RabbitMQ·Spring Boot MSA를 연결해 차량 텔레메트리와 원격 명령을 실시간으로 연동
MORAI Simulator와 MGeo 정밀도로를 활용해 경로 계획, ACC, 장애물 회피, 주차 제어를 검증
```

### body

아래 내용은 Sanity의 **Detailed Content** 블록에 순서대로 붙여 넣을 수 있는 본문입니다.

#### 차에서 내린 뒤에도, 주차는 이어지도록

Vanish는 주차를 위해 운전자가 반복해서 시간을 쓰는 순간에 주목한 프로젝트입니다. 사용자가 목적지에서 하차하면 차량은 주변 주차 공간을 향해 스스로 이동하고, 주차가 끝난 뒤에는 앱으로 결과를 알려 줍니다. 다시 차량이 필요해지면 호출 명령을 통해 사용자가 있는 위치까지 복귀합니다. 단순한 원격 제어를 넘어, 차량의 이동·주차·결제·알림을 하나의 여정으로 연결하는 것이 목표였습니다.

#### 자율주행과 서비스 플랫폼을 하나의 흐름으로 연결

차량 영역은 MORAI Simulator 위의 ROS Melodic 패키지로 구성했습니다. GPS/IMU 데이터를 오도메트리로 변환하고, MGeo 지도 기반 전역 경로와 지역 경로를 발행합니다. 주행 중에는 Pure Pursuit 기반 조향, PID 및 Adaptive Cruise Control(ACC) 기반 속도 제어, 신호 상태 판단, 목적지 도달 감지를 조합했습니다. 주차 요청이 들어오면 `parking_executor`가 주차 시퀀스를 수행하며, 호출 시에는 원격 목적지를 받아 경로를 다시 생성해 차량을 복귀시키는 구조입니다.

서버는 Spring Boot 기반의 Member, Vehicle, Remote, Payment, Notification 서비스와 API Gateway, Eureka Server로 나누었습니다. RabbitMQ는 ROS와 백엔드 사이의 차량 상태·위치 텔레메트리 및 원격 명령 전달을 담당하고, WebSocket은 차량 상태를 화면에 빠르게 반영합니다. MySQL에는 회원·차량·주차·결제 정보를, Redis에는 차량 관련 실시간 상태 처리를 위한 저장소를 두었습니다. Firebase Cloud Messaging(FCM)으로 주차 완료와 같은 이벤트를 사용자에게 알립니다.

#### 사용자가 보는 화면도 주행 경험의 일부로

프론트엔드는 React와 Vite로 만든 PWA입니다. 로그인·회원가입, 차량 등록, 지도 기반 차량 상태 확인, 자동 주차와 배회 요청, 차량 호출, 결제, 프로필 관리 흐름을 제공하며, 데스크톱에서도 모바일·태블릿 프레임으로 화면을 확인할 수 있게 구성했습니다. Mapbox GL과 Three.js/Threebox를 활용해 지도 위에서 차량과 공간 정보를 시각화했고, 반응형 UI와 서비스 워커를 통해 모바일 앱에 가까운 사용감을 목표로 했습니다.

#### 검증 범위와 다음 단계

프로젝트의 자율주행 시나리오는 MORAI Simulator와 K-City/MGeo 데이터 환경에서 검증했습니다. 실제 차량 환경은 센서 오차, 통신 지연, 예외 상황 등 추가 검증이 필요한 영역입니다. 이후에는 실차 연동과 장애 대응 체계, 실시간 주차면 API 연동, 배회 경로의 에너지 효율화, HD Map 자동 업데이트를 확장 과제로 남겼습니다.

### thumbnail

| Field | Value |
| --- | --- |
| 추천 원본 / Suggested asset | `temp/mainpage.png` |
| `alt` | `Vanish 자율주행 주차 및 호출 서비스의 메인 화면` |

### gallery

| 추천 원본 / Suggested asset | `alt` | `caption` |
| --- | --- | --- |
| `temp/gif_.주행 모습.gif` | MORAI Simulator에서 주행 중인 Vanish 차량 | MORAI Simulator autonomous-driving demonstration |
| `temp/gif_경로 생성.gif` | RViz에서 생성된 Vanish 주행 경로 | ROS path planning visualization in RViz |
| `temp/캡처_2025_04_11_11_42_49_298.png` | 자동 주차 기능 화면 | Auto-parking user flow |
| `temp/캡처_2025_04_11_11_43_06_575.png` | 차량 호출 기능 화면 | Vehicle call-back user flow |
| `temp/System_Architecture_Transparent_Background.png` | Vanish 서비스 및 ROS 통합 아키텍처 | System architecture overview |

### techStack

```text
React
Vite
JavaScript
PWA
Mapbox GL JS
Three.js
Threebox
Firebase Cloud Messaging
Spring Boot 3.4
Java 17
Spring Cloud Gateway
Netflix Eureka
Spring Security
JWT
OpenFeign
WebSocket
RabbitMQ
MySQL 8
Redis
JPA/Hibernate
ROS Melodic
Python
MORAI Simulator
MGeo
Docker
Nginx
Jenkins
AWS EC2
GitLab
```

### team

| Field | Value |
| --- | --- |
| `type` | `team` |
| `size` | `6` |

### contributions

<!-- intentionally blank -->

> 이 필드는 **작성자 개인의 핵심 기여**를 입력하는 용도이므로, 작성자를 알 수 없는 현재 문서에서는 비워 두었습니다.

### links

| `label` | `url` |
| --- | --- |
| GitHub Repository | `https://github.com/nonamed19/Vanish_Autonomous-driving` |

### featured

`false`

## 2. 팀 구성 참고 | Team reference

| 구성원 | 담당 영역 | 주요 작업 |
| --- | --- | --- |
| 김찬호 | ROS / Frontend | 차선 인식, LiDAR–Camera 센서 융합 |
| 김태민 | CI/CD | 결제·호출 API, Jenkins 배포 자동화 |
| 문예찬 | ROS | ACC, 전역 경로 계획, PID 제어 |
| 이석현 | Backend | 회원·차량 관리, 원격 제어 서비스 |
| 이예진 | Frontend | 인포테인먼트, 웹앱 기반 모바일 애플리케이션 |
| 홍정주 | ROS | Pure Pursuit, Lattice Planner, 차선 변경 및 회피 |

## 3. 시스템 한눈에 보기 | System at a glance

```text
React PWA / Mapbox UI
          │ API · WebSocket · FCM
          ▼
API Gateway ──► Spring Boot microservices ──► MySQL / Redis
                      │
                      │ RabbitMQ commands & telemetry
                      ▼
        ROS Melodic nodes on MORAI Simulator
 GPS/IMU → Path Planning → ACC / Control → Parking & Call-back
```

## 4. 기능별 구현 요약 | Implementation summary

| 영역 | 구현 내용 |
| --- | --- |
| 회원 | 회원가입, 로그인, 이메일 인증, 비밀번호 관리, 프로필 및 회원 탈퇴 |
| 차량 | 차량 등록, 차량 상태·위치 조회, 주차 상태 관리 |
| 주차·호출 | 자동 주차, 자율 배회, 원격 호출, 목적지 기반 주행 요청 |
| 결제·알림 | 주차 결제 이력, 결제 처리, FCM 푸시 알림 |
| 자율주행 | GPS/IMU 기반 위치 추정, A* 기반 전역 경로, 지역 경로, ACC, 신호 판단, 자동 주차 |
| 시각화 | Mapbox 지도, 3D 차량 모델, ROS/RViz 기반 경로 및 지도 시각화 |

## 5. 운영 및 개발 환경 | Development environment

| Category | Details |
| --- | --- |
| Autonomous driving | Ubuntu 18.04, ROS Melodic, Python, MORAI Simulator, MGeo |
| Frontend | React 18, Vite, Mapbox GL JS, Three.js, Firebase |
| Backend | Spring Boot 3.4, Java 17, Spring Cloud, RabbitMQ, WebSocket |
| Data | MySQL 8, Redis, JPA/Hibernate |
| Infrastructure | AWS EC2, Docker, Nginx, Jenkins, GitLab |
