# 🚗 Autonomous Valet Parking with ROS1 & MORAI

> SSAFY 임베디드 트랙 자율주행 프로젝트

## 🌐 Project Overview

이 프로젝트는 MORAI 시뮬레이터와 ROS1(Melodic)을 기반으로, 운전자가 목적지에서 하차하면 차량이 스스로 주변 주차장으로 이동해 자율주차하고, 운전자의 호출 시 다시 자율주행으로 호출 위치로 돌아오는 **자율 발렛 파킹 시스템**을 구현합니다.

---

## 📊 System Architecture (주요 기능)

### 1. 위치 인식 (GPS, IMU)

-  Localization (좌표변환 WGS84 → UTM)
-  Odometry 생성

### 2. 경로 생성

- **정밀도로 지도 기반 전역/지역 경로 생성**
  - 전역 경로 탐색 (A\*, Dijkstra 등)
  - MGeo 데이터를 기반으로 경로 생성
  - 사용자 지정 경로 파일(`.txt`)을 통한 경로 시각화 및 추출

### 3. 경로 계획

- 전역 경로 및 지역 경로를 기반으로 목표 지점까지 자율주행
- 실시간 차량 위치 및 장애물 데이터를 반영한 로컬 경로 갱신
- 상황 인지에 따른 동적 경로 변경 (차선 변경, 회피, 주차 진입 등)

### 4. 판단 / 제어

- Pure Pursuit: 전방 목표점을 추적하여 조향을 제어하는 알고리즘
- PID 제어: 목표 속도와 실제 속도 오차 기반의 속도 제어
- 속도 계획: 커브나 정지선 등 상황에 따른 속도 설정
- ACC: 앞차와의 거리 유지 기반의 자율 속도 조절

### 5. GT 기반 판단/제어

-  차선 변경 (GT 기반)
-  충돌 회피 (Lattice Planner)

### 6. 인지

-  카메라 센서를 통한 차선 인식
-  카메라 + 라이다 센서 퓨전
-  라이다 Point Cloud Clustering

### 7. 인지 + 판단/제어 통합

-  라이다 기반 차선 변경
-  라이다 기반 충돌 회피 (Lattice Planner)

### 8. 주차 및 호출 기능

- 목적지 도달 후 주변 주차장 탐색 및 주차 경로 생성
- 운전자 호출 시 Action 기반으로 자동 경로 계획 및 자율주행 수행

---

## 📄 Project Structure

```bash
EMB/
├── catkin_ws/
│   ├── src/
│   │   ├── ssafy_1/   # Pure Pursuit
│   │   ├── ssafy_2/   # Global/Local Path Planning, PID
│   │   ├── ssafy_3/   # Lattice Planner, 차선 인식
│   │   └── vanish/    # ACC, 자율주차 및 호출 주행
│   └── ... (CMake, workspace 설정)
├── main.sh            # 전체 실행 스크립트
└── README.md
```

---

## 🚀 Development Environment

본 프로젝트는 **MORAI 시뮬레이터**와 **ROS1(Melodic)**을 활용하여, 자율주행 차량이 주행 및 주차를 수행하는 시뮬레이션 환경을 구축한 것입니다.\
시뮬레이터는 **Windows**에서 실행되며, ROS와 알고리즘은 **Ubuntu(VM)** 환경에서 구동됩니다.\
**VMware Workstation Pro**를 사용하여 Ubuntu 가상 머신을 구동하고, MORAI Sim과의 통신을 통해 자율주행 알고리즘을 테스트합니다.

- **시뮬레이터 실행 환경**: Windows 10
- **ROS 실행 환경**: Ubuntu 18.04 (VMware Workstation Pro)
- **ROS 버전**: ROS1 Melodic
- **시뮬레이터 연동 방식**: MORAI Bridge 통신

### 🔧 시스템 구성도

시뮬레이터는 Windows에서 실행되며, ROS와 자율주행 알고리즘은 VMware 기반의 Ubuntu에서 실행됩니다.\
두 환경은 네트워크를 통해 통신하며, ROS 노드는 MORAI Sim의 데이터를 기반으로 경로 생성, 장애물 회피, 주차 등을 수행합니다.

---

## 🧠 노드 및 스크립트 설명

### 📌 주요 노드

- `gps_parser.py`, `gpsimu_parser.py`: GPS/IMU 기반 위치 추정 및 오도메트리 생성
- `global_path_pub.py`, `local_path_pub.py`: 정밀도로 기반 전역/지역 경로 발행
- `pure_pursuit.py`, `pid_control.py`: 조향 및 속도 제어 알고리즘 구현
- `lattice_planner.py`: 장애물 회피를 위한 Lattice 기반 경로 생성 및 선택
- `camera_pedes_detector.py`: 카메라 영상 기반 보행자 인식
- `lidar_velodyne_cluster.py`: 라이다 포인트 클라우드 기반 객체 탐지 및 클러스터링
- `AdaptiveCruiseControl.py`: 전방 차량과의 거리 기반 ACC 속도 제어
- `parking_executor.py`: 목적지 도달 후 자동 주차 기능 실행
- `remote_action_client.py`, `remote_action_server.py`: 운전자 호출 요청에 따라 차량 자율 복귀 수행

---

## ⚡ 실행 방법

```bash
cd EMB
./main.sh

cd catkin_ws
catkin_make
source ./devel/setup.bash
roslaunch vanish point_driving.launch
```

---

## 🌟 Contributors

| 이름 | 역할 및 담당 |
|------|-------------------------------|
| 정주 | 프로젝트 총괄, Pure Pursuit, Lattice Planner, 경로 계획, 차선 변경 및 회피, 라이다 기반 경로 판단 |
| 예찬 | ACC, Global Path Planning, PID 제어, 시뮬레이터 연동, 호출 기능 및 메시지 송수신, 경로 생성 최적화, 조향 최적화 |
| 찬호 | 차선 인식, 라이다-카메라 센서 융합, 객체 탐지 및 포인트 클라우드 처리 |

---

## 🎓 License

본 프로젝트는 SSAFY 교육용으로 제작되었으며, 비상업적 목적에 한해 자유롭게 활용할 수 있습니다.

---

## 📱 Contact

문의: 홍정주 - [jellyt5345@gmail.com](mailto\:jellyt5345@gmail.com)

---

> Made with ❤️ in SSAFY 12th Embedded Track

