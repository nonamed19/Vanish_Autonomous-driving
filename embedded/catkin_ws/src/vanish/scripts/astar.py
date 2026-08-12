#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import copy
import heapq
from math import sqrt, pow

class AStar:
    """
    Dijkstra -> A* 로 수정한 클래스.
    1) weight_matrix로 from_node->to_node 이동비용을 계산
    2) find_shortest_path()에서 A* 알고리즘 적용
    """
    def __init__(self, nodes, links):
        self.nodes = nodes
        self.links = links
        # (1) from_node->to_node 비용 계산 (inf 아닌 곳만 "이웃")
        self.weight = self.get_weight_matrix()

    def get_weight_matrix(self):
        """
        노드 간 이동비용(거리)을 담은 dict.
        weight[a][b] = (a->b 이동코스트 or inf)
        """
        weight = {
            from_node_id: {to_node_id: float('inf') for to_node_id in self.nodes.keys()}
            for from_node_id in self.nodes.keys()
        }

        for from_node_id, from_node in self.nodes.items():
            # 자기 자신->자신 비용=0
            weight[from_node_id][from_node_id] = 0.0

            # from_node에서 갈 수 있는 모든 to_node
            for to_node in from_node.get_to_nodes():
                shortest_link, min_cost = self.find_shortest_link_leading_to_node(from_node, to_node)
                weight[from_node_id][to_node.idx] = min_cost

        return weight

    def find_shortest_link_leading_to_node(self, from_node, to_node):
        """ from_node -> to_node 중 가장 짧은 link를 찾음 """
        min_cost = float('inf')
        shortest_link = None

        for link in from_node.get_to_links():
            if link.to_node.idx == to_node.idx:
                cost = 0.0
                for i in range(len(link.points) - 1):
                    x1, y1 = link.points[i][0], link.points[i][1]
                    x2, y2 = link.points[i+1][0], link.points[i+1][1]
                    cost += sqrt(pow(x2 - x1, 2) + pow(y2 - y1, 2))

                if cost < min_cost:
                    min_cost = cost
                    shortest_link = link

        return shortest_link, min_cost

    def find_shortest_path(self, start_node_idx, end_node_idx):
        """
        A* 알고리즘으로 start_node ~ end_node 최단 경로 찾기
        return:
          result(True/False), { 'node_path':..., 'link_path':..., 'point_path':... }
        """
        # 특수 케이스: 시작==목표
        if start_node_idx == end_node_idx:
            return True, {
                'node_path': [start_node_idx],
                'link_path': [],
                'point_path': [
                    [self.nodes[start_node_idx].point[0],
                     self.nodes[start_node_idx].point[1],
                     0.0]
                ]
            }

        # open/closed set
        open_set = set([start_node_idx])
        closed_set = set()

        # g(n): 시작~현재 노드까지 실제 비용
        g_score = {n: float('inf') for n in self.nodes.keys()}
        g_score[start_node_idx] = 0.0

        # f(n)=g(n)+h(n): 현재까지 비용 + 휴리스틱
        f_score = {n: float('inf') for n in self.nodes.keys()}
        f_score[start_node_idx] = self.heuristic(self.nodes[start_node_idx], self.nodes[end_node_idx])

        # 경로 추적용
        came_from = {}  # { node_id: previous_node_id }

        while open_set:
            # f_score가 가장 작은 노드를 꺼냄
            current = min(open_set, key=lambda x: f_score[x])

            # 목표 도달?
            if current == end_node_idx:
                return True, self.reconstruct_path(came_from, current, start_node_idx, end_node_idx)

            open_set.remove(current)
            closed_set.add(current)

            # 이웃 노드 순회
            for neighbor in self.nodes.keys():
                # 비용이 inf가 아니면 neighbor로 갈 수 있음
                cost = self.weight[current][neighbor]
                if cost == float('inf'):
                    continue
                if neighbor in closed_set:
                    continue

                tentative_g = g_score[current] + cost
                if tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    # f(n) = g(n) + h(n)
                    f_score[neighbor] = tentative_g + self.heuristic(self.nodes[neighbor], self.nodes[end_node_idx])

                    if neighbor not in open_set:
                        open_set.add(neighbor)

        # 실패
        return False, {}

    def reconstruct_path(self, came_from, current, start_node_idx, end_node_idx):
        """
        A* 완료 후, 'came_from' 정보로 node_path / link_path / point_path 구성
        """
        node_path = [current]
        while current in came_from:
            current = came_from[current]
            node_path.append(current)
        node_path.reverse()

        # link_path: 연속된 node 쌍에 대해 find_shortest_link_leading_to_node
        link_path = []
        for i in range(len(node_path) - 1):
            f_node_id = node_path[i]
            t_node_id = node_path[i+1]
            f_node_obj = self.nodes[f_node_id]
            t_node_obj = self.nodes[t_node_id]

            shortest_link, _ = self.find_shortest_link_leading_to_node(f_node_obj, t_node_obj)
            if shortest_link:
                link_path.append(shortest_link.idx)

        # point_path: link_path를 순서대로 이어붙이기
        point_path = []
        for i, link_id in enumerate(link_path):
            link_obj = self.links[link_id]
            pts = link_obj.points  # [(x,y,z), (x,y,z), ...]
            # 중복 제거: 첫 링크는 모두 추가, 이후 링크는 첫 점을 빼고 추가
            if i == 0:
                for p in pts:
                    point_path.append([p[0], p[1], p[2]])
            else:
                for p_idx, p in enumerate(pts):
                    if p_idx == 0:
                        continue
                    point_path.append([p[0], p[1], p[2]])

        return {
            'node_path': node_path,
            'link_path': link_path,
            'point_path': point_path
        }

    def heuristic(self, node_a, node_b):
        """
        휴리스틱 함수: 단순 유클리드 거리(2D)
        node.point = (x, y)
        """
        ax, ay = node_a.point[0], node_a.point[1]
        bx, by = node_b.point[0], node_b.point[1]
        return sqrt((bx - ax)**2 + (by - ay)**2)