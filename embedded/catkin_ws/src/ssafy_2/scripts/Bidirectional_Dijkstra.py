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
        # 정방향 가중치 행렬
        self.weight = self.get_weight_matrix()
        # 역방향 가중치 행렬
        self.reverse_weight = self.get_reverse_weight_matrix()

    def get_weight_matrix(self):
        """
        각 노드(from_node)에서 갈 수 있는 to_node로의 최소 이동 비용(거리)을 계산.
        (정방향)
        """
        weight = {
            from_node_id: {to_node_id: float('inf') for to_node_id in self.nodes.keys()}
            for from_node_id in self.nodes.keys()
        }

        for from_node_id, from_node in self.nodes.items():
            # 자기 자신으로 가는 비용은 0
            weight[from_node_id][from_node_id] = 0.0

            for to_node in from_node.get_to_nodes():
                shortest_link, min_cost = self.find_shortest_link_leading_to_node(from_node, to_node)
                if shortest_link is not None:
                    weight[from_node_id][to_node.idx] = min_cost

        return weight

    def get_reverse_weight_matrix(self):
        """
        역방향 그래프(Reverse Graph)에 대한 가중치 계산.
        즉, from_node->to_node 링크가 있다면, reverse_weight[to_node][from_node] 에 비용을 저장
        """
        reverse_weight = {
            from_node_id: {to_node_id: float('inf') for to_node_id in self.nodes.keys()}
            for from_node_id in self.nodes.keys()
        }

        for from_node_id, from_node in self.nodes.items():
            # 자기 자신으로 가는 비용은 0
            reverse_weight[from_node_id][from_node_id] = 0.0

            for to_node in from_node.get_to_nodes():
                shortest_link, min_cost = self.find_shortest_link_leading_to_node(from_node, to_node)
                if shortest_link is not None:
                    # 역방향 그래프에서는 to_node->from_node 가중치를 기록
                    reverse_weight[to_node.idx][from_node_id] = min_cost

        return reverse_weight

    def find_shortest_link_leading_to_node(self, from_node, to_node):
        """
        from_node에서 to_node로 가는 '모든' 링크 중 가장 짧은 링크를 찾아 
        (링크 길이, 해당 링크 객체)를 반환
        """
        min_cost = float('inf')
        shortest_link = None

        for link in from_node.get_to_links():
            if link.to_node.idx == to_node.idx:
                # 해당 링크 상 모든 점을 순회하며 길이 계산
                dist = 0.0
                for i in range(len(link.points) - 1):
                    x1, y1 = link.points[i][0], link.points[i][1]
                    x2, y2 = link.points[i + 1][0], link.points[i + 1][1]
                    dist += sqrt(pow(x2 - x1, 2) + pow(y2 - y1, 2))

                if dist < min_cost:
                    min_cost = dist
                    shortest_link = link

        return shortest_link, min_cost

    def find_nearest_node_idx(self, distance, visited):
        """
        방문되지 않은 노드 중, distance가 가장 작은 노드의 idx를 반환
        """
        min_val = float('inf')
        min_idx = None

        for node_id in self.nodes.keys():
            if not visited[node_id] and distance[node_id] < min_val:
                min_val = distance[node_id]
                min_idx = node_id

        return min_idx

    def find_shortest_path(self, start_node_idx, end_node_idx):
        """
        이중(양방향) 다익스트라 알고리즘을 이용해, 
        start_node_idx ~ end_node_idx 경로를 구한다.
        """
        # 특수 케이스: 시작과 목표가 같다면
        if start_node_idx == end_node_idx:
            # 경로 없이 자기 자신만 포함
            return True, {
                'node_path': [start_node_idx],
                'link_path': [],
                'point_path': [[
                    self.nodes[start_node_idx].point[0],
                    self.nodes[start_node_idx].point[1],
                    0.0
                ]]
            }

        # -----------------------
        # 1) Forward / Backward 초기화
        # -----------------------
        visited_fwd = {node_id: False for node_id in self.nodes.keys()}
        visited_bwd = {node_id: False for node_id in self.nodes.keys()}

        # start_node에서 각 노드까지의 거리 (정방향 weight)
        dist_fwd = copy.deepcopy(self.weight[start_node_idx])
        # end_node에서 각 노드까지의 거리 (역방향 weight 이용)
        dist_bwd = copy.deepcopy(self.reverse_weight[end_node_idx])

        # 경로 복원용
        from_fwd = {node_id: start_node_idx for node_id in self.nodes.keys()}
        from_bwd = {node_id: end_node_idx for node_id in self.nodes.keys()}

        visited_fwd[start_node_idx] = True
        visited_bwd[end_node_idx] = True

        meeting_node = None
        best_distance = float('inf')

        # -----------------------
        # 2) F/B 교대로 탐색
        # -----------------------
        for _ in range(len(self.nodes.keys())):
            # (a) Forward 쪽에서 최소 distance 노드 선택
            curr_fwd = self.find_nearest_node_idx(dist_fwd, visited_fwd)
            if curr_fwd is not None:
                visited_fwd[curr_fwd] = True

                # 인접 노드 업데이트 (정방향)
                for nxt in self.nodes.keys():
                    if not visited_fwd[nxt]:
                        new_dist = dist_fwd[curr_fwd] + self.weight[curr_fwd][nxt]
                        if new_dist < dist_fwd[nxt]:
                            dist_fwd[nxt] = new_dist
                            from_fwd[nxt] = curr_fwd

                # Backward 쪽과 만났는지 확인
                for node_id in self.nodes.keys():
                    if visited_bwd[node_id]:
                        # forward(current_fwd까지 온 거리) + backward(node_id까지 온 거리)
                        #  => 실제로는 forward[curr_fwd] + dist_bwd[node_id] 가 아니라
                        #     dist_fwd[node_id] + dist_bwd[node_id] 또는
                        #     dist_fwd[curr_fwd] + dist_bwd[curr_fwd] (둘 다 가능)
                        #  보통은 "같은 노드"를 meeting_node로 본다.
                        if dist_fwd[node_id] + dist_bwd[node_id] < best_distance:
                            best_distance = dist_fwd[node_id] + dist_bwd[node_id]
                            meeting_node = node_id

            # (b) Backward 쪽에서 최소 distance 노드 선택
            curr_bwd = self.find_nearest_node_idx(dist_bwd, visited_bwd)
            if curr_bwd is not None:
                visited_bwd[curr_bwd] = True

                # 인접 노드 업데이트 (역방향)
                for nxt in self.nodes.keys():
                    if not visited_bwd[nxt]:
                        new_dist = dist_bwd[curr_bwd] + self.reverse_weight[curr_bwd][nxt]
                        if new_dist < dist_bwd[nxt]:
                            dist_bwd[nxt] = new_dist
                            from_bwd[nxt] = curr_bwd

                # Forward 쪽과 만났는지 확인
                for node_id in self.nodes.keys():
                    if visited_fwd[node_id]:
                        if dist_fwd[node_id] + dist_bwd[node_id] < best_distance:
                            best_distance = dist_fwd[node_id] + dist_bwd[node_id]
                            meeting_node = node_id

            # 이미 만난 노드가 있다면 중단 (더 이상 갱신 이득이 없을 가능성↑)
            if meeting_node is not None:
                break

        # meeting_node를 찾지 못했다면, start->end 경로가 없는 경우
        if meeting_node is None:
            return False, {}

        # -----------------------
        # 3) 경로 복원
        # -----------------------
        # Forward: meeting_node부터 start_node까지
        path_fwd = []
        idx = meeting_node
        while idx != start_node_idx:
            path_fwd.append(idx)
            idx = from_fwd[idx]
        path_fwd.append(start_node_idx)
        path_fwd.reverse()

        # Backward: meeting_node부터 end_node까지
        path_bwd = []
        idx = from_bwd[meeting_node]
        while idx != end_node_idx:
            path_bwd.append(idx)
            idx = from_bwd[idx]
        path_bwd.append(end_node_idx)

        # 최종 node_path
        node_path = path_fwd + path_bwd

        # -----------------------
        # 4) link_path & point_path 구성
        # -----------------------
        link_path = []
        for i in range(len(node_path) - 1):
            f_node = self.nodes[node_path[i]]
            t_node = self.nodes[node_path[i + 1]]
            shortest_link, _ = self.find_shortest_link_leading_to_node(f_node, t_node)
            if shortest_link:
                link_path.append(shortest_link.idx)

        point_path = []
        for link_id in link_path:
            link = self.links[link_id]
            # 링크의 모든 포인트를 누적
            for pt in link.points:
                point_path.append([pt[0], pt[1], 0.0])  # z는 일단 0으로 처리

        return True, {
            'node_path': node_path,
            'link_path': link_path,
            'point_path': point_path
        }


if __name__ == '__main__':
    dijkstra_path_pub = dijkstra_path_pub()

