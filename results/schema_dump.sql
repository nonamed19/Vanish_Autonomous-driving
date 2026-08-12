create database vanish_user_db;
use vanish_user_db;


CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE,                      -- (선택 사항) 외부 참조용 UUID
    email VARCHAR(255) NOT NULL UNIQUE,           -- 로그인/식별용 이메일
    password VARCHAR(255),                        -- 암호화된 비밀번호 (카카오 로그인 시 NULL 허용)
    name VARCHAR(100) NOT NULL,                   -- 사용자 이름
    gender ENUM('M', 'F'),               -- 성별
    birthdate DATE NOT NULL,                      -- 생년월일
    phone VARCHAR(20),                   -- 연락처
    role ENUM('USER', 'ADMIN') DEFAULT 'USER',    -- 사용자 권한
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',  -- 계정 상태
    kakao_id BIGINT UNIQUE,                       -- 카카오 소셜 로그인 고유 식별자 (소셜 로그인 시 사용)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(512) NOT NULL,
    expiry_date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE email_verification (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    verification_code VARCHAR(20) NOT NULL,
    expiry_time DATETIME NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create database vanish_notification_db;
use vanish_notification_db;

CREATE TABLE fcm_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,   -- 회원 ID (논리적 참조)
    token VARCHAR(255) NOT NULL,  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

create database vanish_vehicle_db;
use vanish_vehicle_db;

CREATE TABLE vehicles (
    vehicle_vin VARCHAR(17) NOT NULL COMMENT 'Vehicle Identification Number (VIN – recommended 17 characters)',
    owner_id BIGINT UNIQUE NOT NULL COMMENT 'Vehicle owner ID (references users table in user-service; in MSA, sync/event needed)',
    plan_id BIGINT COMMENT 'Initial vehicle plan reference (from vehicle_plans)',
    model VARCHAR(100) NOT NULL COMMENT 'Vehicle model',
    vehicle_name VARCHAR(100) NOT NULL COMMENT 'User designated vehicle name',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Vehicle registration timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    is_parked BOOLEAN DEFAULT FALSE,
    RegistrationNum VARCHAR(20) COMMENT '차량 등록번호',
    ownership VARCHAR(20) COMMENT '소유 형태 (예: 개인 차량)',
    PRIMARY KEY (vehicle_vin)
);


CREATE TABLE vehicle_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Plan identifier',
    plan_name VARCHAR(100) NOT NULL COMMENT 'Plan name',
    price DECIMAL(10,2) NOT NULL COMMENT 'Monthly subscription fee',
    currency VARCHAR(10) NOT NULL DEFAULT 'KRW' COMMENT 'Currency unit',
    description TEXT COMMENT 'Detailed description',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Plan status (active/inactive)'
);

CREATE TABLE vehicle_status_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    vin VARCHAR(17) NOT NULL COMMENT 'Vehicle Identification Number (VIN – recommended 17 characters)',
    record_date DATE NOT NULL,
    total_distance DECIMAL(10,2) COMMENT 'Daily total driving distance (e.g., km)',
    avg_speed DECIMAL(5,2) COMMENT 'Average speed (km/h)',
    total_drive_time INT COMMENT 'Total driving time (minutes)',
    total_stop_time INT COMMENT 'Stop time (minutes)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

create database vanish_payment_db;
use vanish_payment_db;

CREATE TABLE payment_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '사용자 ID (MSA 환경에서 별도 사용자 서비스에 저장된 값, JWT 토큰에서 추출)',
    transaction_id VARCHAR(255) DEFAULT NULL COMMENT '포트원에서 발급되는 결제 트랜잭션 ID (결제 완료 후 업데이트)',
    order_no VARCHAR(255) DEFAULT NULL COMMENT '고유 주문 번호 (결제 요청 시 생성)',
    order_name VARCHAR(255) NOT NULL COMMENT '주문명 (예: 주차장명 등)',
    base_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '기본 요금 (30분 기준)',
    rate_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '10분 단위 요금',
    price DECIMAL(10,2) DEFAULT NULL COMMENT '산출된 결제 금액 (주차 요금 * 주차 시간)',
    parking_start TIMESTAMP DEFAULT NULL COMMENT '입차 시각 (ROS 입차 API 호출 시 기록)',
    parking_end TIMESTAMP DEFAULT NULL COMMENT '출차 시각 (ROS 출차 API 호출 시 기록)',
    parking_duration INT DEFAULT NULL COMMENT '주차 시간 (분 단위, 입차와 출차 시각의 차이를 계산하여 저장)',
    status ENUM('I','P','S','F','C') NOT NULL DEFAULT 'I' COMMENT '결제 상태 (I: Init, P: Pending, S: Success, F: Fail, C: Cancel)',
    requested_at TIMESTAMP DEFAULT NULL COMMENT '결제 요청 시각 (초기 주문 정보 기록 시 자동 저장)',
    completed_at TIMESTAMP DEFAULT NULL COMMENT '결제 완료 시각 (결제 완료 후 업데이트)'
);

create database vanish_remote_db;
use vanish_remote_db;

CREATE TABLE parking_lot (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '주차장명',
    address VARCHAR(255) NOT NULL COMMENT '주소',
    location POINT NOT NULL COMMENT '주차장 위치 (경도, 위도)',
    congestion TINYINT UNSIGNED NOT NULL COMMENT '혼잡도',
    phone_number VARCHAR(20) NOT NULL COMMENT '주차장 전화번호',
    status ENUM('A','I') NOT NULL DEFAULT 'A' COMMENT '주차장 운영 상태 (A: ACTIVE, I: INACTIVE)',
    base_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '기본 요금 (30분 기준)',
    rate_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '10분 단위 요금',
    SPATIAL INDEX(location)
)

CREATE TABLE `roam_task` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `boarded` bit(1) NOT NULL,
  `extended_roam_end_time` datetime(6) DEFAULT NULL,
  `roam_end_time` datetime(6) NOT NULL,
  `roam_start_time` datetime(6) NOT NULL,
  `user_no` bigint NOT NULL,
  `user_responded` bit(1) NOT NULL,
  `vehicle_vin` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
