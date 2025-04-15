#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import threading
import time
import pika
import sys
import os

from std_msgs.msg import Bool, Int32, String
from geometry_msgs.msg import PoseStamped
from nav_msgs.msg import Odometry
from path_distance_time import GlobalPathCalculator
from pyproj import Proj
from datetime import datetime, timedelta
import json
from dateutil import parser
import threading

from lib.mgeo.class_defs import MGeo
from lib.mgeo.class_defs.node import Node
from lib.mgeo.class_defs.line import Line

current_path = os.path.dirname(os.path.realpath(__file__))
sys.path.append(current_path)

class RabbitMQCommandNode(object):
    def __init__(self):
        # 1) ROS 노드 초기화
        rospy.init_node("rabbitmq_command_node", anonymous=True)
        self.is_roaming = False

        # 2) 주행 관련 퍼블리셔/변수 준비 (예: /move_base_simple/goal, /drive_enable 등)
        self.goal_pub = rospy.Publisher("/move_base_simple/goal", PoseStamped, queue_size=1)
        self.parking_trigger = rospy.Publisher("/parking_trigger", String, queue_size=1)
        
        rospy.Subscriber('/odom', Odometry, self.odom_callback)
        self.current_pos = (0.0, 0.0)  # 혹은 시작 위치

        self.proj_UTM = Proj(proj="utm", zone=52, ellps="WGS84", preserve_units=False)
        
        load_path = os.path.normpath(os.path.join(current_path, 'lib/mgeo_data/R_KR_PG_K-City'))
        mgeo_planner_map = MGeo.create_instance_from_json(load_path)

        # node_set / line_set (NodeSet, LineSet)
        self.node_set = mgeo_planner_map.node_set  # NodeSet()
        self.line_set = mgeo_planner_map.link_set  # LineSet()

        # A*에서 참조할 노드/링크 dict
        self.nodes = self.node_set.nodes  # 예: { 'nd0': Node(...), 'nd1': Node(...), ... }
        self.links = self.line_set.lines  # 예: { 'ln0': Line(...), 'ln1': Line(...), ... }

        # 도착 상태를 나타내는 변수 (0=대기, 1=주행 중, 2=도착 등 가정)
        self.arrival_status = 0
        rospy.Subscriber("/arrival_status", Int32, self.arrival_status_cb)

        # 3) RabbitMQ 연결/소비 스레드 실행
        self._connection = None
        self._channel = None

        self._rabbit_thread = threading.Thread(target=self.connect_and_consume)
        self._rabbit_thread.daemon = True
        self._rabbit_thread.start()

    def arrival_status_cb(self, msg):
        """주행 결과 등을 Publish 해주는 노드가 /arrival_status에 상태를 보내준다고 가정"""
        self.arrival_status = msg.data
    
    def odom_callback(self, msg):
        x = msg.pose.pose.position.x
        y = msg.pose.pose.position.y
        self.current_pos = (x, y)
        
    def find_next_point_after_closest(self, pos):
        """현재 위치와 가장 가까운 점을 찾고, 그 점의 다음 점을 반환"""
        x, y = pos
        min_dist = float('inf')
        closest_pt = None
        closest_idx = -1
        closest_line = None

        for ln in self.line_set.lines.values():
            for i, pt in enumerate(ln.points):
                dx = x - pt[0]
                dy = y - pt[1]
                dist = dx * dx + dy * dy
                if dist < min_dist:
                    min_dist = dist
                    closest_pt = pt
                    closest_idx = i
                    closest_line = ln

        # 가장 가까운 점의 '다음' 점을 반환
        if closest_line and closest_idx + 1 < len(closest_line.points):
            return closest_line.points[closest_idx -1]
        else:
            rospy.logwarn("마지막 점이라 다음 점이 없습니다.")
            return None

    def connect_and_consume(self):
        """RabbitMQ에 연결하고, 큐를 구독한 뒤 start_consuming()을 돌리는 함수(별도 스레드)"""
        while not rospy.is_shutdown():
            try:
                # (1) RabbitMQ 연결
                credentials = pika.PlainCredentials('guest', 'guest')
                parameters = pika.ConnectionParameters(
                    host='j12a707.p.ssafy.io',
                    port=3001,
                    credentials=credentials
                )
                self._connection = pika.BlockingConnection(parameters)
                self._channel = self._connection.channel()

                self._channel.exchange_declare(exchange="remote_exchange", exchange_type='direct', durable=True)

                result1 = self._channel.queue_declare(queue='', exclusive=True)
                self.queue_name1 = result1.method.queue
                result2 = self._channel.queue_declare(queue='', exclusive=True)
                self.queue_name2 = result2.method.queue
                result3 = self._channel.queue_declare(queue='', exclusive=True)
                self.queue_name3 = result3.method.queue

                self._channel.queue_bind(exchange='remote_exchange', queue=self.queue_name1, routing_key='remote.destination')
                self._channel.queue_bind(exchange='remote_exchange', queue=self.queue_name2, routing_key='remote.parking')
                self._channel.queue_bind(exchange='remote_exchange', queue=self.queue_name3, routing_key='remote.roam')

                self._channel.basic_qos(prefetch_count=1)
                # self._channel.basic_consume(self.callback_goal, queue=queue_name1, no_ack=True)
                # self._channel.basic_consume(self.callback_parking, queue=queue_name2, no_ack=True)
                # self._channel.basic_consume(self.callback_rotation, queue=queue_name3, no_ack=True)
                self._channel.basic_consume(
                    self.callback_goal,
                    queue=self.queue_name1,
                    no_ack=True,
                    consumer_tag="goal_tag"
                )
                self._channel.basic_consume(
                    self.callback_parking,
                    queue=self.queue_name2,
                    no_ack=True,
                    consumer_tag="parking_tag"
                )
                self._channel.basic_consume(
                    self.callback_rotation,
                    queue=self.queue_name3,
                    no_ack=True,
                    consumer_tag="rotation_tag"
                )

                rospy.loginfo(" [*] RabbitMQ 연결 및 구독 완료. 메시지 대기 중...")
                self._channel.start_consuming()

            
            except pika.exceptions.AMQPConnectionError as e:
                rospy.logwarn("RabbitMQ 연결 실패, 1초 후 재시도: {}".format(e))
                time.sleep(1)

    def callback_goal(self, ch, method, properties, body):
        """
        Destination message with optional ETA.
        Response: "lat|lon" or "lat|lon|ETA"
        Request: "destination|lat|lon|ETA"
        """
        try:
            # 1) Decode body
            msg = body.decode("utf-8")
            rospy.loginfo("[Goal] Received message: %s" % msg)

            # 2) Parse
            tokens = msg.strip().split('|')
            if len(tokens) not in [3, 4]:
                rospy.logwarn("[Goal] Invalid message format: %s" % msg)
                return

            lat_str, lon_str = tokens[1], tokens[2]
            lat = float(lat_str)
            lon = float(lon_str)
            eta_given = (len(tokens) == 4)

            # 3) Convert & plan
            goal_xy = self.convertLL2UTM(lon, lat)
            planner = GlobalPathCalculator()
            dist_m, time_s, path_pts = planner.compute_route_time(
                self.current_pos, goal_xy, speed_kmh=30.0
            )
            rospy.loginfo("[Goal] Distance: %.1fm, travel time: %.1fs" % (dist_m, time_s))

            now_utc = datetime.utcnow()

            # 4) Compute ETA
            if eta_given:
                eta_str = tokens[3].strip()           # 공백 제거
                eta_str = eta_str.rstrip("Z")         # Z 제거
                if '.' in eta_str:
                    eta_str = eta_str.split('.')[0]   # 마이크로초 제거
                eta_utc = datetime.strptime(eta_str, '%Y-%m-%dT%H:%M:%S')
            else:
                eta_utc = now_utc + timedelta(seconds=time_s)
                eta_str = eta_utc.strftime('%Y-%m-%dT%H:%M:%SZ')

            # 5) Send RPC response (reply_to)
            response_msg = "%s|%s|%s" % (lat_str, lon_str, eta_str)


            credentials = pika.PlainCredentials('guest', 'guest')
            parameters = pika.ConnectionParameters(
                host='j12a707.p.ssafy.io',
                port=3001,
                credentials=credentials
            )
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()

            channel.basic_publish(
                exchange='',
                routing_key=properties.reply_to,
                properties=pika.BasicProperties(correlation_id=properties.correlation_id),
                body=response_msg
            )
            channel.basic_ack(delivery_tag=method.delivery_tag)
            connection.close()

            rospy.loginfo("[Goal] Sent RPC response: %s" % response_msg)

            # 6) Wait until departure if ETA was given
            if eta_given:
                seconds_until_departure = (eta_utc - now_utc).total_seconds() - time_s
                if seconds_until_departure > 10:
                    rospy.loginfo("[Goal] Waiting %d seconds before departure..." % int(seconds_until_departure))
                    r = rospy.Rate(1)
                    for _ in range(int(seconds_until_departure)):
                        if rospy.is_shutdown():
                            return
                        r.sleep()
                else:
                    rospy.logwarn("[Goal] Already past ETA, start now.")

            # 7) Publish goal
            pose = PoseStamped()
            pose.header.frame_id = "map"
            pose.header.stamp = rospy.Time.now()
            pose.pose.position.x = goal_xy[0] 
            pose.pose.position.y = goal_xy[1] 
            pose.pose.orientation.w = 1.0
            self.goal_pub.publish(pose)
            time.sleep(0.5)
            self.goal_pub.publish(pose)
            rospy.loginfo("[Goal] Published goal: (%.2f, %.2f)" % (goal_xy[0], goal_xy[1]))

            # 8) Wait for arrival
            self.arrival_status = 0
            rate = rospy.Rate(1)
            while not rospy.is_shutdown():
                if self.arrival_status == 2:
                    rospy.loginfo("[Goal] Arrival complete!")
                    break
                rate.sleep()

        except Exception as e:
            rospy.logerr("[Goal] Exception: %s" % str(e))

    def callback_parking(self, ch, method, properties, body):
        """
        Parking Request Message
        Example: "PARKING|37.5650|126.9770"
        """
        msg = body.decode("utf-8")
        rospy.loginfo("[Parking] Received message: %s" % msg)

        try:
            # 2) Parse the message
            tokens = msg.strip().split('|')
            lat = float(tokens[1])
            lon = float(tokens[2])

            goal_xy = self.convertLL2UTM(lon, lat)

            # 1) Publish the target destination
            pose = PoseStamped()
            pose.header.frame_id = "map"
            pose.pose.position.x = goal_xy[0]
            pose.pose.position.y = goal_xy[1]
            pose.pose.orientation.w = 1.0
            self.goal_pub.publish(pose)
            time.sleep(0.5)
            self.goal_pub.publish(pose)

            # 2) Enable driving (activation)
            rospy.loginfo(" /drive_enable = True → Heading to parking lot...")

            # 3) Wait for arrival
            rate = rospy.Rate(2)
            while not rospy.is_shutdown():
                if self.arrival_status == 2:
                    rospy.loginfo(" Arrived at parking spot")
                    break
                rate.sleep()

            # 4) Execute parking logic (Stub)
            self.parking_trigger.publish("start")
            rospy.loginfo("[PARKING] Executing parking algorithm (Stub)")
            time.sleep(8)
            self.parking_trigger.publish("stop")
        except Exception as e:
            rospy.logerr("[Parking] Error during processing: %s" % str(e))

    def callback_rotation(self, ch, method, properties, body):
        """
        배회(회전) 요청 메시지
        예: "ROAM" 또는 "STOP"
        """
        msg = body.decode("utf-8")
        rospy.loginfo("[Rotation] receive msg: {}".format(msg))
        
        if msg == "Roam" and not self.is_roaming:
            rospy.loginfo(" Rotation start")
            self.is_roaming = True

            # 👉 다른 큐 일시 중지
            self._channel.basic_cancel(consumer_tag="goal_tag")
            self._channel.basic_cancel(consumer_tag="parking_tag")

            threading.Thread(target=self.roaming_task).start()
            
        elif msg == "Stop":
            rospy.loginfo(" Rotation stop command received")
            # STOP 명령 수신 시 배회 모드 비활성화
            self.is_roaming = False
            rospy.loginfo(" Rotation will end after current goal completion")
            time.sleep(1.5) # thread end late
            
            # call remaind
            
            self._channel.basic_consume(
                self.callback_goal,
                queue=self.queue_name1,
                no_ack=True,
                consumer_tag="goal_tag"
            )
            self._channel.basic_consume(
                self.callback_parking,
                queue=self.queue_name2,
                no_ack=True,
                consumer_tag="parking_tag"
            )
            
        else :
            rospy.logwarn("msg format false")

    def roaming_task(self):
        """배회 작업을 실행하는 별도의 메서드"""
        rate = rospy.Rate(1)
        # 현재 위치를 목적지로 설정
        pose = PoseStamped()
        pose.header.frame_id = "map"
        pt = self.find_next_point_after_closest(self.current_pos)
        #print(pt)
        if pt is not None:
            pass
        else:
            rospy.logwarn("not find.")
            self.is_roaming = False
            return  # 조기 종료 필요
        pose.pose.position.x = pt[0]
        pose.pose.position.y = pt[1]
        pose.pose.orientation.w = 1.0
        
        while not rospy.is_shutdown() and self.is_roaming:
            
            self.goal_pub.publish(pose)
            time.sleep(0.5)
            self.goal_pub.publish(pose)
            
            rospy.loginfo("[Rotation] Publishing current position as goal")
            
            # 도착까지 대기
            while not rospy.is_shutdown() and self.arrival_status != 2:
                continue
                
            if self.arrival_status == 2:
                time.sleep(1)
                rospy.loginfo("[Rotation] Arrival complete!")
                
            # 배회 모드가 계속 활성화되어 있으면 다음 목적지 설정
            if self.is_roaming:
                rospy.loginfo("[Rotation] Setting next goal...")
            else:
                rospy.loginfo("[Rotation] Roaming stopped")
                break
        
        rospy.loginfo("Rotation end")
    
    def convertLL2UTM(self, lon, lat):
        if lon == 0 and lat == 0:
            x = 0.0
            y = 0.0
        else:
            orig_lon = lon + 0.210318416    # 경도 복원: 보정에서 -가 되어 있으므로 + 해줌.
            orig_lat = lat - 0.2856728146     # 위도 복원: 보정에서 +가 되어 있으므로 - 해줌.
            
            xy_zone = self.proj_UTM(orig_lon, orig_lat)
            x = xy_zone[0] - 302459.942 
            y = xy_zone[1] - 4122635.537 
        return [x, y]

    def spin(self):
        rospy.spin()
        if self._channel is not None:
            try:
                self._channel.stop_consuming()
            except:
                pass
        if self._connection is not None and self._connection.is_open:
            self._connection.close()
        


if __name__ == "__main__":
    node = RabbitMQCommandNode()
    node.spin()
