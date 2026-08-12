#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import rospy
from morai_msgs.msg import GPSMessage

# gps_data_listener 는 시뮬레이터에서 송신하는 gps 센서 정보를 Subscriber 하는 예제 입니다.
# gps 센서 정보인 /gps 라는 메세지를 Subscribe 합니다.

# 노드 실행 순서 
# 1. Callback 함수 생성 및 데이터 출력

#TODO: (1) Callback 함수 생성 및 데이터 출력
def gps_callback(data):
    os.system('clear')
    print("\n ------------------------------------ \n")
    rospy.loginfo("latitude: {}".format(data.latitude))  # GPS 위도 데이터 출력
    rospy.loginfo("longitude: {}".format(data.longitude))  # GPS 경도 데이터 출력
    rospy.loginfo("eastOffset: {}".format(data.eastOffset))  # 시뮬레이터 맵 좌표계의 offset 값 출력
    rospy.loginfo("northOffset: {}".format(data.northOffset))  # 시뮬레이터 맵 좌표계의 offset 값 출력
    
def listener():
    rospy.init_node('gps_data_listener', anonymous=True)
    rospy.Subscriber("/gps",GPSMessage,gps_callback)# IMU topic sub
    rospy.spin()

if __name__ == '__main__':
    listener()
