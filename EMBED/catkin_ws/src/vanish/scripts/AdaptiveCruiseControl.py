#!/usr/bin/env python
# -*- coding: utf-8 -*-
import math


class AdaptiveCruiseControl:
    def __init__(self, velocity_gain, distance_gain, time_gap, vehicle_length):
        self.npc_vehicle=[False,0]
        self.object=[False,0]
        self.Person=[False,0]
        self.velocity_gain = velocity_gain
        self.distance_gain = distance_gain
        self.time_gap = time_gap
        self.vehicle_length = vehicle_length

        self.object_type = None
        self.object_distance = 0
        self.object_velocity = 0

    def check_object(self,ref_path, global_npc_info, local_npc_info, 
                                    global_ped_info, local_ped_info, 
                                    global_obs_info, local_obs_info):
        #TODO: (8) 경로상의 장애물 유무 확인 (차량, 사람, 정지선 신호)
        '''
        # 주행 경로 상의 장애물의 유무를 파악합니다.
        # 장애물이 한개 이상 있다면 self.object 변수의 첫번째 값을 True 로 둡니다.
        # 장애물의 대한 정보는 List 형식으로 self.object 변수의 두번째 값으로 둡니다.
        # 장애물의 유무 판단은 주행 할 경로에서 얼마나 떨어져 있는지를 보고 판단 합니다.
        # 아래 예제는 주행 경로에서 Object 까지의 거리를 파악하여 
        # 경로를 기준으로 2.5 m 안쪽에 있다면 주행 경로 내 장애물이 있다고 판단 합니다.
        # 주행 경로 상 장애물이 여러게 있는 경우 가장 가까이 있는 장애물 정보를 가지도록 합니다.

        '''

        '''
        # 주행 경로 상 보행자 유무 파악
        '''
        min_rel_distance=float('inf')
        if len(global_ped_info) > 0 :        
            for i in range(len(global_ped_info)):
                for path in ref_path.poses :      
                    if global_ped_info[i][0] == 0 : # type=0 [pedestrian]                    
                        ped_x, ped_y = global_ped_info[i][1], global_ped_info[i][2]
                        path_x = path.pose.position.x
                        path_y = path.pose.position.y

                    # 두 점 사이의 거리 계산
                        dis = math.sqrt(pow(ped_x - path_x, 2) + pow(ped_y - path_y, 2))
                        if dis<4:                            
                            rel_distance = dis
                            if rel_distance < min_rel_distance:
                                min_rel_distance = rel_distance
                                self.Person=[True,i]

        '''
        # 주행 경로 상 NPC 차량 유무 파악
        '''
        if len(global_npc_info) > 0 :            
            for i in range(len(global_npc_info)):
                for path in ref_path.poses :      
                    if global_npc_info[i][0] == 1 : # type=1 [npc_vehicle] 
                        npc_x, npc_y = global_npc_info[i][1], global_npc_info[i][2]
                        path_x = path.pose.position.x
                        path_y = path.pose.position.y

                        # 두 점 사이의 거리 계산
                        dis = math.sqrt(pow(npc_x - path_x, 2) + pow(npc_y - path_y, 2))
                        if dis<2.35:
                            rel_distance = dis    
                            if rel_distance < min_rel_distance:
                                min_rel_distance = rel_distance
                                self.npc_vehicle=[True,i]

        '''
        # 주행 경로 상 Obstacle 유무 파악
        # acc 예제는 주행 중 전방에 차량에 속도에 맞춰 움직이도록 하는 Cruise Control
        # 예제 이기 때문에 정적 장애물(Obstacle) 의 정보는 받지 않는게 좋습니다.
        # 정적 장애물은 움직이지 않기 때문에 Cruise Control 알고리즘 상
        # 정적 장애물을 만나게 되면 속도가 0인 정적 장애물 바로 뒤에 정지하게 됩니다.
        '''
        if len(global_obs_info) > 0 :            
            for i in range(len(global_obs_info)):
                for path in ref_path.poses :      
                    if global_obs_info[i][0] == 2 : # type=1 [obstacle] 
                        npc_x, npc_y = global_npc_info[i][1], global_npc_info[i][2]
                        path_x = path.pose.position.x
                        path_y = path.pose.position.y

                        # 두 점 사이의 거리 계산
                        dis = math.sqrt(pow(npc_x - path_x, 2) + pow(npc_y - path_y, 2))
                        if dis<2.35:
                            rel_distance= dis            
                            if rel_distance < min_rel_distance:
                                min_rel_distance = rel_distance
                                # self.object=[True,i] 

    def get_target_velocity(self, local_npc_info, local_ped_info, local_obs_info, ego_vel, target_vel): 
        #TODO: (9) 장애물과의 속도와 거리 차이를 이용하여 ACC 를 진행 목표 속도를 설정
        out_vel =  target_vel
        default_space = 8
        time_gap = self.time_gap
        v_gain = self.velocity_gain
        x_errgain = self.distance_gain

        if self.npc_vehicle[0] and len(local_npc_info) != 0: #ACC ON_vehicle   
            print("ACC ON NPC_Vehicle")         
            front_vehicle = [local_npc_info[self.npc_vehicle[1]][1], local_npc_info[self.npc_vehicle[1]][2], local_npc_info[self.npc_vehicle[1]][3]]
            
            dis_safe = ego_vel * time_gap + default_space
            dis_rel = math.sqrt(pow(front_vehicle[0],2) + pow(front_vehicle[1],2))            
            vel_rel=((front_vehicle[2] / 3.6) - ego_vel)                        
            acceleration = vel_rel * v_gain - x_errgain * (dis_safe - dis_rel)

            out_vel = ego_vel + acceleration      

        if self.Person[0] and len(local_ped_info) != 0: #ACC ON_Pedestrian
            print("ACC ON Pedestrian")
            Pedestrian = [local_ped_info[self.Person[1]][1], local_ped_info[self.Person[1]][2], local_ped_info[self.Person[1]][3]]
            
            dis_safe = ego_vel* time_gap + default_space
            dis_rel = math.sqrt(pow(Pedestrian[0],2) + pow(Pedestrian[1],2))            
            vel_rel = (Pedestrian[2] - ego_vel)              
            acceleration = vel_rel * v_gain - x_errgain * (dis_safe - dis_rel)    

            out_vel = ego_vel + acceleration
   
        if self.object[0] and len(local_obs_info) != 0: #ACC ON_obstacle     
            print("ACC ON Obstacle")                    
            Obstacle = [local_obs_info[self.object[1]][1], local_obs_info[self.object[1]][2], local_obs_info[self.object[1]][3]]
            
            dis_safe = ego_vel* time_gap + default_space
            dis_rel = math.sqrt(pow(Obstacle[0],2) + pow(Obstacle[1],2))            
            vel_rel = (Obstacle[2] - ego_vel)
            acceleration = vel_rel * v_gain - x_errgain * (dis_safe - dis_rel)    

            out_vel = ego_vel + acceleration           

        return out_vel * 3.6