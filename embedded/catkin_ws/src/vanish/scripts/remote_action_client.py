#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import pika
import json
import actionlib
from datetime import datetime
from geometry_msgs.msg import PoseStamped
from vanish.msg import DriveToGoalAction, DriveToGoalGoal  # <-- 네가 정의한 action 메시지
import threading

class RemoteActionClient:
    def __init__(self):
        rospy.init_node('remote_action_client')

        # RabbitMQ 연결
        self.connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
        self.channel = self.connection.channel()

        # Exchange 및 Queue 설정
        self.channel.exchange_declare(exchange='remote_exchange', exchange_type='direct')

        self.channel.queue_declare(queue='remote.goal.queue')
        self.channel.queue_bind(exchange='remote_exchange', queue='remote.goal.queue', routing_key='call')

        self.channel.queue_declare(queue='ros.parking.queue')
        self.channel.queue_bind(exchange='remote_exchange', queue='ros.parking.queue', routing_key='park')

        # Action client 설정
        self.client = actionlib.SimpleActionClient('drive_to_goal', DriveToGoalAction)
        rospy.loginfo("Waiting for action server...")
        self.client.wait_for_server()
        rospy.loginfo("Connected to action server.")

        # 스레드로 각 큐 리스닝 시작
        threading.Thread(target=self.listen_call_queue, daemon=True).start()
        threading.Thread(target=self.listen_park_queue, daemon=True).start()

        rospy.spin()

    def listen_call_queue(self):
        def callback(ch, method, properties, body):
            rospy.loginfo(f"[호출 요청 수신] {body}")
            try:
                decoded = body.decode('utf-8').strip()
                lat, lon, time_str = decoded.split('|')
                self.send_action_goal(float(lat), float(lon), time_str, mode='call')
            except Exception as e:
                rospy.logerr(f"호출 메시지 파싱 실패: {e}")

        self.channel.basic_consume(queue='remote.goal.queue', on_message_callback=callback, auto_ack=True)
        rospy.loginfo("호출 큐 리스닝 시작")
        self.channel.start_consuming()

    def listen_park_queue(self):
        connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
        channel = connection.channel()
        def callback(ch, method, properties, body):
            rospy.loginfo(f"[주차 요청 수신] {body}")
            try:
                decoded = body.decode('utf-8').strip()
                lat, lon = decoded.split('|')
                self.send_action_goal(float(lat), float(lon), None, mode='park')
            except Exception as e:
                rospy.logerr(f"주차 메시지 파싱 실패: {e}")

        channel.basic_consume(queue='ros.parking.queue', on_message_callback=callback, auto_ack=True)
        rospy.loginfo("주차 큐 리스닝 시작")
        channel.start_consuming()

    def send_action_goal(self, lat, lon, time_str, mode):
        goal = DriveToGoalGoal()
        goal.mode = mode
        goal.target_pose.header.frame_id = "map"
        goal.target_pose.header.stamp = rospy.Time.now()
        goal.target_pose.pose.position.x = lat
        goal.target_pose.pose.position.y = lon

        if time_str and mode == 'call':
            try:
                # "2025-04-06T14:30:00" 같은 형식이면 datetime 파싱
                dt = datetime.strptime(time_str, "%Y-%m-%dT%H:%M:%S")
                goal.expected_arrival_time = rospy.Time.from_sec(dt.timestamp())
            except:
                rospy.logwarn("시간 파싱 실패 → 현재 시간 + 10초로 대체")
                goal.expected_arrival_time = rospy.Time.now() + rospy.Duration(10)
        else:
            goal.expected_arrival_time = rospy.Time.now()

        self.client.send_goal(goal,
                              done_cb=self.done_cb,
                              feedback_cb=self.feedback_cb)

    def feedback_cb(self, feedback):
        rospy.loginfo(f"[Feedback] status: {feedback.status}")

    def done_cb(self, state, result):
        rospy.loginfo(f"[Done] 완료 상태: {result.success}, 메시지: {result.message}")


if __name__ == '__main__':
    try:
        RemoteActionClient()
    except rospy.ROSInterruptException:
        pass
