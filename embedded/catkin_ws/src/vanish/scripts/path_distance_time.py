#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import math
import numpy as np

# MGeo 관련 import (사용자 환경에 맞게 조정)
current_path = os.path.dirname(os.path.realpath(__file__))
sys.path.append(current_path)
from lib.mgeo.class_defs import MGeo
from lib.mgeo.class_defs.node import Node
from lib.mgeo.class_defs.line import Line

# A* 관련
from astar import AStar

class GlobalPathCalculator(object):
    """
    start=(sx, sy), goal=(gx, gy)를 받아
    1) MGeo + A* 경로 탐색
    2) 경로 길이(m)
    3) 30km/h 평균 속도로 주행 시 소요 시간(초)
    를 계산해 주는 클래스
    """

    def __init__(self, mgeo_data_path=None):
        """
        mgeo_data_path: MGeo JSON이 있는 경로
                        (None이면 디폴트 경로 사용)
        """
        if mgeo_data_path is None:
            # 예시: lib/mgeo_data/R_KR_PG_K-City
            mgeo_data_path = os.path.join(current_path, 'lib/mgeo_data/R_KR_PG_K-City')
        
        # MGeo 로드
        mgeo_data_path = os.path.normpath(mgeo_data_path)
        self.mgeo_planner_map = MGeo.create_instance_from_json(mgeo_data_path)

        # node_set / line_set
        self.node_set = self.mgeo_planner_map.node_set
        self.line_set = self.mgeo_planner_map.link_set

        # dict
        self.nodes = self.node_set.nodes
        self.links = self.line_set.lines

        # A* 객체
        self.global_planner = AStar(self.nodes, self.links)

    def compute_route_time(self, start_xy, goal_xy, speed_kmh=30.0):
        """
        주된 함수:
          1) A*로 경로 생성
          2) 경로 길이 계산
          3) speed_kmh(기본 30km/h)로 달릴 때 걸리는 시간(초) 반환
        
        return: (total_length_m, travel_time_s, path_points)
          - total_length_m: 경로 길이 (m)
          - travel_time_s:  주행 소요 시간 (초)
          - path_points:    (x, y, z) 튜플 리스트
        """
        # (필요 시 매번 MGeo를 리셋하려면 self.reload_mgeo() 등 사용)
        
        node_id_start = "start_node"
        node_id_end   = "end_node"

        start_link, start_closest_pt = self.find_closest_link_and_point(start_xy)
        end_link,   end_closest_pt   = self.find_closest_link_and_point(goal_xy)

        node_start = self.create_node_with_id(node_id_start, start_closest_pt)
        node_end   = self.create_node_with_id(node_id_end,   end_closest_pt)

        # 기존 링크 분할
        new_links_for_start = self.split_link_at_point(start_link, node_start)
        self.line_set.remove_line(start_link)
        for ln in new_links_for_start:
            self.line_set.append_line(ln)

        new_links_for_end = self.split_link_at_point(end_link, node_end)
        self.line_set.remove_line(end_link)
        for ln in new_links_for_end:
            self.line_set.append_line(ln)

        # A* 재생성
        self.nodes = self.node_set.nodes  # 업데이트
        self.links = self.line_set.lines
        self.global_planner = AStar(self.nodes, self.links)

        result, path = self.global_planner.find_shortest_path(node_id_start, node_id_end)
        if not result:
            print("[WARN] A* failed to find path from {} to {}".format(node_id_start, node_id_end))
            return 0.0, 0.0, []

        point_path = path['point_path']  # [(x,y,z), (x,y,z), ...]

        total_length = self.compute_path_length(point_path)

        # km/h -> m/s
        speed_m_s = speed_kmh * 1000.0 / 3600.0
        travel_time_s = total_length / speed_m_s

        return total_length, travel_time_s, point_path

    def compute_path_length(self, path_points):
        """
        path_points: [(x1,y1,z1), (x2,y2,z2), ...]
        """
        total_dist = 0.0
        for i in range(1, len(path_points)):
            x1, y1, z1 = path_points[i-1]
            x2, y2, z2 = path_points[i]
            dx = x2 - x1
            dy = y2 - y1
            dz = z2 - z1
            dist = math.sqrt(dx*dx + dy*dy + dz*dz)
            total_dist += dist
        return total_dist

    def reload_mgeo(self):
        """
        MGeo 원본 다시 로드 (start/goal 삽입 등으로 맵이 변형된 경우 복원)
        """
        load_path = os.path.join(current_path, 'lib/mgeo_data/R_KR_PG_K-City')
        load_path = os.path.normpath(load_path)
        mgeo_planner_map = MGeo.create_instance_from_json(load_path)
        self.node_set = mgeo_planner_map.node_set
        self.line_set = mgeo_planner_map.link_set
        self.nodes = self.node_set.nodes
        self.links = self.line_set.lines
        self.global_planner = AStar(self.nodes, self.links)

    def find_closest_link_and_point(self, xy):
        """
        (x,y)에 가장 가까운 link + link 상의 최근접 좌표(pt) 반환
        """
        x, y = xy
        min_dist = float('inf')
        closest_link, closest_point = None, None

        for ln in self.line_set.lines.values():
            for pt in ln.points:
                dx = x - pt[0]
                dy = y - pt[1]
                dist_sq = dx*dx + dy*dy
                if dist_sq < min_dist:
                    min_dist = dist_sq
                    closest_link = ln
                    closest_point = pt
        return closest_link, closest_point

    def create_node_with_id(self, node_id, pt_xyz):
        new_node = Node(node_id)
        if len(pt_xyz) == 3:
            new_node.point = np.array(pt_xyz)
        else:
            new_node.point = np.array([pt_xyz[0], pt_xyz[1], 0.0])

        self.node_set.append_node(new_node, create_new_key=False)
        return new_node

    def split_link_at_point(self, link, new_node):
        old_points = link.points

        split_idx = -1
        for i in range(len(old_points)):
            if np.allclose(old_points[i], new_node.point, atol=1e-7):
                split_idx = i
                break
        if split_idx < 0:
            print("[WARN] split point not found in link={}".format(link.idx))
            return []

        pA = old_points[:split_idx+1]
        pB = old_points[split_idx:]

        linkA_id = str(link.idx) + "_A"
        linkA = link.__class__(None, linkA_id)
        linkA.set_points(pA)
        linkA.set_from_node(link.from_node)
        linkA.set_to_node(new_node)

        if link.from_node and (link in link.from_node.to_links):
            link.from_node.to_links.remove(link)
            link.from_node.to_links.append(linkA)
        new_node.from_links.append(linkA)

        linkA.calculate_cost()

        linkB_id = str(link.idx) + "_B"
        linkB = link.__class__(None, linkB_id)
        linkB.set_points(pB)
        linkB.set_from_node(new_node)
        linkB.set_to_node(link.to_node)

        if link.to_node and (link in link.to_node.from_links):
            link.to_node.from_links.remove(link)
            link.to_node.from_links.append(linkB)
        new_node.to_links.append(linkB)

        linkB.calculate_cost()

        return [linkA, linkB]

if __name__ == '__main__':
    planner = GlobalPathCalculator()

    start_xy = (100.0, 50.0)
    goal_xy  = (200.0, 130.0)

    dist_m, time_s, path_pts = planner.compute_route_time(start_xy, goal_xy, speed_kmh=30.0)

    print("경로 길이: {:.2f} m, 주행 시간(30km/h): {:.2f} s".format(dist_m, time_s))
    print("경로 점 개수: {}".format(len(path_pts)))
