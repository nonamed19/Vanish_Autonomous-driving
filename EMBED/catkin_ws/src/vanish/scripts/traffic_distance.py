#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import rospy
from math import sqrt
from std_msgs.msg import Int32
from nav_msgs.msg import Odometry
from morai_msgs.msg import GetTrafficLightStatus

# MGeo 관련 모듈 경로 설정
current_path = os.path.dirname(os.path.realpath(__file__))
sys.path.append(current_path)
from lib.mgeo.class_defs import MGeo

class TrafficDecision:
    def __init__(self):
        rospy.init_node('traffic_info_node', anonymous=True)

        self.current_position = None
        self.distance_threshold = 20  # 신호등 거리 제한 (m)
        self.lights = {}
        self.latest_signal = None
        self.last_signal_time = rospy.Time(0)  # 마지막 신호 수신 시간 초기화

        # Subscriber
        rospy.Subscriber('/odom', Odometry, self.odom_callback)
        rospy.Subscriber('/GetTrafficLightStatus', GetTrafficLightStatus, self.traffic_light_callback)
        rospy.Subscriber('/way', Int32, self.way_callback)

        # Publisher
        self.pub_go_decision = rospy.Publisher('/go_decision', Int32, queue_size=10)

        # MGeo 데이터 로드
        load_path = os.path.normpath(os.path.join(current_path, 'lib/mgeo_data/R_KR_PG_K-City'))
        mgeo_map = MGeo.create_instance_from_json(load_path)

        self.light_set = mgeo_map.light_set
        self.lights = getattr(self.light_set, 'signals', None)
        if self.lights is None:
            rospy.logerr("MGeo 데이터에서 신호등 정보를 찾을 수 없습니다.")
            sys.exit(1)

        if isinstance(self.lights, list):
            self.lights = dict((light.id, light) for light in self.lights)

        rospy.loginfo(" 신호등 {}개 로드 완료".format(len(self.lights)))

        rate = rospy.Rate(50)
        while not rospy.is_shutdown():
            rate.sleep()

    def odom_callback(self, msg):
        self.current_position = msg.pose.pose.position

    def traffic_light_callback(self, msg):
        if self.current_position is None:
            return

        light_id = msg.trafficLightIndex
        if light_id not in self.lights:
            rospy.logwarn("알 수 없는 신호등 ID: {}".format(light_id))
            return

        light_obj = self.lights[light_id]
        light_pos = light_obj.point  # [x, y, z]
        light_status = msg.trafficLightStatus

        dist = sqrt((self.current_position.x - light_pos[0])**2 +
                    (self.current_position.y - light_pos[1])**2 +
                    (self.current_position.z - light_pos[2])**2)

        if dist <= self.distance_threshold:
            is_red =       (light_status & 1)  != 0
            is_yellow =    (light_status & 4)  != 0
            is_green =     (light_status & 16) != 0
            is_left_arrow =(light_status & 32) != 0

            signal_str = []
            if is_red:
                signal_str.append("Red")
            if is_yellow:
                signal_str.append("Yellow")
            if is_green:
                signal_str.append("Green")
            if is_left_arrow:
                signal_str.append("LeftArrow")

            self.latest_signal = "+".join(signal_str)
            self.last_signal_time = rospy.Time.now()

            rospy.loginfo(" 신호등 상태 수신: %s (ID: %s, 거리: %.2f m)", self.latest_signal, light_id, dist)

    def is_signal_stale(self, timeout_sec=1.0):
        """ 일정 시간 이상 신호 수신 없으면 무효 처리 """
        return (rospy.Time.now() - self.last_signal_time).to_sec() > timeout_sec

    def way_callback(self, msg):
        way = msg.data  # -1: 좌, 0: 직진, 1: 우
        decision = 0

        # 신호 없음 또는 오래된 신호면 → 주행 허용
        if self.latest_signal is None or self.is_signal_stale(timeout_sec=1.0):
<<<<<<< EMB/catkin_ws/src/vanish/scripts/traffic_distance.py
            rospy.logwarn(" 유효한 신호 없음 또는 타임아웃 → 진행 허용")
=======
            rospy.logwarn(" 유효한 신호 없음 또는 타임아웃 → 진행 허용")
>>>>>>> EMB/catkin_ws/src/vanish/scripts/traffic_distance.py
            decision = 1
        else:
            signal_list = self.latest_signal.split("+")
            is_red = "Red" in signal_list
            is_green = "Green" in signal_list
            is_left_arrow = "LeftArrow" in signal_list
            
            

            if is_red and way == 0:  # 빨간불 + 우회전 제외
                decision = 0
            else:
                if way == -1:  # 좌회전
                    decision = 1 if is_left_arrow else 0
                elif way == 0:  # 직진
                    decision = 1 if is_green else 0
                elif way == 1:  # 우회전
                    decision = 1  # 항상 허용
                else:
                    decision = 1

        self.pub_go_decision.publish(decision)
        rospy.loginfo(" 판단결과 → way=%d, signal=%s, decision=%d", way, self.latest_signal, decision)


if __name__ == '__main__':
    try:
        TrafficDecision()
    except rospy.ROSInterruptException:
        pass
