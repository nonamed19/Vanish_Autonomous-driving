#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os, sys
import rospy
import rospkg
import tf
from math import cos,sin,pi,sqrt,pow,atan2
import numpy as np
from geometry_msgs.msg import Point32,PoseStamped
from nav_msgs.msg import Odometry,Path
from morai_msgs.msg import ObjectStatus, ObjectStatusList, EgoVehicleStatus

'''
lane_change 는 차량의 차선변경 예제입니다.
차량 경로상의 장애물을 탐색하여 경로 상에 장애물이 있다면 차선 변경으로 회피 기동을 합니다.
lane_change_1 예제와 차이점은 차선 변경 시 단순히 목표 차선을 바꾸는 것이 아닌
시작차선과 목표 차선 사이 경로를 3차곡선 으로 연결하여 좀 더 자연스러운 차선변경 경로를 생성한다는 점입니다.
'''

class lc_path_pub :
    def __init__(self):
        rospy.init_node('lc_path_pub', anonymous=True)

        '''
        ros launch 파일에서 object_topic_name 을 인자로 받아옵니다.
        '''
        arg = rospy.myargv(argv=sys.argv)
        object_topic_name = arg[1]

        # (1) subscriber, publisher 선언
        rospy.Subscriber(object_topic_name, ObjectStatusList, self.object_info_callback)
        rospy.Subscriber("odom",Odometry,self.odom_callback)
        self.global_path_pub = rospy.Publisher("/global_path",Path,queue_size=1)
        self.local_path_pub = rospy.Publisher("/local_path",Path,queue_size=1)

        # rospkg 를 통해 패키지 내부의 경로(path) 를 가져옴
        rospack=rospkg.RosPack()
        pkg_path=rospack.get_path('ssafy_3')

        # (2) 텍스트 파일에서 두 개의 차선 경로를 읽어 Path 메시지로 생성
        self.lc_1 = self.read_path_file(pkg_path + '/path/lc_1.txt')
        self.lc_2 = self.read_path_file(pkg_path + '/path/lc_2.txt')

        # 시작 차선은 lc_1 로
        global_path = self.lc_1

        self.is_object_info = False
        self.is_odom = False

        # local path 의 size
        self.local_path_size = 50

        self.lane_change = False        
        self.current_lane = 1

        rate = rospy.Rate(10) # 10hz
        while not rospy.is_shutdown():
            if self.is_object_info == True and self.is_odom == True:

                # Object 정보 계산
                result = self.calc_vaild_obj([self.x,self.y,self.vehicle_yaw],self.object_data)
                global_npc_info = result[0] 
                local_npc_info = result[1] 

                # local path 생성
                self.local_path_make(global_path)

                # 현재 차량이 global_path 에서 몇 번째 웨이포인트 근처에 있는지
                currnet_waypoint = self.get_current_waypoint(self.x,self.y,global_path)

                # 장애물 유무 확인 후 차선 변경 로직 수행
                global_path = self.lc_planning(global_npc_info,local_npc_info,currnet_waypoint,global_path)

                # (9) 최종 경로(Local, Global) Publish
                self.local_path_pub.publish(self.local_path_msg)
                self.global_path_pub.publish(global_path)

            rate.sleep()

    # (3) 경로 파일을 읽어 Path 메시지로 만드는 함수
    def read_path_file(self, file_path):
        path = Path()
        path.header.frame_id = 'map'
        with open(file_path, 'r') as f:
            lines = f.readlines()
            for line in lines:
                x, y, z = map(float, line.strip().split())
                pose = PoseStamped()
                pose.pose.position.x = x
                pose.pose.position.y = y
                pose.pose.position.z = z
                pose.pose.orientation.w = 1
                path.poses.append(pose)
        return path

    def odom_callback(self,msg):
        self.x = msg.pose.pose.position.x
        self.y = msg.pose.pose.position.y

        odom_quaternion=(msg.pose.pose.orientation.x,
                         msg.pose.pose.orientation.y,
                         msg.pose.pose.orientation.z,
                         msg.pose.pose.orientation.w)

        _,_,self.vehicle_yaw=tf.transformations.euler_from_quaternion(odom_quaternion)
        self.is_odom = True

    def object_info_callback(self,data): 
        self.is_object_info = True
        self.object_data = data 

    # 현재 위치와 가장 가까운 waypoint 인덱스 찾기
    def get_current_waypoint(self,x,y,global_path):
        min_dist = float('inf')        
        currnet_waypoint = -1
        for i,pose in enumerate(global_path.poses):
            dx = x - pose.pose.position.x
            dy = y - pose.pose.position.y
            dist = sqrt(pow(dx,2)+pow(dy,2))
            if min_dist > dist :
                min_dist = dist
                currnet_waypoint = i
        return currnet_waypoint

    # local path 생성
    def local_path_make(self,global_path):                
        self.local_path_msg=Path()
        self.local_path_msg.header.frame_id='map'
        
        x=self.x
        y=self.y
        min_dis=float('inf')
        current_waypoint=-1
        for i,waypoint in enumerate(global_path.poses) :
            distance=sqrt(pow(x-waypoint.pose.position.x,2)+pow(y-waypoint.pose.position.y,2))
            if distance < min_dis :
                min_dis=distance
                current_waypoint=i
        
        if current_waypoint != -1 :
            if current_waypoint + self.local_path_size < len(global_path.poses):
                for num in range(current_waypoint,current_waypoint + self.local_path_size ):
                    tmp_pose=PoseStamped()
                    tmp_pose.pose.position.x=global_path.poses[num].pose.position.x
                    tmp_pose.pose.position.y=global_path.poses[num].pose.position.y
                    tmp_pose.pose.orientation.w=1
                    self.local_path_msg.poses.append(tmp_pose)
            else :
                for num in range(current_waypoint,len(global_path.poses) ):
                    tmp_pose=PoseStamped()
                    tmp_pose.pose.position.x=global_path.poses[num].pose.position.x
                    tmp_pose.pose.position.y=global_path.poses[num].pose.position.y
                    tmp_pose.pose.orientation.w=1
                    self.local_path_msg.poses.append(tmp_pose)

    # Ego 차량과 NPC 차량 정보(글로벌/로컬) 추출
    def calc_vaild_obj(self,status_msg,object_data):
        
        self.all_object = object_data        
        ego_pose_x = status_msg[0]
        ego_pose_y = status_msg[1]
        ego_heading = status_msg[2]
        
        global_npc_info = []
        local_npc_info  = []

        num_of_object = self.all_object.num_of_npcs        
        if num_of_object > 0:

            # 자세/위치 변환 행렬(ego 차량 기준으로 변환)
            tmp_theta=ego_heading
            tmp_translation=[ego_pose_x, ego_pose_y]
            tmp_t=np.array([[cos(tmp_theta), -sin(tmp_theta), tmp_translation[0]],
                            [sin(tmp_theta),  cos(tmp_theta), tmp_translation[1]],
                            [0             ,               0,                 1 ]])
            tmp_det_t=np.array([[ tmp_t[0][0], tmp_t[1][0], -(tmp_t[0][0]*tmp_translation[0]+tmp_t[1][0]*tmp_translation[1])],
                                [ tmp_t[0][1], tmp_t[1][1], -(tmp_t[0][1]*tmp_translation[0]+tmp_t[1][1]*tmp_translation[1])],
                                [     0     ,      0      ,                         1                          ]])

            # npc vehicle 좌표 변환
            for npc_list in self.all_object.npc_list:
                global_result=np.array([[npc_list.position.x],
                                        [npc_list.position.y],
                                        [1]])
                local_result=tmp_det_t.dot(global_result)
                # 전방영역에 해당하는 물체만
                if local_result[0][0]> 0 :        
                    global_npc_info.append([npc_list.type,npc_list.position.x,npc_list.position.y,npc_list.velocity.x])
                    local_npc_info.append([npc_list.type,local_result[0][0],local_result[1][0],npc_list.velocity.x])    

        return global_npc_info, local_npc_info

    # (5) 차선 변경 경로 결정
    def lc_planning(self,global_obj,local_obj,currnet_waypoint,global_path):
        
        lane_change_distance = 60  # (point 간 간격이 0.5m라 가정하면 30m → index 약 60개)

        # 이미 차선변경 중이면, 임시 생성 경로 끝에 도달 시 원래 경로를 바꿔준다.
        if self.lane_change == True:
            if currnet_waypoint + self.local_path_size > len(global_path.poses):
                self.lane_change = False
                if self.current_lane == 1:
                    global_path = self.lc_1
                elif self.current_lane == 2:
                    global_path = self.lc_2
        else:
            # 장애물이 없을 때만 체크
            self.check_object(self.local_path_msg,global_obj,local_obj)
        
        # 경로 상 장애물이 있으면 차선 변경 로직
        if hasattr(self, 'object') and self.object[0] == True:
            if self.current_lane != 1:
                # 현재가 lc_2(2번 차선) → lc_1(1번 차선)으로
                self.current_lane = 1
                start_point = self.lc_2.poses[currnet_waypoint]  
                end_waypoint_idx = self.get_current_waypoint(
                                        self.lc_1.poses[currnet_waypoint+lane_change_distance].pose.position.x,
                                        self.lc_1.poses[currnet_waypoint+lane_change_distance].pose.position.y,
                                        self.lc_1)
                end_point = self.lc_1.poses[end_waypoint_idx]
                start_next_point = self.lc_2.poses[currnet_waypoint+5]
                global_path = self.getLaneChangePath(self.lc_2,self.lc_1,
                                                     start_point,end_point,
                                                     start_next_point,end_waypoint_idx)
                self.lane_change = True
                self.object=[False,0]
            else:
                # 현재가 lc_1(1번 차선) → lc_2(2번 차선)으로
                self.current_lane = 2
                start_point = self.lc_1.poses[currnet_waypoint]  
                end_waypoint_idx = self.get_current_waypoint(
                                        self.lc_2.poses[currnet_waypoint+lane_change_distance].pose.position.x,
                                        self.lc_2.poses[currnet_waypoint+lane_change_distance].pose.position.y,
                                        self.lc_2)
                end_point = self.lc_2.poses[end_waypoint_idx]
                start_next_point = self.lc_1.poses[currnet_waypoint+5]
                global_path = self.getLaneChangePath(self.lc_1,self.lc_2,
                                                     start_point,end_point,
                                                     start_next_point,end_waypoint_idx)
                self.lane_change = True
                self.object=[False,0]

        return global_path

    # (4) 주행 경로상의 장애물 유무 확인
    def check_object(self,ref_path,global_vaild_object,local_vaild_object):
        self.object=[False,0]
        if len(global_vaild_object) >0  :
            min_rel_distance = float('inf')
            for i in range(len(global_vaild_object)):
                # type 1,2만 장애물로(차량, 보행자 등)
                if global_vaild_object[i][0] in [1,2]:
                    for path in ref_path.poses :   
                        dis = sqrt(pow(global_vaild_object[i][1] - path.pose.position.x, 2) + 
                                   pow(global_vaild_object[i][2] - path.pose.position.y, 2))
                        # 경로 기준 ±2.5m 이내면 충돌 위험
                        if dis < 2.5:
                            rel_distance= dis              
                            if rel_distance < min_rel_distance:
                                min_rel_distance = rel_distance
                                self.object=[True,i]

    # (6)~(8) 차선 변경 경로 생성
    def getLaneChangePath(self,ego_path,lc_path,start_point,end_point,start_next_point, end_waypoint_idx):
        out_path=Path()  
        out_path.header.frame_id='map'

        # -- 좌표 변환 행렬 생성 (start_point를 기준원점, 진행 방향 보정)
        translation = [start_point.pose.position.x, start_point.pose.position.y]
        theta = atan2(start_next_point.pose.position.y - start_point.pose.position.y,
                      start_next_point.pose.position.x - start_point.pose.position.x)

        # 실제로는 병진+회전이 모두 포함된 3x3 행렬을 만들어야 함
        # [ cosθ -sinθ  tx ]
        # [ sinθ  cosθ  ty ]
        # [  0     0     1 ]
        trans_matrix = np.array([
            [cos(theta), -sin(theta), translation[0]],
            [sin(theta),  cos(theta), translation[1]],
            [0, 0, 1]
        ])
        det_trans_matrix = np.linalg.inv(trans_matrix)

        # End Point의 로컬 좌표
        world_end_point = np.array([[end_point.pose.position.x],
                                    [end_point.pose.position.y],
                                    [1]])
        local_end_point = det_trans_matrix.dot(world_end_point)

        # 0.5 m 간격으로 x 좌표 생성
        x_interval = 0.5
        x_start=0.0
        x_end= local_end_point[0][0]  # 로컬좌표계에서 end_point의 x
        y_start=0.0
        y_end  = local_end_point[1][0]  # 로컬좌표계에서 end_point의 y

        # x 좌표 개수
        waypoints_x=[]
        x_num = int(abs(x_end/x_interval))  # 정수로 변환
        step_sign = 1 if x_end>=0 else -1

        for i in range(x_num+1):
            waypoints_x.append(i * x_interval * step_sign)

        # 3차 곡선 방정식 계수 (f(x) = a x^3 + b x^2 + c x + d)
        Q_v = x_end - x_start
        Q_u = y_end - y_start

        # 간단 예시: 시작점(0,0), 끝점(Q_v, Q_u)에서
        #   f(0) = d = y_start = 0
        #   f(Q_v) = Q_u
        # 많이 쓰는 "시작각도·끝각도=0" 가정일 때 유도되는 3차 계수 예시
        d = 0.0
        c = 0.0
        b = (3*Q_u)/(Q_v**2) if abs(Q_v)>1e-6 else 0.0
        a = (-2*Q_u)/(Q_v**3) if abs(Q_v)>1e-6 else 0.0

        waypoints_y=[]
        for xi in waypoints_x:
            y_val = a*(xi**3) + b*(xi**2) + c*xi + d
            waypoints_y.append(y_val)

        # 로컬→월드 좌표로 변환 후 Path에 저장
        for i in range(len(waypoints_x)):
            local_result = np.array([[waypoints_x[i]], [waypoints_y[i]], [1]])
            # 로컬→글로벌:  trans_matrix * local_result
            global_result = trans_matrix.dot(local_result)

            read_pose=PoseStamped()
            read_pose.pose.position.x = global_result[0][0]
            read_pose.pose.position.y = global_result[1][0]
            read_pose.pose.position.z = 0.0
            read_pose.pose.orientation.w = 1.0
            out_path.poses.append(read_pose)
        
        # 직선 구간 추가(차선 변경 후 일정 구간)
        for k in range(end_waypoint_idx, end_waypoint_idx+40):
            if k < len(lc_path.poses):
                read_pose=PoseStamped()
                read_pose.pose.position.x = lc_path.poses[k].pose.position.x
                read_pose.pose.position.y = lc_path.poses[k].pose.position.y
                read_pose.pose.position.z = 0.0
                read_pose.pose.orientation.w = 1.0
                out_path.poses.append(read_pose)

        return out_path

if __name__ == '__main__':
    try:
        test_track=lc_path_pub()
    except rospy.ROSInterruptException:
        pass
