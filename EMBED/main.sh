#!/bin/bash
# ROS 환경 설정 (필요 시 수정)
source /opt/ros/melodic/setup.bash  # ROS Noetic 기준 (사용 버전에 맞게 변경)
source ~/catkin_ws/devel/setup.bash  # catkin workspace 환경 설정 (사용 환경에 맞게 변경)


roslaunch rosbridge_server rosbridge_websocket.launch