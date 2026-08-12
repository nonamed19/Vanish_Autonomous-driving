#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import numpy as np
from math import cos, sin, sqrt, pow, atan2
from geometry_msgs.msg import Point
from nav_msgs.msg import Odometry, Path
from morai_msgs.msg import CtrlCmd
import tf

class PurePursuit:
    def __init__(self):
        rospy.init_node('pure_pursuit', anonymous=True)

        # Global Path 사용
        rospy.Subscriber("/global_path", Path, self.path_callback)
        rospy.Subscriber("/odom", Odometry, self.odom_callback)

        self.ctrl_cmd_pub = rospy.Publisher("/ctrl_cmd", CtrlCmd, queue_size=1)

        self.ctrl_cmd_msg = CtrlCmd()
        self.ctrl_cmd_msg.longlCmdType = 2  # 속도 제어 모드

        self.is_path = False
        self.is_odom = False
        self.is_look_forward_point = False

        self.forward_point = Point()
        self.current_position = Point()

        self.vehicle_length = 2.6  # 차량 길이
        self.lfd_base = 2.0  # 최소 전방주시거리
        self.lfd_max = 12.0  # 최대 전방주시거리
        self.lfd = self.lfd_base  # 현재 전방주시거리

        self.max_steering = np.deg2rad(30)  # 최대 조향각 (30도)
        self.max_steering_change = np.deg2rad(2.0)  # 한 번에 변경할 최대 스티어링 변화량
        self.prev_steering = 0.0  # 이전 스티어링 값 (부드러운 조정을 위해 사용)

        rate = rospy.Rate(30)  # 30Hz
        while not rospy.is_shutdown():
            if self.is_path and self.is_odom:
                steering = self.calc_pure_pursuit()
                if self.is_look_forward_point:
                    # 🚗 급격한 조향 변화 방지
                    if abs(steering - self.prev_steering) > self.max_steering_change:
                        if steering > self.prev_steering:
                            steering = self.prev_steering + self.max_steering_change
                        else:
                            steering = self.prev_steering - self.max_steering_change

                    self.prev_steering = steering  # 현재 조향값 저장

                    # 조향각 제한 적용
                    self.ctrl_cmd_msg.steering = max(min(steering, self.max_steering), -self.max_steering)
                    self.ctrl_cmd_msg.velocity = 20.0  # 속도 설정
                    rospy.loginfo("🚗 Steering: {:.3f}, Velocity: {:.1f}".format(self.ctrl_cmd_msg.steering, self.ctrl_cmd_msg.velocity))
                else:
                    rospy.logwarn("⚠ No valid forward point found!")
                    self.ctrl_cmd_msg.steering = 0.0
                    self.ctrl_cmd_msg.velocity = 0.0

                # 제어 명령 전송
                self.ctrl_cmd_pub.publish(self.ctrl_cmd_msg)

            rate.sleep()

    def path_callback(self, msg):
        """ Global Path 데이터 수신 """
        self.is_path = True
        self.path = msg

    def odom_callback(self, msg):
        """ Odometry 데이터 수신 및 차량 위치 갱신 """
        self.is_odom = True
        odom_quaternion = (
            msg.pose.pose.orientation.x,
            msg.pose.pose.orientation.y,
            msg.pose.pose.orientation.z,
            msg.pose.pose.orientation.w,
        )
        (_, _, self.vehicle_yaw) = tf.transformations.euler_from_quaternion(odom_quaternion)
        self.current_position.x = msg.pose.pose.position.x
        self.current_position.y = msg.pose.pose.position.y

    def calc_pure_pursuit(self):
        """ Pure Pursuit 알고리즘 실행 """
        if not self.is_path:
            rospy.logwarn("⚠ Path data not available!")
            return 0.0

        vehicle_position = self.current_position
        self.is_look_forward_point = False

        translation = [vehicle_position.x, vehicle_position.y]

        # 🚗 차량 속도 기반 전방주시 거리 동적 조정
        vehicle_speed = abs(self.ctrl_cmd_msg.velocity)  # m/s
        self.lfd = max(self.lfd_base, min(vehicle_speed * 0.8, self.lfd_max))  # 최소 거리 유지, 최대 제한 적용

        # 좌표 변환 행렬 생성
        trans_matrix = np.array([
            [cos(self.vehicle_yaw), -sin(self.vehicle_yaw), translation[0]],
            [sin(self.vehicle_yaw), cos(self.vehicle_yaw), translation[1]],
            [0, 0, 1]
        ])
        det_trans_matrix = np.linalg.inv(trans_matrix)

        closest_dis = float('inf')
        for i in self.path.poses:
            path_point = i.pose.position
            global_path_point = np.array([path_point.x, path_point.y, 1])
            local_path_point = det_trans_matrix.dot(global_path_point)

            if local_path_point[0] > 0:  # 차량 앞쪽에 있는 점만 고려
                dis = sqrt(pow(local_path_point[0], 2) + pow(local_path_point[1], 2))

                # 가장 가까운 LFD보다 큰 거리 찾기
                if dis >= self.lfd and dis < closest_dis:
                    closest_dis = dis
                    self.forward_point = path_point
                    self.is_look_forward_point = True

        if self.is_look_forward_point:
            theta = atan2(self.forward_point.y - vehicle_position.y, self.forward_point.x - vehicle_position.x)
            alpha = theta - self.vehicle_yaw
            steering = atan2(2.0 * self.vehicle_length * sin(alpha), self.lfd)

            # 🎯 조향각 제한 적용
            return max(min(steering, self.max_steering), -self.max_steering)
        else:
            return 0.0


if __name__ == '__main__':
    try:
        PurePursuit()
    except rospy.ROSInterruptException:
        pass
