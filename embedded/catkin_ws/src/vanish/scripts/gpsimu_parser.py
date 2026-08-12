#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import tf
import os
from std_msgs.msg import Float32MultiArray
from sensor_msgs.msg import Imu
from morai_msgs.msg import GPSMessage
from nav_msgs.msg import Odometry
from pyproj import Proj
from math import pi

# GPS 및 IMU 데이터를 사용하여 차량의 상대 위치를 추정하는 예제
class GPSIMUParser:
    def __init__(self):
        rospy.init_node('GPS_IMU_parser', anonymous=True)
        self.gps_sub = rospy.Subscriber("/gps", GPSMessage, self.navsat_callback)
        self.imu_sub = rospy.Subscriber("/imu", Imu, self.imu_callback)
        self.odom_pub = rospy.Publisher('/odom', Odometry, queue_size=1)

        # 초기화
        self.x, self.y = None, None
        self.is_imu = False
        self.is_gps = False

        # (1) 변환 하고자 하는 좌표계 선언
        self.proj_UTM = Proj(proj="utm", zone=52, ellps="WGS84", preserve_units=False)

        # (2) 송신 될 Odometry 메시지 변수 생성
        self.odom_msg = Odometry()
        self.odom_msg.header.frame_id = "odom"
        self.odom_msg.child_frame_id = "base_link"

        rate = rospy.Rate(30)  # 30Hz
        while not rospy.is_shutdown():
            if self.is_imu and self.is_gps:
                self.convertLL2UTM()
                self.odom_pub.publish(self.odom_msg)
                os.system('clear')
                print("ROS Odometry Msgs Pose")
                print(self.odom_msg.pose.pose.position)
                print("ROS Odometry Msgs Orientation")
                print(self.odom_msg.pose.pose.orientation)
                rate.sleep()

    # (3) GPS 데이터 변환 및 저장
    def navsat_callback(self, gps_msg):
        self.lat = gps_msg.latitude
        self.lon = gps_msg.longitude
        self.e_o = gps_msg.eastOffset
        self.n_o = gps_msg.northOffset
        self.is_gps = True

    # (3) 위도/경도 데이터를 UTM 좌표로 변환
    def convertLL2UTM(self):
        if self.lon == 0 and self.lat == 0:
            self.x = 0.0
            self.y = 0.0
        else:
            xy_zone = self.proj_UTM(self.lon, self.lat)
            self.x = xy_zone[0] - self.e_o
            self.y = xy_zone[1] - self.n_o

        # (4) 변환된 좌표 데이터를 Odometry 메시지에 저장
        self.odom_msg.header.stamp = rospy.get_rostime()
        self.odom_msg.pose.pose.position.x = self.x
        self.odom_msg.pose.pose.position.y = self.y
        self.odom_msg.pose.pose.position.z = 0.0  # 고도는 0으로 설정

    # (4) IMU 데이터를 Odometry 메시지에 반영
    def imu_callback(self, data):
        if data.orientation.w == 0:
            self.odom_msg.pose.pose.orientation.x = 0.0
            self.odom_msg.pose.pose.orientation.y = 0.0
            self.odom_msg.pose.pose.orientation.z = 0.0
            self.odom_msg.pose.pose.orientation.w = 1.0
        else:
            self.odom_msg.pose.pose.orientation.x = data.orientation.x
            self.odom_msg.pose.pose.orientation.y = data.orientation.y
            self.odom_msg.pose.pose.orientation.z = data.orientation.z
            self.odom_msg.pose.pose.orientation.w = data.orientation.w
        self.is_imu = True

if __name__ == '__main__':
    try:
        GPS_IMU_parser = GPSIMUParser()
    except rospy.ROSInterruptException:
        pass
