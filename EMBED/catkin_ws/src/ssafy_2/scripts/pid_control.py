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

        # Subscriber & Publisher 선언
        rospy.Subscriber("/local_path", Path, self.path_callback)
        rospy.Subscriber("/odom", Odometry, self.odom_callback)
        rospy.Subscriber("/Ego_topic", EgoVehicleStatus, self.status_callback)
        self.ctrl_cmd_pub = rospy.Publisher("/ctrl_cmd", CtrlCmd, queue_size=1)

        self.ctrl_cmd_msg = CtrlCmd()
        self.ctrl_cmd_msg.longlCmdType = 1

        self.is_path = False
        self.is_odom = False          
        self.is_status = False
        self.is_look_forward_point = False

        self.forward_point = Point()
        self.current_postion = Point()

        # Pure Pursuit 제어 파라미터
        self.vehicle_length = 2.6
        self.lfd = 5.0
        self.target_vel = 30.0

        # PID Controller 객체 생성
        self.pid = pidControl()

        rate = rospy.Rate(30) # 30Hz
        while not rospy.is_shutdown():
            if self.is_path and self.is_odom and self.is_status:
                # Pure Pursuit 알고리즘으로 조향각 계산
                steering = self.calc_pure_pursuit()
                if self.is_look_forward_point:
                    self.ctrl_cmd_msg.steering = steering
                else: 
                    rospy.logwarn("No valid forward point found!")
                    self.ctrl_cmd_msg.steering = 0.0

                # PID 제어를 이용한 가속 / 감속 계산
                output = self.pid.pid(self.target_vel, self.status_msg.velocity.x * 3.6)

                if output > 0.0:
                    self.ctrl_cmd_msg.accel = output
                    self.ctrl_cmd_msg.brake = 0.0
                else:
                    self.ctrl_cmd_msg.accel = 0.0
                    self.ctrl_cmd_msg.brake = -output

                # 제어 입력 메세지 Publish
                self.ctrl_cmd_pub.publish(self.ctrl_cmd_msg)
                
            rate.sleep()

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

    def calc_pure_pursuit(self): 
        vehicle_position = self.current_postion
        self.is_look_forward_point = False

        translation = [vehicle_position.x, vehicle_position.y]

        # 좌표 변환 행렬 생성
        trans_matrix = np.array([
            [cos(self.vehicle_yaw), -sin(self.vehicle_yaw), translation[0]],
            [sin(self.vehicle_yaw), cos(self.vehicle_yaw), translation[1]],
            [0, 0, 1]
        ])
        det_trans_matrix = np.linalg.inv(trans_matrix)

        for num, i in enumerate(self.path.poses):
            path_point = i.pose.position
            global_path_point = np.array([path_point.x, path_point.y, 1])
            local_path_point = det_trans_matrix.dot(global_path_point)

            if local_path_point[0] > 0:
                dis = sqrt(pow(local_path_point[0], 2) + pow(local_path_point[1], 2))
                if dis >= self.lfd:
                    self.forward_point = path_point
                    self.is_look_forward_point = True
                    break

        # 조향각 계산
        if self.is_look_forward_point:
            theta = atan2(self.forward_point.y - vehicle_position.y, self.forward_point.x - vehicle_position.x)
            alpha = theta - self.vehicle_yaw
            steering = atan2(2.0 * self.vehicle_length * sin(alpha),self.lfd)
            return steering
        else:
            return 0.0

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

        # P, I, D 제어 항 계산
        p_control = self.p_gain * error
        self.i_control += self.i_gain * error * self.controlTime
        d_control = self.d_gain * (error - self.prev_error) / self.controlTime

        # PID 출력 계산
        output = p_control + self.i_control + d_control
        self.prev_error = error

        return output


if __name__ == '__main__':
    try:
        test_track = pure_pursuit()
    except rospy.ROSInterruptException:
        pass
