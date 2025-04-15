#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import rospy
import copy
from math import sqrt, pow
from geometry_msgs.msg import PoseStamped, PoseWithCovarianceStamped
from nav_msgs.msg import Path
import time

# 현재 파일 경로 추가
current_path = os.path.dirname(os.path.realpath(__file__))
sys.path.append(current_path)

from lib.mgeo.class_defs import *  # MGeo 라이브러리 임포트

class dijkstra_path_pub:
    def __init__(self):
        rospy.init_node('dijkstra_path_pub', anonymous=True)

        # Global Path 퍼블리셔
        self.global_path_pub = rospy.Publisher('/global_path', Path, queue_size=1)

        # 초기 위치 및 목표 위치 구독
        rospy.Subscriber('/move_base_simple/goal', PoseStamped, self.goal_callback)
        rospy.Subscriber('/initialpose', PoseWithCovarianceStamped, self.init_callback)

        # (1) MGeo 데이터 로드
        load_path = os.path.normpath(os.path.join(current_path, 'lib/mgeo_data/R_KR_PG_K-City'))
        mgeo_planner_map = MGeo.create_instance_from_json(load_path)

        node_set = mgeo_planner_map.node_set
        link_set = mgeo_planner_map.link_set

        self.nodes = node_set.nodes
        self.links = link_set.lines

        self.global_planner = Dijkstra(self.nodes, self.links)

        self.is_goal_pose = False
        self.is_init_pose = False

        while not (self.is_goal_pose and self.is_init_pose):
            rospy.loginfo('Waiting for goal pose and init pose data...')
            rospy.sleep(1)

        self.global_path_msg = self.calc_dijkstra_path_node(self.start_node, self.end_node)

        rate = rospy.Rate(10)  # 10Hz
        while not rospy.is_shutdown():
            self.global_path_pub.publish(self.global_path_msg)
            rate.sleep()

    def init_callback(self, msg):
        """ 초기 위치 설정 (2D Pose Estimate에서 받아옴) """
        rospy.loginfo("=== INIT CALLBACK TRIGGERED ===")
        rospy.loginfo("Received /initialpose: x={}, y={}".format(msg.pose.pose.position.x, msg.pose.pose.position.y))

        min_dis = float('inf')
        nearest_node = None

        for node_id, node in self.nodes.items():
            distance = sqrt(pow(msg.pose.pose.position.x - node.point[0], 2) + pow(msg.pose.pose.position.y - node.point[1], 2))
            if distance < min_dis:
                min_dis = distance
                nearest_node = node_id

        self.start_node = nearest_node
        rospy.loginfo("Start Node set to: {}".format(self.start_node))
        self.is_init_pose = True

    def goal_callback(self, msg):
        """ 목표 위치 설정 (2D Nav Goal에서 받아옴) """
        rospy.loginfo("=== GOAL CALLBACK TRIGGERED ===")
        rospy.loginfo("Received /move_base_simple/goal: x={}, y={}".format(msg.pose.position.x, msg.pose.position.y))

        min_dis = float('inf')
        nearest_node = None

        for node_id, node in self.nodes.items():
            distance = sqrt(pow(msg.pose.position.x - node.point[0], 2) + pow(msg.pose.position.y - node.point[1], 2))
            if distance < min_dis:
                min_dis = distance
                nearest_node = node_id

        self.end_node = nearest_node
        rospy.loginfo("End Node set to: {}".format(self.end_node))
        self.is_goal_pose = True

    def calc_dijkstra_path_node(self, start_node, end_node):
        """ 다익스트라 알고리즘을 이용해 최단 경로 생성 """
        start_time = time.time()
        result, path = self.global_planner.find_shortest_path(start_node, end_node)
        end_time = time.time()
        rospy.loginfo("Path-finding took: %.6f seconds", end_time - start_time)

        out_path = Path()
        out_path.header.frame_id = 'map'

        for point in path['point_path']:
            pose = PoseStamped()
            pose.pose.position.x = point[0]
            pose.pose.position.y = point[1]
            pose.pose.position.z = point[2]
            out_path.poses.append(pose)

        return out_path

class Dijkstra:
    def __init__(self, nodes, links):
        self.nodes = nodes
        self.links = links
        self.weight = self.get_weight_matrix()

    def get_weight_matrix(self):
        """ (3) weight 값 계산 """
        weight = {from_node_id: {to_node_id: float('inf') for to_node_id in self.nodes.keys()} for from_node_id in self.nodes.keys()}

        for from_node_id, from_node in self.nodes.items():
            weight[from_node_id][from_node_id] = 0

            for to_node in from_node.get_to_nodes():
                shortest_link, min_cost = self.find_shortest_link_leading_to_node(from_node, to_node)
                weight[from_node_id][to_node.idx] = min_cost

        return weight

    def find_shortest_link_leading_to_node(self, from_node, to_node):
        """ (3) 최단거리 Link 찾기 """
        min_cost = float('inf')
        shortest_link = None

        for link in from_node.get_to_links():
            if link.to_node.idx == to_node.idx:
                cost = sum(
                    sqrt(pow(link.points[i + 1][0] - link.points[i][0], 2) + pow(link.points[i + 1][1] - link.points[i][1], 2))
                    for i in range(len(link.points) - 1)
                )
                if cost < min_cost:
                    min_cost = cost
                    shortest_link = link

        return shortest_link, min_cost

    def find_nearest_node_idx(self, distance, s):
        """ (4) 방문하지 않은 노드 중 가장 가까운 노드 찾기 """
        min_value = float('inf')
        min_idx = None

        for idx in self.nodes.keys():
            if distance[idx] < min_value and not s[idx]:
                min_value = distance[idx]
                min_idx = idx

        return min_idx

    def find_shortest_path(self, start_node_idx, end_node_idx):
        """ (5) 다익스트라 알고리즘 수행 """
        s = {node_id: False for node_id in self.nodes.keys()}
        from_node = {node_id: start_node_idx for node_id in self.nodes.keys()}

        s[start_node_idx] = True
        distance = copy.deepcopy(self.weight[start_node_idx])

        for _ in range(len(self.nodes.keys()) - 1):
            selected_node_idx = self.find_nearest_node_idx(distance, s)
            if selected_node_idx is None:
                break
            s[selected_node_idx] = True
            for to_node_idx in self.nodes.keys():
                if not s[to_node_idx]:
                    distance_candidate = distance[selected_node_idx] + self.weight[selected_node_idx][to_node_idx]
                    if distance_candidate < distance[to_node_idx]:
                        distance[to_node_idx] = distance_candidate
                        from_node[to_node_idx] = selected_node_idx

        tracking_idx = end_node_idx
        node_path = [end_node_idx]

        while tracking_idx != start_node_idx:
            tracking_idx = from_node[tracking_idx]
            node_path.append(tracking_idx)

        node_path.reverse()

        link_path = []
        for i in range(len(node_path) - 1):
            from_node_idx = node_path[i]
            to_node_idx = node_path[i + 1]

            from_node = self.nodes[from_node_idx]
            to_node = self.nodes[to_node_idx]

            shortest_link, _ = self.find_shortest_link_leading_to_node(from_node, to_node)
            if shortest_link:
                link_path.append(shortest_link.idx)

        point_path = []
        for link_id in link_path:
            link = self.links[link_id]
            for point in link.points:
                point_path.append([point[0], point[1], 0])

        return True, {'node_path': node_path, 'link_path': link_path, 'point_path': point_path}

if __name__ == '__main__':
    dijkstra_path_pub = dijkstra_path_pub()

