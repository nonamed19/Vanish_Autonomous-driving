#!/bin/bash
# ROS 및 workspace 경로는 환경 변수로 덮어쓸 수 있습니다.
ROS_VERSION="${ROS_DISTRO:-noetic}"
WORKSPACE_DIR="${VANISH_CATKIN_WS:-$(cd "$(dirname "$0")/catkin_ws" && pwd)}"

source "/opt/ros/${ROS_VERSION}/setup.bash"
source "${WORKSPACE_DIR}/devel/setup.bash"

exec roslaunch rosbridge_server rosbridge_websocket.launch
