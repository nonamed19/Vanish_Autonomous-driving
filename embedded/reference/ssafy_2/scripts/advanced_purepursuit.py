#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import rospkg
import math
from math import cos, sin, pi, sqrt, pow, atan2
from geometry_msgs.msg import Point, PoseWithCovarianceStamped
from nav_msgs.msg import Odometry, Path
from morai_msgs.msg import CtrlCmd, EgoVehicleStatus
import numpy as np
import tf
from tf.transformations import euler_from_quaternion, quaternion_from_euler


class SteeringPID:
    def __init__(self):
        # 사용자가 직접 튜닝
        self.p_gain = 0.25
        self.i_gain = 0.0
        self.d_gain = 0.015

        self.prev_error = 0.0
        self.i_control = 0.0
        self.control_time = 0.02  # 메인 루프가 30Hz면 약 0.033s

    def pid(self, desired_steer_rad, actual_steer_rad):
        """
        desired_steer_rad : Pure Pursuit(또는 Stanley)에서 계산한 '목표 조향각' (rad)
        actual_steer_rad  : 실제 차량의 현재 조향각 (rad)
        """
        error = desired_steer_rad - actual_steer_rad

        p_term = self.p_gain * error
        self.i_control += error * self.control_time
        i_term = self.i_gain * self.i_control
        d_term = self.d_gain * (error - self.prev_error) / self.control_time

        self.prev_error = error
        return p_term + i_term + d_term


class pure_pursuit:
    def __init__(self):
        rospy.init_node('pure_pursuit', anonymous=True)

        # (1) Subscriber, Publisher
        rospy.Subscriber("/global_path", Path, self.global_path_callback)
        rospy.Subscriber("/local_path", Path, self.path_callback)
        rospy.Subscriber("/odom", Odometry, self.odom_callback)
        rospy.Subscriber("/Ego_topic", EgoVehicleStatus, self.status_callback)

        self.ctrl_cmd_pub = rospy.Publisher("/ctrl_cmd", CtrlCmd, queue_size=10)

        # CtrlCmd 메시지
        self.ctrl_cmd_msg = CtrlCmd()
        self.ctrl_cmd_msg.longlCmdType = 1  # Throttle/Brake 제어

        # 상태 플래그
        self.is_path = False
        self.is_odom = False
        self.is_status = False
        self.is_global_path = False
        self.is_look_forward_point = False

        # 변수들
        self.forward_point = Point()
        self.current_postion = Point()

        self.vehicle_length = 2.6
        self.lfd = 8
        self.min_lfd = 5
        self.max_lfd = 30
        self.lfd_gain = 0.78
        self.target_velocity = 50  # km/h

        # 차량 자세
        self.vehicle_yaw = 0.0

        # (2) 종방향 PID, 곡률 기반 속도계획
        self.pid = pidControl()
        self.vel_planning = velocityPlanning(self.target_velocity / 3.6, 0.15)

        # (3) 추가: 조향 PID(핸들 부드럽게 제어)
        self.steering_pid = SteeringPID()

        # 글로벌 경로를 이용해 속도 계획
        while not rospy.is_shutdown():
            if self.is_global_path:
                self.velocity_list = self.vel_planning.curvedBaseVelocity(self.global_path, 50)
                break
            else:
                rospy.loginfo('Waiting global path data')
                rospy.sleep(0.5)

        rate = rospy.Rate(30)  # 30Hz
        while not rospy.is_shutdown():
            if self.is_path and self.is_odom and self.is_status:
                # 1) 곡률 기반 속도 계획에 따른 목표 속도
                self.current_waypoint = self.get_current_waypoint(self.status_msg, self.global_path)
                self.target_velocity = self.velocity_list[self.current_waypoint] * 3.6  # m/s -> km/h

                # 2) Pure Pursuit으로 목표 조향각 계산
                steering_pp = self.calc_pure_pursuit()  # (rad)

                # 3) 실제 차량 조향각 (deg -> rad 변환) ---------------
                wheel_angle_deg = self.status_msg.wheel_angle  # Morai에서 deg로 들어오는 경우
                wheel_angle_rad = wheel_angle_deg * (math.pi / 180.0)  # rad 변환

                # 4) 조향 PID로 최종 스티어링 값 생성
                final_steering = self.steering_pid.pid(steering_pp, wheel_angle_rad)

                # (선택) 조향 각도 제한: ±30도(=±0.5236 rad) 예시
                max_steer = 0.5236
                if final_steering > max_steer:
                    final_steering = max_steer
                elif final_steering < -max_steer:
                    final_steering = -max_steer

                # 만약 forward_point 자체를 못찾으면(코스 이탈 등) -> 0 세팅
                if not self.is_look_forward_point:
                    rospy.loginfo("no found forward point")
                    final_steering = 0.0

                # 5) 종방향 PID (Throttle/Brake)
                speed_out = self.pid.pid(self.target_velocity, self.status_msg.velocity.x * 3.6)
                if speed_out > 0.0:
                    self.ctrl_cmd_msg.accel = speed_out
                    self.ctrl_cmd_msg.brake = 0.0
                else:
                    self.ctrl_cmd_msg.accel = 0.0
                    self.ctrl_cmd_msg.brake = -speed_out

                # 6) 메시지에 스티어링 적용 후 publish
                self.ctrl_cmd_msg.steering = final_steering
                self.ctrl_cmd_pub.publish(self.ctrl_cmd_msg)

            rate.sleep()

    # ----------------------- 콜백들 -----------------------
    def path_callback(self, msg):
        self.is_path = True
        self.path = msg

    def odom_callback(self, msg):
        self.is_odom = True
        odom_quaternion = (msg.pose.pose.orientation.x,
                           msg.pose.pose.orientation.y,
                           msg.pose.pose.orientation.z,
                           msg.pose.pose.orientation.w)
        _, _, self.vehicle_yaw = euler_from_quaternion(odom_quaternion)
        self.current_postion.x = msg.pose.pose.position.x
        self.current_postion.y = msg.pose.pose.position.y

    def status_callback(self, msg):
        self.is_status = True
        self.status_msg = msg

    def global_path_callback(self, msg):
        self.global_path = msg
        self.is_global_path = True

    # ----------------------- Pure Pursuit 계산부 -----------------------
    def get_current_waypoint(self, ego_status, global_path):
        min_dist = float('inf')
        current_waypoint = -1
        for i, pose in enumerate(global_path.poses):
            dx = ego_status.position.x - pose.pose.position.x
            dy = ego_status.position.y - pose.pose.position.y
            dist = sqrt(pow(dx, 2) + pow(dy, 2))
            if dist < min_dist:
                min_dist = dist
                current_waypoint = i
        return current_waypoint

    def calc_pure_pursuit(self):
        # 1) 속도에 따른 LfD(전방주시거리) 조정
        vehicle_speed = abs(self.ctrl_cmd_msg.velocity)  # m/s 단위(또는 status_msg.velocity.x)
        self.lfd = max(self.min_lfd, min(vehicle_speed * self.lfd_gain, self.max_lfd))

        # 2) 차량 위치, 변환행렬
        self.is_look_forward_point = False
        vehicle_position = self.current_postion
        trans_matrix = np.array([
            [cos(self.vehicle_yaw), -sin(self.vehicle_yaw), vehicle_position.x],
            [sin(self.vehicle_yaw),  cos(self.vehicle_yaw), vehicle_position.y],
            [0, 0, 1]
        ])
        det_trans_matrix = np.linalg.inv(trans_matrix)

        # 3) 경로를 로컬 좌표로 변환하며 LfD 이상 떨어진 점 찾기
        for i, pose_stamped in enumerate(self.path.poses):
            path_point = pose_stamped.pose.position
            global_point = np.array([path_point.x, path_point.y, 1.0])
            local_point = det_trans_matrix.dot(global_point)
            if local_point[0] > 0:
                dist = sqrt(pow(local_point[0], 2) + pow(local_point[1], 2))
                if dist >= self.lfd:
                    self.forward_point = path_point
                    self.is_look_forward_point = True
                    break

        # 전방 주시점을 찾지 못하면 0
        if not self.is_look_forward_point:
            return 0.0

        # 4) Pure Pursuit 각도 계산
        theta = atan2(self.forward_point.y - vehicle_position.y,
                      self.forward_point.x - vehicle_position.x)
        alpha = theta - self.vehicle_yaw
        steering = atan2(2.0 * self.vehicle_length * sin(alpha), self.lfd)
        return steering


# ----------------------- 종방향 PID -----------------------
class pidControl:
    def __init__(self):
        self.p_gain = 0.3
        self.i_gain = 0.00
        self.d_gain = 0.03
        self.prev_error = 0
        self.i_control = 0
        self.controlTime = 0.02

    def pid(self, target_vel, current_vel):
        error = target_vel - current_vel
        p_control = self.p_gain * error
        self.i_control += error * self.controlTime
        i_term = self.i_gain * self.i_control
        d_term = self.d_gain * (error - self.prev_error) / self.controlTime
        output = p_control + i_term + d_term
        self.prev_error = error
        return output


# ----------------------- 곡률 기반 속도계획 -----------------------
class velocityPlanning:
    def __init__(self, car_max_speed, road_friciton):
        self.car_max_speed = car_max_speed
        self.road_friction = road_friciton

    def curvedBaseVelocity(self, global_path, point_num):
        out_vel_plan = []

        # (초기 point_num 구간 일정속도)
        for i in range(point_num):
            out_vel_plan.append(self.car_max_speed)

        # (곡률 기반 계산)
        for i in range(point_num, len(global_path.poses) - point_num):
            x_list = []
            y_list = []
            for box in range(-point_num, point_num):
                x = global_path.poses[i + box].pose.position.x
                y = global_path.poses[i + box].pose.position.y
                x_list.append([-2 * x, -2 * y, 1])
                y_list.append(-(x ** 2 + y ** 2))
            A = np.array(x_list)
            B = np.array(y_list)
            X = np.linalg.lstsq(A, B, rcond=None)[0]
            r = np.sqrt(X[0] ** 2 + X[1] ** 2 - X[2])

            # v_max = sqrt(r*g*마찰)
            v_max = math.sqrt(r * 9.81 * self.road_friction)
            if v_max > self.car_max_speed:
                v_max = self.car_max_speed
            out_vel_plan.append(v_max)

        # 마지막 일부
        for i in range(len(global_path.poses) - point_num, len(global_path.poses) - 10):
            out_vel_plan.append(30)
        for i in range(len(global_path.poses) - 10, len(global_path.poses)):
            out_vel_plan.append(0)
        return out_vel_plan


if __name__ == '__main__':
    try:
        test_track = pure_pursuit()
    except rospy.ROSInterruptException:
        pass
