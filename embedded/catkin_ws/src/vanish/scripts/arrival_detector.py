#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import math
from nav_msgs.msg import Path, Odometry
from geometry_msgs.msg import Pose, PoseStamped
from std_msgs.msg import Int32
from tf.transformations import euler_from_quaternion


class ArrivalDetector:
    def __init__(self):
        rospy.init_node('arrival_detector')
        
        # 토픽 구독 및 퍼블리셔 생성
        rospy.Subscriber("/global_path", Path, self.path_callback)
        rospy.Subscriber("/odom", Odometry, self.odom_callback)
        self.state_pub = rospy.Publisher("/arrival_status", Int32, queue_size=10)
        
        # 변수 초기화
        self.global_path = []       # PoseStamped 리스트
        self.current_pose = Pose()  # 현재 차량 위치 (geometry_msgs/Pose)
        self.vehicle_yaw = 0.0
        self.is_global_path = False
        
        # 새로운 경로가 들어오면 arrived 상태를 해제하기 위해 사용하는 변수
        self.arrived = False
        
        # (출발/도착 여부를 판별하기 위한 파라미터들)
        self.min_remaining_points = 5  # 남은 경로 포인트 임계치 (이하이면 도착 간주)

    def path_callback(self, msg):
        """
        글로벌 경로 콜백
          - 새 경로가 들어오면 self.arrived = False로 초기화
          - 이후 get_state()에서 다시 출발(0) 또는 주행(1) 상태로 변경 가능
        """
        self.global_path = msg.poses
        self.is_global_path = len(self.global_path) > 0
        
        if self.is_global_path:
            # 새로운 경로가 들어왔으니 도착 상태 해제
            self.arrived = False
            rospy.loginfo("새로운 글로벌 경로 수신됨 => 도착 상태 해제, 출발(주행) 가능 상태로 복귀")
        else:
            rospy.loginfo("수신된 경로가 없습니다.")

    def odom_callback(self, msg):
        # odom 토픽에서 현재 위치 및 orientation 업데이트
        orientation_q = msg.pose.pose.orientation
        quaternion = (orientation_q.x, orientation_q.y, orientation_q.z, orientation_q.w)
        _, _, self.vehicle_yaw = euler_from_quaternion(quaternion)
        
        self.current_pose.position.x = msg.pose.pose.position.x
        self.current_pose.position.y = msg.pose.pose.position.y
        
        # 현재 상태 계산 후 퍼블리시
        state = self.get_state()
        self.publish_state(state)

    def get_state(self):
        """
        상태 판단 (0=출발, 1=주행중, 2=도착)
        
        1) 만약 글로벌 경로가 없다면 => 0(출발)로 간주
        2) 이미 도착 상태라면 => 2(도착) 유지
        3) 도착 판정이 되면 => arrived=True로 바꾸고 2(도착) 반환
        4) 아직 도착 전이면, 현재 waypoint 인덱스가 10 이하 => 0(출발), 그 외 => 1(주행)
        """
        if not self.is_global_path or len(self.global_path) == 0:
            # 경로가 없으면 '출발' 상태로 간주 (혹은 상황에 따라 1(주행중)으로 보고 싶다면 조정 가능)
            return 0
        
        # 이미 도착한 상태(arrived=True)면 계속 2(도착) 유지
        if self.arrived:
            return 2

        # 아직 arrived=False인데, 실제 도착 판정이 났는지 확인
        if self.is_arrived(threshold=1.0) and self.check_remaining_points():
            self.arrived = True
            return 2
        
        # 도착도 아니고, 경로가 존재한다면 출발 or 주행 상태 구분
        ego_xy = [self.current_pose.position.x, self.current_pose.position.y]
        current_idx = self.get_current_waypoint(ego_xy, self.global_path)

        if current_idx <= 10:
            return 0  # 출발 상태
        else:
            return 1  # 주행중

    def is_arrived(self, threshold=1.0):
        """
        목적지(글로벌 경로의 마지막 포인트)와 현재 위치가 threshold 미만이면 도착으로 판정
        """
        if not self.is_global_path or len(self.global_path) == 0:
            return False
        goal_pos = self.global_path[-1].pose.position
        dx = goal_pos.x - self.current_pose.position.x
        dy = goal_pos.y - self.current_pose.position.y
        dist_to_goal = math.sqrt(dx**2 + dy**2)
        return dist_to_goal < threshold

    def check_remaining_points(self):
        """
        남은 글로벌 경로 포인트 수가 min_remaining_points 미만이면 도착으로 판정
        """
        if not self.is_global_path or len(self.global_path) == 0:
            return False
        
        ego_xy = [self.current_pose.position.x, self.current_pose.position.y]
        current_idx = self.get_current_waypoint(ego_xy, self.global_path)
        remaining_points = len(self.global_path) - current_idx
        return remaining_points < self.min_remaining_points

    def get_current_waypoint(self, ego_xy, global_path):
        """
        ego_xy : [x, y]
        global_path : PoseStamped 리스트
        => ego_xy와 가장 가까운 waypoint 인덱스 반환
        """
        min_dist = float('inf')
        current_waypoint = -1
        for i, pose in enumerate(global_path):
            dx = ego_xy[0] - pose.pose.position.x
            dy = ego_xy[1] - pose.pose.position.y
            dist = math.sqrt(dx*dx + dy*dy)
            if dist < min_dist:
                min_dist = dist
                current_waypoint = i
        return current_waypoint

    def publish_state(self, state):
        msg = Int32()
        msg.data = state
        self.state_pub.publish(msg)
        state_str = {0: "출발", 1: "주행중", 2: "도착"}.get(state, "알수없음")
        rospy.loginfo("상태: %s (%d)", state_str, state)


if __name__ == "__main__":
    ArrivalDetector()
    rospy.spin()
