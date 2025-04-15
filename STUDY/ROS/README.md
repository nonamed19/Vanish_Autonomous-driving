## ROS 용어 정리

<ul>
<li>ROS Master : 노드와 노드 사이의 연결과 통신을 위한 서버(roscore)
<li>ROS Node : ROS에서 실행되는 최소 단위 프로세스(프로그램)
<li>ROS Message : 노드와 노드 간의 데이터를 주고 받는 양식
<li>ROS Package : ROS 소프트웨어의 기본 단위
<li>ROS Topic : 단방향의 연속적인 메세지 송 수신 방식
<li>ROS Service : 양방향의 일회성 송수신 방식
<li>ROS Publish : Topic에 원하는 메시지를 담아 송신하는 것
<li>ROS Publisher : Publish를 수행하기 위해 Topic을 포함한 자신의 정보를 마스터에 등록하고, Subscriber Node에 Message를 보냄
<li>ROS Subscribe : Topic의 내용에 해당하는 Message를 수신하는 것
<li>ROs Subscriber : Subscribe를 수행하기 위해 Topic을 포함한 자신의 정보를 마스터에 등록 수신하고자 하는 Topic의 정보를 Master로부터 받는다
</ul>

## ROS 쉘 명령어

<ul>
<li>roscd : 지정한 ROS 패키지의 디렉토리 위치로 이동
<li>rosls : ROS 패키지의 파일 목록 확인
</ul>
[ROS 실행 명령어]
<ul>
<li>roscore : 마스터 노드 실행
<li>rosrun : 노드 실행
<li>roslaunch : 여러 노드 실행 및 실행 옵션 설정 
<li>rosclean : ROS log file 검사 및 삭제
</ul>
[ROS 정보 명령어]
<ul>
<li>rostopic : ROS 토픽 정보 확인
<li>roservice : ROS 서비스 정보 확인
<li>rosnode : ROS 노드 정보 확인
<li>rosbag : ROS 메시지 기록, 재생
<li>rosmsg : ROS 메시지 파일 정보 확인
<li>rossrv : ROS 서비스 파일 정보 확인
<li>rosversion : ROS 패키지 및 릴리즈 버전 정보 확인
</ul>
[ROS catkin 명령어]
<ul>
<li>catkin_create_pkg : Catkin 빌드 시스템으로 패키지 자동 생성
<li>catkin_make : Catkin 빌드 시스템에 기반을 둔 빌드
<li>catkin_init_workspace : Catkin 빌드 시스템 작업 폴더 초기화
</ul>
