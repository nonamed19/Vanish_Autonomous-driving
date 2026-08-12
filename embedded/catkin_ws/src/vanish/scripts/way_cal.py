#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import math
from nav_msgs.msg import Path, Odometry
from geometry_msgs.msg import Pose, PoseStamped
from std_msgs.msg import Int32
from tf.transformations import euler_from_quaternion

class DirectionDetector:
    def __init__(self):
        rospy.init_node('direction_detector')
        
        # 토픽 구독 및 퍼블리셔 생성
        rospy.Subscriber("/global_path", Path, self.path_callback)
        rospy.Subscriber("/odom", Odometry, self.odom_callback)
        rospy.Subscriber("/arrival_status", Int32, self.arrival_status_callback)
        self.direction_pub = rospy.Publisher("/way", Int32, queue_size=10)
        
        # 변수 초기화
        self.global_path = []         # PoseStamped 리스트
        self.current_pose = Pose()      # 현재 차량 위치 (geometry_msgs/Pose)
        self.vehicle_yaw = 0.0
        # 도착 상태: 0 - 출발, 1 - 주행중, 2 - 도착
        self.arrival_state = None

    def path_callback(self, msg):
        # 새로운 글로벌 경로 수신 시, 경로 업데이트 및 (출발) 상태 초기화
        self.global_path = msg.poses
        rospy.loginfo("새로운 글로벌 경로 수신됨")
        # 새로운 경로가 수신되면 출발 상태(예: 0)로 초기화되었다고 가정

    def arrival_status_callback(self, msg):
        # arrive detector에서 발행한 도착 상태 업데이트 (0: 출발, 1: 주행중, 2: 도착)
        self.arrival_state = msg.data
        rospy.loginfo("도착 상태 업데이트: %d", self.arrival_state)

    def odom_callback(self, msg):
        # odom 토픽에서 현재 위치 및 orientation 업데이트
        orientation_q = msg.pose.pose.orientation
        quaternion = (orientation_q.x,
                      orientation_q.y,
                      orientation_q.z,
                      orientation_q.w)
        _, _, self.vehicle_yaw = euler_from_quaternion(quaternion)
        
        self.current_pose.position.x = msg.pose.pose.position.x
        self.current_pose.position.y = msg.pose.pose.position.y
        
        # arrive detector의 상태가 2(도착)이면 방향 계산을 중단
        if self.arrival_state == 2:
            rospy.loginfo("도착 상태(2) - 방향 계산 중단, 새로운 글로벌 경로 수신을 대기")
            return
        
        self.detect_direction()

    def get_current_waypoint(self, ego_xy, global_path):
        """
        ego_xy : [x, y] 형태의 리스트
        global_path : PoseStamped 리스트
        현재 차량 위치와 가장 가까운 waypoint의 인덱스를 반환
        """
        min_dist = float('inf')
        current_waypoint = -1
        for i, pose in enumerate(global_path):
            dx = ego_xy[0] - pose.pose.position.x
            dy = ego_xy[1] - pose.pose.position.y
            dist = math.sqrt(dx * dx + dy * dy)
            if dist < min_dist:
                min_dist = dist
                current_waypoint = i
        return current_waypoint

    def detect_direction(self):
        if not self.global_path or self.current_pose is None:
            return

        # 현재 차량 위치 추출 (ego 좌표)
        ego_xy = [self.current_pose.position.x, self.current_pose.position.y]
        current_idx = self.get_current_waypoint(ego_xy, self.global_path)

        if current_idx == -1:
            rospy.logwarn("현재 위치에 해당하는 waypoint를 찾을 수 없음")
            return

        lookahead = 75  # 기본 lookahead 포인트 개수
        
        # 남은 경로가 부족하면 마지막 포인트 사용
        if current_idx + lookahead >= len(self.global_path):
            future_idx = len(self.global_path) - 1
        else:
            future_idx = current_idx + lookahead

        # 현재 waypoint와 미래 waypoint 사이의 경로 각도 계산
        current_point = self.global_path[current_idx].pose.position
        future_point = self.global_path[future_idx].pose.position
        
        path_heading = math.atan2(future_point.y - current_point.y,
                                  future_point.x - current_point.x)

        # 차량의 yaw와 경로 각도의 차이 계산 (정규화)
        angle_diff = self.normalize_angle(path_heading - self.vehicle_yaw)
        angle_diff_deg = math.degrees(abs(angle_diff))

        # 임계치(10° 이하)는 직진으로 판단
        threshold_deg = 10.0
        if angle_diff_deg < threshold_deg:
            direction = 0
        else:
            # 각도의 부호에 따라 좌회전(양수) 또는 우회전(음수) 결정
            if angle_diff > 0:
                direction = -1
            else:
                direction = 1

        # 결과를 토픽으로 퍼블리시
        msg = Int32()
        msg.data = direction
        self.direction_pub.publish(msg)

        rospy.loginfo("[DirectionDetector] 진행 방향: %d, 차량 각도: %.2f°, 경로 각도: %.2f°, 차이: %.2f°",
                      direction, math.degrees(self.vehicle_yaw), math.degrees(path_heading), angle_diff_deg)

    def normalize_angle(self, angle):
        """각도를 [-pi, pi] 범위로 정규화"""
        while angle > math.pi:
            angle -= 2 * math.pi
        while angle < -math.pi:
            angle += 2 * math.pi
        return angle

if __name__ == "__main__":
    DirectionDetector()
    rospy.spin()
