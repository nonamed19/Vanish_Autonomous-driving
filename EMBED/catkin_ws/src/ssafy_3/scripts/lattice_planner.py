#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import sys
import numpy as np
from math import cos, sin, atan2, sqrt, pow
from morai_msgs.msg import EgoVehicleStatus, ObjectStatusList
from nav_msgs.msg import Path
from geometry_msgs.msg import PoseStamped

class latticePlanner:
    def __init__(self):
        rospy.init_node('lattice_planner', anonymous=True)

        arg = rospy.myargv(argv=sys.argv)
        object_topic_name = arg[1]

        rospy.Subscriber("/local_path", Path, self.path_callback)
        rospy.Subscriber("/Ego_topic", EgoVehicleStatus, self.status_callback)
        rospy.Subscriber(object_topic_name, ObjectStatusList, self.object_callback)

        self.local_path_pub = rospy.Publisher("/local_path", Path, queue_size=1)

        self.is_path = False
        self.is_status = False
        self.is_obj = False

        rate = rospy.Rate(30)
        while not rospy.is_shutdown():
            if self.is_path and self.is_status and self.is_obj:
                # rospy.loginfo("현재 상태: path=True, status=True, obj=True")
                if self.checkObject(self.local_path, self.object_data):
                    # rospy.loginfo("\n\U0001F4A5 장애물 감지됨! → 회피 경로 생성 시작")
                    lattice_path = self.latticePlanner(self.local_path, self.status_msg)
                    lattice_path_index = self.collision_check(self.object_data, lattice_path)

                    if lattice_path_index < len(lattice_path):
                        # rospy.loginfo("\u2705 lattice_path 선택됨 → /local_path에 회피 경로 publish 중!")
                        self.local_path_pub.publish(lattice_path[lattice_path_index])
                    else:
                        # rospy.logwarn("⚠️ 선택된 index가 범위를 벗어남! 기존 경로 유지")
                        self.local_path_pub.publish(self.local_path)
                else:
                    # rospy.loginfo("\U0001F697 충돌 없음 → 기존 경로 유지")
                    self.local_path_pub.publish(self.local_path)
            rate.sleep()

    def path_callback(self, msg):
        self.is_path = True
        self.local_path = msg

    def status_callback(self, msg):
        self.is_status = True
        self.status_msg = msg

    def object_callback(self, msg):
        self.is_obj = True
        self.object_data = msg

    def checkObject(self, ref_path, object_data):
        is_crash = False
        if hasattr(object_data, 'npc_list') and len(object_data.npc_list) > 0:
            # rospy.logwarn("📦 받은 NPC 수: %d", len(object_data.npc_list))
            for npc in object_data.npc_list:
                obs_x = npc.position.x
                obs_y = npc.position.y
                for i, path in enumerate(ref_path.poses):
                    path_x = path.pose.position.x
                    path_y = path.pose.position.y
                    dis = sqrt(pow(obs_x - path_x, 2) + pow(obs_y - path_y, 2))
                    if dis < 2.5:
                        # rospy.logwarn("\U0001F4A5 충돌 감지! NPC와 거리: %.2f", dis)
                        is_crash = True
                        break
                if is_crash:
                    break
        # else:
            # rospy.logwarn("⚠️ NPC 리스트가 비어 있습니다!")
        return is_crash

    def collision_check(self, object_data, out_path):
        selected_lane = -1
        lane_weight = [3, 2, 1, 1, 2, 3]
        for npc in object_data.npc_list:
            for path_num in range(len(out_path)):
                for path_pos in out_path[path_num].poses:
                    dis = sqrt(pow(npc.position.x - path_pos.pose.position.x, 2) +
                               pow(npc.position.y - path_pos.pose.position.y, 2))
                    if dis < 1.5:
                        # rospy.logwarn("\U0001F6A8 충돌된 경로 #%d 거리 %.2f → 가중치 +100", path_num, dis)
                        lane_weight[path_num] += 100
                        break
        selected_lane = lane_weight.index(min(lane_weight))
        # rospy.loginfo("\u2714 선택된 차선 index: %d (가중치 배열: %s)", selected_lane, str(lane_weight))
        return selected_lane

    def latticePlanner(self, ref_path, vehicle_status):
        out_path = []
        vehicle_pose_x = vehicle_status.position.x
        vehicle_pose_y = vehicle_status.position.y
        vehicle_velocity = vehicle_status.velocity.x * 3.6
        look_distance = int(vehicle_velocity * 0.2 * 2)
        if look_distance < 20:
            look_distance = 20

        if len(ref_path.poses) > look_distance:
            global_ref_start_point = (ref_path.poses[0].pose.position.x, ref_path.poses[0].pose.position.y)
            global_ref_start_next_point = (ref_path.poses[1].pose.position.x, ref_path.poses[1].pose.position.y)
            end_idx = min(look_distance * 2, len(ref_path.poses) - 1)
            global_ref_end_point = (ref_path.poses[end_idx].pose.position.x, ref_path.poses[end_idx].pose.position.y)
            theta = atan2(global_ref_start_next_point[1] - global_ref_start_point[1],
                          global_ref_start_next_point[0] - global_ref_start_point[0])
            translation = [global_ref_start_point[0], global_ref_start_point[1]]
            trans_matrix = np.array([[cos(theta), -sin(theta), translation[0]],
                                     [sin(theta), cos(theta), translation[1]],
                                     [0, 0, 1]])
            det_trans_matrix = np.array([[trans_matrix[0][0], trans_matrix[1][0],
                                          -(trans_matrix[0][0] * translation[0] + trans_matrix[1][0] * translation[1])],
                                         [trans_matrix[0][1], trans_matrix[1][1],
                                          -(trans_matrix[0][1] * translation[0] + trans_matrix[1][1] * translation[1])],
                                         [0, 0, 1]])
            world_end_point = np.array([[global_ref_end_point[0]], [global_ref_end_point[1]], [1]])
            local_end_point = np.dot(det_trans_matrix, world_end_point)
            lane_off_set = [-3.0, -1.75, -1, 1, 1.75, 3.0]
            local_lattice_points = []
            for i in range(len(lane_off_set)):
                local_lattice_points.append([local_end_point[0][0], local_end_point[1][0] + lane_off_set[i], 1])

            for end_point in local_lattice_points:
                path = Path()
                path.header.frame_id = '/map'
                for t in range(50):
                    x = float(t) / 49.0
                    y = end_point[1] * pow(x, 3)
                    local_result = np.array([[x * local_end_point[0][0]], [y], [1]])
                    global_result = np.dot(trans_matrix, local_result)
                    pose = PoseStamped()
                    pose.pose.position.x = global_result[0][0]
                    pose.pose.position.y = global_result[1][0]
                    pose.pose.position.z = 0
                    pose.pose.orientation.w = 1.0
                    path.poses.append(pose)
                out_path.append(path)

        return out_path

if __name__ == '__main__':
    try:
        latticePlanner()
    except rospy.ROSInterruptException:
        pass