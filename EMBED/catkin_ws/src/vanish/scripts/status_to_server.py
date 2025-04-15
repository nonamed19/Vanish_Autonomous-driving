#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import os
import math
from morai_msgs.srv import MoraiEventCmdSrv
from morai_msgs.msg import EventInfo, EgoVehicleStatus
from pyproj import Proj, transform
import pika
import json
from datetime import datetime

class StatustoServer:
    def __init__(self):
        rospy.init_node('status_to_server', anonymous=True)
        
        # MoraiEventCmd 서비스 연결 대기
        rospy.wait_for_service('/Service_MoraiEventCmd')
        self.event_cmd_srv = rospy.ServiceProxy('/Service_MoraiEventCmd', MoraiEventCmdSrv)

        # EgoVehicleStatus 구독
        rospy.Subscriber('/Ego_topic', EgoVehicleStatus, self.status_callback)
        
        # 기어 상태 및 속도 상태 저장용
        self.gear_status = None
        self.vel_status = None  # 단위: km/h

        rate = rospy.Rate(1)  # 초당 5회 실행
        while not rospy.is_shutdown():
            self.get_gear_status()   # 기어 상태 업데이트
            self.send_to_server()    # 서버 전송
            rate.sleep()

    def get_gear_status(self):
        """
        기어 상태 조회 함수
        MoraiEventCmdSrv를 이용하여 차량의 현재 기어를 확인합니다.
        """
        gear_cmd = EventInfo()
        gear_cmd.option = 2
        gear_cmd.ctrl_mode = 3
        gear_cmd.gear = -1  # 현재 기어 상태를 얻기 위해 -1 (Query)로 설정
        gear_cmd_resp = self.event_cmd_srv(gear_cmd)
        
        self.gear_status = gear_cmd_resp.response.gear  # ex) 1이면 Park, 2이면 Drive 등

    def status_callback(self, msg):
        """
        EgoVehicleStatus 콜백 함수.
        차량의 속도(velocity.x, y, z)를 이용해 속도를 m/s로 계산하고,
        그 값을 km/h로 변환하여 self.vel_status에 저장.
        """
        # velocity.x, velocity.y, velocity.z (단위: m/s)
        vx = msg.velocity.x
        vy = msg.velocity.y
        vz = msg.velocity.z

        # 속력(스칼라) 계산 (m/s)
        speed_m_s = math.sqrt(vx**2 + vy**2 + vz**2)

        # km/h로 변환
        speed_km_h = speed_m_s * 3.6
        
        self.vel_status = speed_km_h

    def send_to_server(self):
        """
        1. 기어 상태와 속도 확인
        2. RabbitMQ 서버로 데이터 전송
        """
        if self.gear_status is None:
            rospy.logwarn("기어 상태가 아직 설정되지 않았습니다.")
            return
        
        # 속도가 아직 콜백에서 업데이트되지 않았으면 경고
        if self.vel_status is None:
            rospy.logwarn("속도 정보가 아직 업데이트되지 않았습니다.")
            return

        gear = self.gear_status
        # Park(주차) 여부 - 시스템마다 정의가 다르지만 보통 1이 Park라 가정
        is_parked = (gear == 1)
        engine_status = "ON"

        # 현재 UTC 시간 (ISO 포맷)
        timestamp = datetime.utcnow().replace(microsecond=0).isoformat()

        data = {
            "vehicleVin": "KMHEL13CPYA000001",         # 예시용 차량 식별
            "isParked": is_parked,
            "engineStatus": engine_status,
            "speedKmh": round(self.vel_status, 0),  # 소수점 2자리 표시
            "timestamp": timestamp
        }

        # 콘솔 출력
        print("[INFO] Send data:", data)

        # RabbitMQ 전송
        try:
            credentials = pika.PlainCredentials('guest', 'guest')
            parameters = pika.ConnectionParameters(
                host='j12a707.p.ssafy.io',  # 사용 환경에 맞게 수정
                port=3001,
                credentials=credentials
            )
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()

            # Exchange 선언 (direct 타입 사용, durable 유지)
            channel.exchange_declare(
                exchange='ros_exchange',
                exchange_type='direct',
                durable=True
            )

            # 메시지 전송 (routing_key='vehicle.status')
            channel.basic_publish(
                exchange='ros_exchange',
                routing_key='vehicle.status',
                body=json.dumps(data)
            )
            rospy.loginfo("[x] Sent to RabbitMQ: {}".format(data))

            connection.close()
        except Exception as e:
            rospy.logerr("Failed to send to RabbitMQ: {}".format(e))


if __name__ == '__main__':
    try:
        Status_to_Server = StatustoServer()
    except rospy.ROSInterruptException:
        pass
