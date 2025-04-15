#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import os
from std_msgs.msg import Float32MultiArray
from morai_msgs.msg import GPSMessage
from pyproj import Proj, transform
from math import pi
import pika
import json
from datetime import datetime


# GPS 및 IMU 데이터를 사용하여 차량의 상대 위치를 추정하는 예제
class GPStoServer:
    def __init__(self):
        rospy.init_node('gps_to_server', anonymous=True)
        self.gps_sub = rospy.Subscriber("/gps", GPSMessage, self.gps_callback)

        # 초기화
        self.lat, self.lon = None, None
        self.is_gps = False


        rate = rospy.Rate(10) 
        while not rospy.is_shutdown():
            if self.is_gps:
                self.send_server()
                self.is_gps = False 
            rate.sleep()

    # (3) GPS 데이터 변환 및 저장
    def gps_callback(self, gps_msg):
        self.lat = gps_msg.latitude
        self.lon = gps_msg.longitude
        self.is_gps = True
        
    def convert_real(self,):
        wgs84_proj = Proj(proj="latlong", datum="WGS84")
        custom_point_proj = Proj(proj="utm", zone=52, datum="WGS84", units="m", south=False)
        
        reference_lat = 37.515
        reference_lon = 126.563
        
        reference_easting, reference_northing = transform(wgs84_proj, custom_point_proj, reference_lon, reference_lat)
        
        lon, lat = transform(custom_point_proj, wgs84_proj, self.lat + reference_easting, self.lon + reference_northing)
        return [lon, lat]

    def send_server(self):
    # 실 좌표 변환
        lon, lat = self.convert_real()

        # 현재 시간 ISO-8601 포맷으로 변환
        timestamp = datetime.utcnow().replace(microsecond=0).isoformat() #+ "Z"
        # 보낼 데이터 구성
        data = {
            "vehicleVin": "KMHEL13CPYA000001",  # 실제 차대번호로 변경
            "latitude": self.lat + 0.2856728146,
            "longitude": self.lon - 0.210318416,
            "timestamp": timestamp
        }

        try:
            # RabbitMQ 연결 정보
            credentials = pika.PlainCredentials('guest', 'guest')
            parameters = pika.ConnectionParameters(
                host='j12a707.p.ssafy.io',
                port=3001,
                credentials=credentials
            )
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()

            # fanout 타입의 Exchange 선언 (durable은 유지 여부 설정)
            channel.exchange_declare(exchange='ros_exchange', exchange_type='direct', durable=True)

            # 메시지 전송 (fanout: routing_key는 빈 문자열)
            channel.basic_publish(
                exchange='ros_exchange',
                routing_key='vehicle.location',
                body=json.dumps(data)
            )
            rospy.loginfo(" [x] Sent to RabbitMQ:", data)
            print(data)

            # 연결 종료
            connection.close()
        except Exception as e:
            rospy.loginfo("Failed to send to RabbitMQ: {}".format(e))
        

if __name__ == '__main__':
    try:
        GPS_to_Server = GPStoServer()
    except rospy.ROSInterruptException:
        pass
