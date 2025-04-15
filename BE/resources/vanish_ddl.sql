create database vanish_user_db;
use vanish_user_db;


CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE,                      -- (선택 사항) 외부 참조용 UUID
    email VARCHAR(255) NOT NULL UNIQUE,           -- 로그인/식별용 이메일
    password VARCHAR(255),                        -- 암호화된 비밀번호 (카카오 로그인 시 NULL 허용)
    name VARCHAR(100) NOT NULL,                   -- 사용자 이름
    gender ENUM('M', 'F') NOT NULL,               -- 성별
    birthdate DATE NOT NULL,                      -- 생년월일
    phone VARCHAR(20) NOT NULL,                   -- 연락처
    role ENUM('USER', 'ADMIN') DEFAULT 'USER',    -- 사용자 권한
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',  -- 계정 상태
    kakao_id BIGINT UNIQUE,                       -- 카카오 소셜 로그인 고유 식별자 (소셜 로그인 시 사용)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE fcm_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,                      -- users 테이블의 외래키
    token VARCHAR(255) NOT NULL,                  -- FCM 토큰 문자열
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);


create database vanish_vehicle_db;
use vanish_vehicle_db;

CREATE TABLE vehicles (
    vin VARCHAR(17) NOT NULL COMMENT 'Vehicle Identification Number (VIN – recommended 17 characters)',
    owner_id BIGINT NOT NULL COMMENT 'Vehicle owner ID (references users table in user-service; in MSA, sync/event needed)',
    plan_id BIGINT NOT NULL COMMENT 'Initial vehicle plan reference (from vehicle_plans)',
    model VARCHAR(100) NOT NULL COMMENT 'Vehicle model',
    vehicle_name VARCHAR(100) NOT NULL COMMENT 'User designated vehicle name',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Vehicle registration timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    PRIMARY KEY (vin)
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

CREATE TABLE billing_info (
    billing_key VARCHAR(255) NOT NULL COMMENT '빌링키',
    user_id BIGINT NOT NULL COMMENT '사용자 ID (users 테이블 참조)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성 일시',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정 일시',
    PRIMARY KEY (billing_key),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE parking_lot (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '주차장명',
    address VARCHAR(255) NOT NULL COMMENT '주소',
    latitude DECIMAL(10,7) NOT NULL COMMENT '주차장 위도',
    longitude DECIMAL(10,7) NOT NULL COMMENT '주차장 경도',
    phone_number VARCHAR(20) NOT NULL COMMENT '주차장 전화번호',
    status ENUM('A','I') NOT NULL DEFAULT 'A' COMMENT '주차장 운영 상태 (A: ACTIVE, I: INACTIVE)',
    base_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '기본 요금 (30분 기준)',
    rate_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '10분 단위 요금',
    max_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '일일권 (최대 요금)',
);
