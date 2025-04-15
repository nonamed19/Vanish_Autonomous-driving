#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import numpy as np
import tf
import os
from pyproj import Proj  # 좌표 변환을 위한 pyproj 라이브러리
from std_msgs.msg import Float32MultiArray
from morai_msgs.msg import GPSMessage

# GPS 데이터를 UTM 좌표로 변환하는 노드
class LL2UTMConverter:
    def __init__(self, zone=52):
        rospy.Subscriber("/gps", GPSMessage, self.navsat_callback)
        self.x, self.y = None, None  # 변환된 UTM 좌표 저장

        # (1) 변환하고자 하는 좌표계를 선언
        '''
        GPS 센서에서 수신되는 위도, 경도 데이터를 UTM 좌표계로 변환하는 과정
        - WGS84 좌표계에서 **UTM Zone 52N**으로 변환
        - MORAI K-City 맵의 경우 52 Zone을 사용하며, 단위는 **미터(m)**
        '''
        self.proj_UTM = Proj(proj="utm", zone=zone, ellps="WGS84", preserve_units=False)

    # (2) 시뮬레이터에서 GPS 데이터를 받아오는 Callback 함수 생성
    def navsat_callback(self, gps_msg):
        '''
        - MORAI 시뮬레이터에서 GPS 데이터를 수신하여 위도(lat), 경도(lon) 저장
        - UTM 좌표로 변환 후 터미널에 출력
        '''
        self.lat = gps_msg.latitude  # 위도
        self.lon = gps_msg.longitude  # 경도

        # (3) 위도 경도를 UTM 좌표로 변환
        self.convertLL2UTM()

        # 변환된 UTM 좌표를 ROS 메시지로 발행
        utm_msg = Float32MultiArray()
        utm_msg.data = [self.x, self.y]

        # (4) 변환된 좌표 데이터 출력
        os.system('clear')  # 터미널 화면 클리어
        print("GPS 수신 데이터")
        print("   - 위도 (Latitude)  : {:.8f}".format(self.lat))
        print("   - 경도 (Longitude) : {:.8f}".format(self.lon))
        print("변환된 UTM 좌표")
        print("   - X (East)  : {:.2f} m".format(self.x))
        print("   - Y (North) : {:.2f} m".format(self.y))

    # (3) 위도 경도 데이터를 UTM 좌표로 변환
    def convertLL2UTM(self):
        '''
        - pyproj 라이브러리를 이용해 정의한 좌표 변환 변수를 사용하여 변환 수행
        - 결과 값으로 변환된 x, y 좌표를 저장
        '''
        xy_zone = self.proj_UTM(self.lon, self.lat)  # 경도, 위도 순서 주의!

        self.x = xy_zone[0]  # 동쪽 좌표 (East)
        self.y = xy_zone[1]  # 북쪽 좌표 (North)

# 메인 실행 로직
if __name__ == '__main__':
    rospy.init_node('gps_parser', anonymous=True)
    gps_parser = LL2UTMConverter()
    rospy.spin()  # 노드 실행 유지

