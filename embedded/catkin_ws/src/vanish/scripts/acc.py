#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import math
from math import cos, sin, sqrt
from geometry_msgs.msg import Point
from nav_msgs.msg import Odometry, Path
from morai_msgs.msg import CtrlCmd, EgoVehicleStatus, ObjectStatusList
import numpy as np
from tf.transformations import euler_from_quaternion
from std_msgs.msg import Int32,String
from morai_msgs.srv import MoraiEventCmdSrv
from morai_msgs.msg import EventInfo

from pid_control import pidControl
from velocityPlanning import velocityPlanning
from AdaptiveCruiseControl import AdaptiveCruiseControl
import time


class pure_pursuit:
    def __init__(self):
        rospy.init_node('pure_pursuit', anonymous=True)

        # (1) Subscriber
        rospy.Subscriber("/global_path", Path, self.global_path_callback)
        rospy.Subscriber("/local_path", Path, self.path_callback)
        rospy.Subscriber("/odom", Odometry, self.odom_callback)
        rospy.Subscriber("/Ego_topic", EgoVehicleStatus, self.status_callback)
        rospy.Subscriber("/Object_topic", ObjectStatusList, self.object_info_callback)
        rospy.Subscriber("/arrival_status", Int32, self.arrival_status_callback)
        
        # **추가**: 신호등 decision(0 or 1) 구독
        rospy.Subscriber("/go_decision", Int32, self.decision_callback)
        # **추가**: way(-1=좌회전,0=직진,1=우회전) 구독 (필요 시)
        rospy.Subscriber("/way", Int32, self.way_callback)

        rospy.wait_for_service('/Service_MoraiEventCmd')
        self.event_cmd_srv = rospy.ServiceProxy('/Service_MoraiEventCmd', MoraiEventCmdSrv)
        
        # (2) Publisher
        self.ctrl_cmd_pub = rospy.Publisher("/ctrl_cmd", CtrlCmd, queue_size=10)
        
        rospy.Subscriber("/parking_trigger", String, self.trigger_callback)
        self.is_parking = True

        # (3) CtrlCmd 메시지
        self.ctrl_cmd_msg = CtrlCmd()
        self.ctrl_cmd_msg.longlCmdType = 1  # Throttle/Brake 제어

        # (4) 상태 플래그
        self.is_path = False
        self.is_odom = False
        self.is_status = False
        self.is_global_path = False
        self.is_look_forward_point = False
        self.is_object_info = False
        self.is_arrive = 0

        # (5) 차량 위치/자세
        self.forward_point = Point()
        self.current_postion = Point()
        self.vehicle_yaw = 0.0

        # (6) Pure Pursuit 파라미터
        self.vehicle_length = 2.6
        self.lfd = 8
        self.min_lfd = 5
        self.max_lfd = 30
        self.lfd_gain = 0.85
        self.target_velocity = 45  # km/h

        # (7) 객체 데이터
        self.object_data = None

        # (8) 종방향 PID, 곡률 기반 속도계획
        self.speed_pid = pidControl(p_gain=0.25, i_gain=0.0, d_gain=0.03)   # 속도용
        self.steering_pid = pidControl(p_gain=0.4, i_gain=0.0, d_gain=0.0025)  # 조향용
        self.vel_planning = velocityPlanning(self.target_velocity / 3.6, 0.15)
        self.adaptive_cruise_control = AdaptiveCruiseControl(velocity_gain=0.5,
                                                             distance_gain=1,
                                                             time_gap=0.8,
                                                             vehicle_length=2.7)

        # (9) 신호등 decision(0/1) 기본값: 1(주행 가능)
        self.decision = 1
        self.way = 0  # -1=좌회전, 0=직진, 1=우회전 (필요하다면 사용)

        # (10) 전역 경로 수신 대기 후 속도 계획
        while not rospy.is_shutdown():
            if self.is_global_path:
                break
            else:
                rospy.loginfo('Waiting for global path data...')
                rospy.sleep(0.5)

        # (11) 메인 루프
        rate = rospy.Rate(30)
        while not rospy.is_shutdown():
            if self.is_path and self.is_odom and self.is_status and self.is_parking  :
                
                # (A) 도착 여부 체크
                if self.is_arrive == 2:
                    rospy.loginfo("목적지에 도착 => 차량 정지")
                    self.ctrl_cmd_msg.steering = 0.0
                    self.ctrl_cmd_msg.accel = 0.0
                    self.ctrl_cmd_msg.brake = 1.0
                    self.ctrl_cmd_pub.publish(self.ctrl_cmd_msg)
                    self.get_gear_status(1)
                    self.is_global_path = False
                    rate.sleep()
                    continue
                
                # (B) 주행 로직
                if self.is_global_path:
                    self.get_gear_status(4)
                    result = self.calc_vaild_obj([self.current_postion.x,self.current_postion.y,self.vehicle_yaw],self.object_data)
                
                    global_npc_info = result[0] 
                    local_npc_info = result[1] 
                    global_ped_info = result[2] 
                    local_ped_info = result[3] 
                    global_obs_info = result[4] 
                    local_obs_info = result[5] 
                    
                    # (1) 현재 waypoint 찾기
                    self.current_waypoint = self.get_current_waypoint(
                        [self.current_postion.x, self.current_postion.y],
                        self.global_path
                    )
                    idx = min(self.current_waypoint, len(self.velocity_list) - 1)
                    
                    # (2) 원래 속도 계획
                    self.target_velocity = self.velocity_list[idx] * 3.6
                    
                    # (3) 신호등 decision 확인
                    #     0 => 최종 속도 = 0 (서서히 감속)
                    #     1 => 기존 계획 속도 유지
                    if self.decision == 0:
                        self.target_velocity = 0.0
                        
                        
                    self.adaptive_cruise_control.check_object(self.path ,global_npc_info, local_npc_info,global_ped_info, local_ped_info,global_obs_info, local_obs_info)
                    
                    self.target_velocity = self.adaptive_cruise_control.get_target_velocity(local_npc_info, local_ped_info, local_obs_info,
                                                                                                        self.status_msg.velocity.x, self.target_velocity/3.6)


                    # (4) 조향(Pure Pursuit)
                    steering_pp = self.calc_pure_pursuit()
                    wheel_angle_deg = self.status_msg.wheel_angle
                    wheel_angle_rad = wheel_angle_deg * (math.pi / 180.0)
                    steering = self.steering_pid.pid(steering_pp, wheel_angle_rad)
                    
                    if self.is_look_forward_point:
                        self.ctrl_cmd_msg.steering = steering
                    else:
                        rospy.loginfo("no forward point => steering=0")
                        #self.ctrl_cmd_msg.steering = 0.0

                    # (5) 종방향 PID
                    current_speed = self.status_msg.velocity.x * 3.6  # m/s -> km/h
                    output = self.speed_pid.pid(self.target_velocity, current_speed)

                    if output > 0.0:
                        self.ctrl_cmd_msg.accel = output
                        self.ctrl_cmd_msg.brake = 0.0
                    else:
                        self.ctrl_cmd_msg.accel = 0.0
                        self.ctrl_cmd_msg.brake = -output

                    # (6) 메시지 Publish
                    self.ctrl_cmd_pub.publish(self.ctrl_cmd_msg)

            rate.sleep()

    # ----------------------- 콜백들 -----------------------
    def trigger_callback(self, msg):
        """
        /parking_trigger 토픽에서 'start' 문자열이 오면
        1) 주차 동작 시작
        2) 서버에 'parking-start' POST 요청 전송
        """
        if msg.data == "start":
            #rospy.loginfo("🚗 주차 트리거 수신 → 주차 시작")
            self.is_parking = False
            #self.parking_start_time = rospy.Time.now()
            #print(self.parking_start_time)

            # (1) 서버에 POST 요청 보내기
            #self.send_parking_start_request()
        else : 
            self.is_parking = True
    
    def path_callback(self, msg):
        self.is_path = True
        self.path = msg

    def get_gear_status(self,gear):
        
        gear_cmd= EventInfo()
        gear_cmd.option = 2
        gear_cmd.ctrl_mode = 3
        gear_cmd.gear = gear
        gear_cmd_resp = self.event_cmd_srv(gear_cmd)

    def odom_callback(self, msg):
        self.is_odom = True
        q = (msg.pose.pose.orientation.x,
             msg.pose.pose.orientation.y,
             msg.pose.pose.orientation.z,
             msg.pose.pose.orientation.w)
        _, _, self.vehicle_yaw = euler_from_quaternion(q)
        self.current_postion.x = msg.pose.pose.position.x
        self.current_postion.y = msg.pose.pose.position.y

    def status_callback(self, msg):
        self.is_status = True
        self.status_msg = msg

    def global_path_callback(self, msg):
        self.global_path = msg
        self.velocity_list = self.vel_planning.curvedBaseVelocity(self.global_path, 20)
        self.is_global_path = True
        time.sleep(1)

    def object_info_callback(self, data):
        self.is_object_info = True
        self.object_data = data

    def arrival_status_callback(self, msg):
        self.is_arrive = msg.data
        self.is_arrive_flag = True
        

    def decision_callback(self, msg):
        """신호등 때문에 멈춰야 하면 0, 주행 가능하면 1"""
        self.decision = msg.data

    def way_callback(self, msg):
        """-1=좌회전, 0=직진, 1=우회전 (필요시 사용)"""
        self.way = msg.data

    # ----------------------- Pure Pursuit 계산부 -----------------------
    def get_current_waypoint(self, ego_xy, global_path):
        """ego_xy: [x, y], global_path: Path"""
        min_dist = float('inf')
        current_waypoint = -1
        for i, pose in enumerate(global_path.poses):
            dx = ego_xy[0] - pose.pose.position.x
            dy = ego_xy[1] - pose.pose.position.y
            dist = math.sqrt(dx*dx + dy*dy)
            if dist < min_dist:
                min_dist = dist
                current_waypoint = i
        return current_waypoint

    def calc_pure_pursuit(self):
        # (1) 속도 기반 LfD 조정
        vehicle_speed = abs(self.status_msg.velocity.x)  # m/s
        self.lfd = max(self.min_lfd, min(vehicle_speed * self.lfd_gain, self.max_lfd))

        # (2) 차량 좌표계 변환
        self.is_look_forward_point = False
        vehicle_position = self.current_postion
        trans_matrix = np.array([
            [math.cos(self.vehicle_yaw), -math.sin(self.vehicle_yaw), vehicle_position.x],
            [math.sin(self.vehicle_yaw),  math.cos(self.vehicle_yaw), vehicle_position.y],
            [0, 0, 1]
        ])
        det_trans_matrix = np.linalg.inv(trans_matrix)

        # (3) local 좌표로 변환하며 LfD 이상 떨어진 점 찾기
        for pose_stamped in self.path.poses:
            path_point = pose_stamped.pose.position
            global_point = np.array([path_point.x, path_point.y, 1.0])
            local_point = det_trans_matrix.dot(global_point)
            if local_point[0] > 0:
                dist = math.sqrt(local_point[0]**2 + local_point[1]**2)
                if dist >= self.lfd:
                    self.forward_point = path_point
                    self.is_look_forward_point = True
                    break

        # (4) 전방 주시점 없으면 조향 0
        if not self.is_look_forward_point:
            return 0.0

        # (5) 조향각 계산
        theta = math.atan2(self.forward_point.y - vehicle_position.y,
                           self.forward_point.x - vehicle_position.x)
        alpha = theta - self.vehicle_yaw
        steering = math.atan2(2.0 * self.vehicle_length * math.sin(alpha), self.lfd)
        return steering
    
    def calc_vaild_obj(self,status_msg,object_data):
        
        self.all_object = object_data        
        ego_pose_x = status_msg[0]
        ego_pose_y = status_msg[1]
        ego_heading = status_msg[2]
        
        global_npc_info = []
        local_npc_info  = []
        global_ped_info = []
        local_ped_info  = []
        global_obs_info = []
        local_obs_info  = []

        num_of_object = self.all_object.num_of_npcs + self.all_object.num_of_obstacle + self.all_object.num_of_pedestrian        
        if num_of_object > 0:

            #translation
            tmp_theta=ego_heading
            tmp_translation=[ego_pose_x, ego_pose_y]
            tmp_t=np.array([[cos(tmp_theta), -sin(tmp_theta), tmp_translation[0]],
                            [sin(tmp_theta),  cos(tmp_theta), tmp_translation[1]],
                            [0             ,               0,                  1]])
            tmp_det_t=np.array([[tmp_t[0][0], tmp_t[1][0], -(tmp_t[0][0] * tmp_translation[0] + tmp_t[1][0]*tmp_translation[1])],
                                [tmp_t[0][1], tmp_t[1][1], -(tmp_t[0][1] * tmp_translation[0] + tmp_t[1][1]*tmp_translation[1])],
                                [0,0,1]])

            #npc vehicle ranslation        
            for npc_list in self.all_object.npc_list:
                global_result=np.array([[npc_list.position.x],[npc_list.position.y],[1]])
                local_result=tmp_det_t.dot(global_result)
                if local_result[0][0]> 0 :        
                    global_npc_info.append([npc_list.type,npc_list.position.x,npc_list.position.y,npc_list.velocity.x])
                    local_npc_info.append([npc_list.type,local_result[0][0],local_result[1][0],npc_list.velocity.x])

            #ped translation
            for ped_list in self.all_object.pedestrian_list:
                global_result=np.array([[ped_list.position.x],[ped_list.position.y],[1]])
                local_result=tmp_det_t.dot(global_result)
                if local_result[0][0]> 0 :
                    global_ped_info.append([ped_list.type,ped_list.position.x,ped_list.position.y,ped_list.velocity.x])
                    local_ped_info.append([ped_list.type,local_result[0][0],local_result[1][0],ped_list.velocity.x])

            #obs translation
            for obs_list in self.all_object.obstacle_list:
                global_result=np.array([[obs_list.position.x],[obs_list.position.y],[1]])
                local_result=tmp_det_t.dot(global_result)
                if local_result[0][0]> 0 :
                    global_obs_info.append([obs_list.type,obs_list.position.x,obs_list.position.y,obs_list.velocity.x])
                    local_obs_info.append([obs_list.type,local_result[0][0],local_result[1][0],obs_list.velocity.x])
                
        return global_npc_info, local_npc_info, global_ped_info, local_ped_info, global_obs_info, local_obs_info


if __name__ == '__main__':
    try:
        test_track = pure_pursuit()
    except rospy.ROSInterruptException:
        pass
