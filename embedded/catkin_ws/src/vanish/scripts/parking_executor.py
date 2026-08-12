#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import requests
from std_msgs.msg import String
from morai_msgs.msg import CtrlCmd
from datetime import datetime
from morai_msgs.srv import MoraiEventCmdSrv
from morai_msgs.msg import EventInfo

vin = "KMHEL13CPYA000001"

class ParkingExecutor:
    def __init__(self):
        rospy.init_node('parking_executor')

        # 주차 트리거 수신
        rospy.Subscriber("/parking_trigger", String, self.trigger_callback)
        
        
        rospy.wait_for_service('/Service_MoraiEventCmd')
        self.event_cmd_srv = rospy.ServiceProxy('/Service_MoraiEventCmd', MoraiEventCmdSrv)

        # 제어 명령 퍼블리셔
        
        self.ctrl_cmd_pub = rospy.Publisher("/ctrl_cmd", CtrlCmd, queue_size=10)

        # CtrlCmd 기본값 설정
        self.ctrl_cmd = CtrlCmd()
        self.ctrl_cmd.longlCmdType = 1  # 1: Throttle/Brake 모드

        self.is_parking = False
        self.parking_start_time = rospy.Time.now()
        
        rospy.loginfo(" ParkingExecutor with /ctrl_cmd ready.")
        self.run()
        
    def get_gear_status(self,gear):
        
        gear_cmd= EventInfo()
        gear_cmd.option = 2
        gear_cmd.ctrl_mode = 3
        gear_cmd.gear = gear
        gear_cmd_resp = self.event_cmd_srv(gear_cmd)

    def trigger_callback(self, msg):
        """
        /parking_trigger 토픽에서 'start' 문자열이 오면
        1) 주차 동작 시작
        2) 서버에 'parking-start' POST 요청 전송
        """
        if msg.data == "start":
            rospy.loginfo(" 주차 트리거 수신 → 주차 시작")
            self.is_parking = True
            self.parking_start_time = rospy.Time.now()
            print(self.parking_start_time)

            # (1) 서버에 POST 요청 보내기
            #self.send_parking_start_request()

    def send_parking_start_request(self):
        """
        주차를 시작한 시점을 서버에 알리는 POST 요청을 보냅니다.
        예시 URL, 토큰 등을 자신의 환경에 맞춰 수정하세요.
        """
        # 서버 URL (본인 환경에 맞춰 수정)
        url = "https://j12a707.p.ssafy.io/internal/parking-start"

        # Bearer 토큰 (본인 환경에 맞춰 수정)
        #access_token = "YOUR_ACCESS_TOKEN_HERE"

        # 헤더 설정
        headers = {
            #"Authorization": "Bearer {}".format(access_token),
            "Content-Type": "application/json"
        }

        # ISO-8601 형식의 parkingStart 시간 (UTC 기준, Z 표기)
        parking_start_time_str = datetime.utcnow().replace(microsecond=0).isoformat() #+ "Z"
        #print(parking_start_time_str)
        #print(parking_start_time_str)
        # POST 요청에 실을 JSON 데이터
        data = {
            "vehicleVin": vin,#"ABCDE12WXYZ123456",
            "parkingStart": parking_start_time_str
        }

        try:
            response = requests.post(url, headers=headers, json=data, timeout=5)
            if response.status_code == 200:
                #rospy.loginfo(" 서버에 주차 시작 정보 전달 완료: %s", response.text)
                rospy.loginfo(" 서버에 주차 시작 정보 전달 완료: ", )
            else:
                rospy.loginfo(" 서버 응답 에러 (status %d): ", response.status_code)
                print(response.text)
                #rospy.loginfo(" 서버 응답 에러 (status %d): %s", response.status_code, response.text)
        except Exception as e:
            #rospy.loginfo("❌ 서버 전송 실패: %s", str(e))
            rospy.loginfo("❌ 서버 전송 실패: ")
            
    def send_parking_pay_request(self):
        """
        주차를 시작한 시점을 서버에 알리는 POST 요청을 보냅니다.
        예시 URL, 토큰 등을 자신의 환경에 맞춰 수정하세요.
        """
        # 서버 URL (본인 환경에 맞춰 수정)
        url = "https://j12a707.p.ssafy.io/api/v1/notifications/parking-complete?vehicleVin={}".format(vin)


        # 헤더 설정
        headers = {
            "Content-Type": "application/json"
        }

        # POST 요청에 실을 JSON 데이터
        data = {
            "parkingLotId": 19
        }

        try:
            response = requests.post(url, headers=headers, json=data, timeout=5)
            if response.status_code == 200:
                #rospy.loginfo("✅ 서버에 주차 시작 정보 전달 완료: %s", response.text)
                rospy.loginfo("✅ 서버에 주차 alram 정보 전달 완료: ", )
            else:
                rospy.loginfo("❌ 서버 응답 에러 (status %d): ", response.status_code)
                print(response.text)
                #rospy.loginfo("❌ 서버 응답 에러 (status %d): %s", response.status_code, response.text)
        except Exception as e:
            #rospy.loginfo("❌ 서버 전송 실패: %s", str(e))
            rospy.loginfo("❌ 서버 전송 실패: ")


    def run(self):
        rate = rospy.Rate(5)  # 30Hz

        while not rospy.is_shutdown():
            if self.is_parking:
                elapsed = (rospy.Time.now() - self.parking_start_time).to_sec()
                self.get_gear_status(4)
                # 0 ~ 3.75초: 오른쪽 조향 전진
                if elapsed < 3.5:
                    self.ctrl_cmd.steering = -0.8   # 우회전
                    self.ctrl_cmd.accel = 0.3
                    self.ctrl_cmd.brake = 0.0

                # 3.75 ~ 5.75초: 왼쪽 조향 전진
                elif elapsed < 5.5:
                    self.ctrl_cmd.steering = 0.8    # 좌회전
                    self.ctrl_cmd.accel = 0.3
                    self.ctrl_cmd.brake = 0.0

                # 5.75초 이후: 정지
                else :
                    rospy.loginfo(" 주차 동작 완료")
                    self.ctrl_cmd.steering = 0.0
                    self.ctrl_cmd.accel = 0.0
                    self.ctrl_cmd.brake = 1.0
                    self.is_parking = False  # 주차 동작 종료
                    self.get_gear_status(1)
                    self.send_parking_start_request()
                    self.send_parking_pay_request()
                # 제어 명령 퍼블리시
                self.ctrl_cmd_pub.publish(self.ctrl_cmd)
            rate.sleep()


if __name__ == '__main__':
    try:
        ParkingExecutor()
    except rospy.ROSInterruptException:
        pass
