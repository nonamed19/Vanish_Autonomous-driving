#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import rospy
from sensor_msgs.msg import Imu

# imu_data_listener 는 시뮬레이터에서 송신하는 IMU 센서 정보를 Subscriber 하는 예제 입니다.
# IMU 센서 정보인 /imu 라는 메세지를 Subscribe 합니다.

# 노드 실행 순서 
# 1. Callback 함수 생성 및 데이터 출력

#TODO: (1) Callback 함수 생성 및 데이터 출력
def imu_callback(msg):
    os.system('clear')  # 터미널 화면 정리
    rospy.loginfo('------------------ IMU Sensor Status ------------------')
    
    # Orientation 데이터 출력
    rospy.loginfo("orientation:")
    rospy.loginfo("x : {} y : {} z : {} w : {}".format(msg.orientation.x, msg.orientation.y, msg.orientation.z, msg.orientation.w))

    # Angular Velocity 데이터 출력
    rospy.loginfo("angular_velocity:")
    rospy.loginfo("x : {} y : {} z : {}".format(msg.angular_velocity.x, msg.angular_velocity.y, msg.angular_velocity.z))

    # Linear Acceleration 데이터 출력
    rospy.loginfo("linear_acceleration:")
    rospy.loginfo("x : {} y : {} z : {}".format(msg.linear_acceleration.x, msg.linear_acceleration.y, msg.linear_acceleration.z))

def listener():
    rospy.init_node('imu_data_listener', anonymous=True) # node init
    rospy.Subscriber("imu",Imu,imu_callback)# IMU topic sub
    rospy.spin()

if __name__ == '__main__':
    listener()
