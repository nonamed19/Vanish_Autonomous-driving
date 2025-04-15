#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import rospkg
from math import cos, sin, pi, sqrt, pow, atan2
from geometry_msgs.msg import Point, PoseWithCovarianceStamped
from nav_msgs.msg import Odometry, Path
from morai_msgs.msg import CtrlCmd, EgoVehicleStatus
import numpy as np
import tf
from tf.transformations import euler_from_quaternion, quaternion_from_euler

class pure_pursuit:
    def __init__(self):
        rospy.init_node('pure_pursuit', anonymous=True)

        rospy.Subscriber("/global_path", Path, self.global_path_callback)
        rospy.Subscriber("/local_path", Path, self.path_callback)
        rospy.Subscriber("/odom", Odometry, self.odom_callback)
        rospy.Subscriber("/Ego_topic", EgoVehicleStatus, self.status_callback)
        
        self.ctrl_cmd_pub = rospy.Publisher("/ctrl_cmd", CtrlCmd, queue_size=1)
        
        self.ctrl_cmd_msg = CtrlCmd()
        self.ctrl_cmd_msg.longlCmdType = 1
        
        self.is_path = False
        self.is_odom = False
        self.is_status = False
        self.is_global_path = False
        
        self.is_look_forward_point = False

        self.forward_point = Point()
        self.current_position = Point()

        self.vehicle_length = 1.5
        self.lfd = 5
        self.target_velocity = 60

        self.pid = pidControl()
        self.vel_planning = velocityPlanning(self.target_velocity / 3.6, 0.15)
        
        while not self.is_global_path:
            rospy.loginfo('Waiting for global path data')
            rospy.sleep(1)
        
        self.velocity_list = self.vel_planning.curvedBaseVelocity(self.global_path, 50)
        
        rate = rospy.Rate(30)
        while not rospy.is_shutdown():
            if self.is_path and self.is_odom and self.is_status:
                self.current_waypoint = self.get_current_waypoint(self.status_msg, self.global_path)
                self.target_velocity = self.velocity_list[self.current_waypoint] * 3.6
                
                steering = self.calc_pure_pursuit()
                if self.is_look_forward_point:
                    self.ctrl_cmd_msg.steering = steering
                else:
                    self.ctrl_cmd_msg.steering = 0.0

                output = self.pid.pid(self.target_velocity, self.status_msg.velocity.x * 3.6)
                
                if output > 0.0:
                    self.ctrl_cmd_msg.accel = output
                    self.ctrl_cmd_msg.brake = 0.0
                else:
                    self.ctrl_cmd_msg.accel = 0.0
                    self.ctrl_cmd_msg.brake = -output
                
                self.ctrl_cmd_pub.publish(self.ctrl_cmd_msg)
            
            rate.sleep()

    def path_callback(self, msg):
        self.is_path = True
        self.path = msg  

    def odom_callback(self, msg):
        self.is_odom = True
        odom_quaternion = (msg.pose.pose.orientation.x, msg.pose.pose.orientation.y, msg.pose.pose.orientation.z, msg.pose.pose.orientation.w)
        _, _, self.vehicle_yaw = euler_from_quaternion(odom_quaternion)
        self.current_position.x = msg.pose.pose.position.x
        self.current_position.y = msg.pose.pose.position.y

    def status_callback(self, msg):
        self.is_status = True
        self.status_msg = msg    
        
    def global_path_callback(self, msg):
        self.global_path = msg
        self.is_global_path = True
    
    def get_current_waypoint(self, ego_status, global_path):
        min_dist = float('inf')        
        current_waypoint = -1
        for i, pose in enumerate(global_path.poses):
            dx = ego_status.position.x - pose.pose.position.x
            dy = ego_status.position.y - pose.pose.position.y
            dist = sqrt(pow(dx, 2) + pow(dy, 2))
            if min_dist > dist:
                min_dist = dist
                current_waypoint = i
        return current_waypoint

    def calc_pure_pursuit(self):
        vehicle_position = self.current_position
        self.is_look_forward_point = False

        trans_matrix = np.array([[cos(self.vehicle_yaw), -sin(self.vehicle_yaw), vehicle_position.x],
                                [sin(self.vehicle_yaw), cos(self.vehicle_yaw), vehicle_position.y],
                                [0, 0, 1]])
        det_trans_matrix = np.linalg.inv(trans_matrix)

        for i in self.path.poses:
            path_point = i.pose.position
            global_path_point = np.array([path_point.x, path_point.y, 1])
            local_path_point = det_trans_matrix.dot(global_path_point)

            if local_path_point[0] > 0:  # 전방에 있는 점만 고려
                dis = sqrt(local_path_point[0]**2 + local_path_point[1]**2)
                if dis >= self.lfd:
                    self.forward_point = path_point
                    self.is_look_forward_point = True
                    break

        if not self.is_look_forward_point:
            self.lfd = min(self.lfd + 0.5, 15)  # LFD 증가 제한

        theta = atan2(self.forward_point.y - self.current_position.y, 
                    self.forward_point.x - self.current_position.x) - self.vehicle_yaw
        steering = atan2((2 * self.vehicle_length * sin(theta)), self.lfd)

        # 최대 조향각 제한
        max_steering_angle = pi / 4  # 45도 제한
        steering = max(-max_steering_angle, min(steering, max_steering_angle))

        # rospy.loginfo("Steering Angle: {}, Theta: {}".format(steering, theta))


        return steering



class pidControl:
    def __init__(self):
        self.p_gain = 0.3
        self.i_gain = 0.00
        self.d_gain = 0.03
        self.prev_error = 0
        self.i_control = 0
        self.controlTime = 0.02

    def pid(self,target_vel, current_vel):
        error = target_vel - current_vel

        #TODO: (5) PID 제어 생성
        '''
        # 종방향 제어를 위한 PID 제어기는 현재 속도와 목표 속도 간 차이를 측정하여 Accel/Brake 값을 결정 합니다.
        # 각 PID 제어를 위한 Gain 값은 "class pidContorl" 에 정의 되어 있습니다.
        # 각 PID Gain 값을 직접 튜닝하고 아래 수식을 채워 넣어 P I D 제어기를 완성하세요.
        '''
        p_control = self.p_gain * error
        self.i_control += error * self.controlTime
        i_control_term = self.i_gain * self.i_control
        d_control = self.d_gain*(error - self.prev_error)/self.controlTime

        output = p_control + i_control_term + d_control
        self.prev_error = error

        return output

class velocityPlanning:
    def __init__ (self, car_max_speed, road_friciton):
        self.car_max_speed = car_max_speed
        self.road_friction = road_friciton

    def curvedBaseVelocity(self, global_path, point_num):
        out_vel_plan = []

        # 초기 point_num 구간은 일정 속도로 설정
        for i in range(point_num):
            out_vel_plan.append(self.car_max_speed)

        # 곡률 계산 범위: [point_num, len(global_path.poses) - point_num)
        for i in range(point_num, len(global_path.poses) - point_num):
            x_list = []
            y_list = []
            # 곡률 계산을 위해 [i - point_num, i + point_num) 구간을 샘플링
            for box in range(-point_num, point_num):
                x = global_path.poses[i+box].pose.position.x
                y = global_path.poses[i+box].pose.position.y
                # (x-a)^2 + (y-b)^2 = r^2  형태의 행렬 (수업 교재 예시)
                x_list.append([-2*x, -2*y, 1])         # [-2a, -2b, c] 부분
                y_list.append((-x*x) - (y*y))         # -(x^2 + y^2)

            # (5) 도로의 곡률 계산 ( 최소 자승법 / Pseudo-Inverse )
            A = np.array(x_list)
            B = np.array(y_list)
            # A X = B  → X = (A^T A)^-1 A^T B
            X = np.linalg.lstsq(A, B, rcond=None)[0]
            # X[0], X[1], X[2] = a, b, c
            # r = sqrt(a^2 + b^2 - c)
            r = np.sqrt(X[0]**2 + X[1]**2 - X[2])

            # (6) 곡률 기반 속도 계획
            # v_max = sqrt(r * g * road_friction)
            #  g = 9.81 (중력가속도)
            v_max = np.sqrt(r * 9.81 * self.road_friction)

            # 차량 최대속도(car_max_speed) 제한
            if v_max > self.car_max_speed:
                v_max = self.car_max_speed

            out_vel_plan.append(v_max)

        # 마지막에서 point_num ~ len(global_path.poses)-10 구간은 30 (m/s) 세팅 (예시)
        for i in range(len(global_path.poses) - point_num, len(global_path.poses) - 10):
            out_vel_plan.append(30)

        # 종점 10개 구간은 0 (정지)
        for i in range(len(global_path.poses) - 10, len(global_path.poses)):
            out_vel_plan.append(0)

        return out_vel_plan

if __name__ == '__main__':
    try:
        pure_pursuit()
    except rospy.ROSInterruptException:
        pass

