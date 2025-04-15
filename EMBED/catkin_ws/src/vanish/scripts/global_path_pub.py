#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import rospy
from math import sqrt, pow
from geometry_msgs.msg import PoseStamped
from nav_msgs.msg import Path, Odometry
import numpy as np

from astar import AStar  # 외부 A* 알고리즘

# MGeo 관련
current_path = os.path.dirname(os.path.realpath(__file__))
sys.path.append(current_path)

from lib.mgeo.class_defs import MGeo  # MGeo.create_instance_from_json(...) 사용
from lib.mgeo.class_defs.node import Node
from lib.mgeo.class_defs.line import Line
# NodeSet, Node, LineSet, Line 등을 직접 import해서 쓰거나
# from lib.mgeo.class_defs.node_set import NodeSet
# from lib.mgeo.class_defs.node import Node
# from lib.mgeo.class_defs.line_set import LineSet
# from lib.mgeo.class_defs.line import Line
# ... 등등 실제 경로에 맞춰 import 해야 함

class FullGlobalPlanner:
    def __init__(self):
        rospy.init_node('full_global_path_pub', anonymous=True)

        self.global_path_pub = rospy.Publisher('/global_path', Path, queue_size=1)
        rospy.Subscriber('/odom', Odometry, self.odom_callback)
        rospy.Subscriber('/move_base_simple/goal', PoseStamped, self.goal_callback)

        # MGeo 데이터 로드
        load_path = os.path.normpath(os.path.join(current_path, 'lib/mgeo_data/R_KR_PG_K-City'))
        mgeo_planner_map = MGeo.create_instance_from_json(load_path)

        # node_set / line_set (NodeSet, LineSet)
        self.node_set = mgeo_planner_map.node_set  # NodeSet()
        self.line_set = mgeo_planner_map.link_set  # LineSet()

        # A*에서 참조할 노드/링크 dict
        self.nodes = self.node_set.nodes  # 예: { 'nd0': Node(...), 'nd1': Node(...), ... }
        self.links = self.line_set.lines  # 예: { 'ln0': Line(...), 'ln1': Line(...), ... }

        # A* planner
        self.global_planner = AStar(self.nodes, self.links)

        self.current_pos = None  # (x, y)
        self.goal_pos   = None  # (x, y)
        self.path_ready = False

        rate = rospy.Rate(10)
        while not rospy.is_shutdown():
            if self.path_ready:
                self.publish_full_path()
                self.path_ready = False
            rate.sleep()

    def odom_callback(self, msg):
        x = msg.pose.pose.position.x
        y = msg.pose.pose.position.y
        self.current_pos = (x, y)
        #rospy.loginfo("[ODOM] Current pos: (%.2f, %.2f)" % (x, y))

    def goal_callback(self, msg):
        x = msg.pose.position.x
        y = msg.pose.position.y
        self.goal_pos = (x, y)
        rospy.loginfo("[GOAL] Goal pos: (%.2f, %.2f)" % (x, y))

        if self.current_pos is not None:
            self.path_ready = True
        
        load_path = os.path.normpath(os.path.join(current_path, 'lib/mgeo_data/R_KR_PG_K-City'))
        mgeo_planner_map = MGeo.create_instance_from_json(load_path)

        # node_set / line_set (NodeSet, LineSet)
        self.node_set = mgeo_planner_map.node_set  # NodeSet()
        self.line_set = mgeo_planner_map.link_set  # LineSet()

        # A*에서 참조할 노드/링크 dict
        self.nodes = self.node_set.nodes  # 예: { 'nd0': Node(...), 'nd1': Node(...), ... }
        self.links = self.line_set.lines  # 예: { 'ln0': Line(...), 'ln1': Line(...), ... }

    def publish_full_path(self):
        if self.current_pos is None or self.goal_pos is None:
            rospy.logwarn("[WARN] Positions are not ready")
            return

        # if (start_link is None) or (end_link is None):
        #     rospy.logwarn("[WARN] No link found for start or end")
        #     return

        # 2)start Node gen
        start_link, start_closest_pt = self.find_closest_link_and_point(self.current_pos)
        node_id_start = "start_node"
        node_start = self.create_node_with_id(node_id_start, start_closest_pt)
        new_links_for_start = self.split_link_at_point(start_link, node_start)
        self.line_set.remove_line(start_link)
        for ln in new_links_for_start:
            self.line_set.append_line(ln)
        
        # 3)End Node gen
        end_link,   end_closest_pt   = self.find_closest_link_and_point(self.goal_pos)
        node_id_end   = "end_node"
        node_end = self.create_node_with_id(node_id_end, end_closest_pt)
        new_links_for_end   = self.split_link_at_point(end_link,   node_end)
        self.line_set.remove_line(end_link)
        for ln in new_links_for_end:
            self.line_set.append_line(ln)

        # 4) A* 다시 생성
        # self.nodes / self.links 역시 node_set.lines, line_set.lines가 변경되었으므로 갱신
        self.nodes = self.node_set.nodes
        self.links = self.line_set.lines
        self.global_planner = AStar(self.nodes, self.links)

        # 5) A* 최단 경로
        result, path = self.global_planner.find_shortest_path(node_id_start, node_id_end)
        if not result:
            rospy.logwarn("[WARN] A* failed to find path from %s to %s", node_id_start, node_id_end)
            return

        # 6) Path 메시지
        out_path = Path()
        out_path.header.frame_id = 'map'
        for (px, py, pz) in path['point_path']:
            pose = self.to_pose([px, py, pz])
            out_path.poses.append(pose)

        self.global_path_pub.publish(out_path)
        rospy.loginfo("[INFO] Published full path with %d points" % len(out_path.poses))

    # --------------------------------------------------------------
    # 유틸: 새 Node를 만들고 node_set에 등록
    # --------------------------------------------------------------
    def create_node_with_id(self, node_id, pt_xyz):
        """ node_id(str), pt_xyz=(x,y,z) -> Node 생성 후 node_set에 append """
        # NodeSet.append_node()가 보통은 idx를 자동생성.
        # 여기서는 직접 node_id를 부여.
        new_node = Node(node_id)
        # point는 numpy array 3D로 가정
        if len(pt_xyz) == 3:
            new_node.point = np.array(pt_xyz)
        else:
            new_node.point = np.array([pt_xyz[0], pt_xyz[1], 0.0])

        # node_set에 등록
        # node_set이 list인지 dict인지에 따라 다름
        # 만약 NodeSet 내부가 dict라면, node_id가 key가 될 수도 있음
        # 여기서는 append_node()가 'create_new_key=False'일 때
        # => new_node.idx 사용
        self.node_set.append_node(new_node, create_new_key=False)
        # 결과적으로 self.node_set.nodes[node_id] = new_node 형태가 됨

        return new_node

    def find_closest_link_and_point(self, pos):
        """ pos=(x,y)와 가장 가까운 link + link.points 상의 포인트 """
        x, y = pos
        min_dist = float('inf')
        closest_link, closest_point = None, None
        for ln in self.line_set.lines.values():
            for pt in ln.points:
                dx = x - pt[0]
                dy = y - pt[1]
                dist = dx*dx + dy*dy
                if dist < min_dist:
                    min_dist = dist
                    closest_link = ln
                    closest_point = pt
        return closest_link, closest_point

    # --------------------------------------------------------------
    # 링크 분할 -> (linkA, linkB) 생성
    # --------------------------------------------------------------
    def split_link_at_point(self, link, new_node):
        """ 
        link.points를 new_node.point 지점에서 둘로 나눠
        linkA, linkB를 생성해 리스트로 반환.
        실제 line_set에 등록/제거는 바깥에서 처리.
        """
        old_points = link.points  # np.array shape=(N,3)

        # 1) split 인덱스 찾기
        split_idx = -1
        for i in range(len(old_points)):
            # np.allclose()로 좌표 비교
            if np.allclose(old_points[i], new_node.point, atol=1e-7):
                split_idx = i
                break
        if split_idx < 0:
            rospy.logwarn("[WARN] split_point not found in link=%s", link.idx)
            # 분할 불가 -> 그저 원본 링크 그대로?
            return []

        # 2) np.split
        pA = old_points[:split_idx+1]
        pB = old_points[split_idx:]

        # 3) linkA 생성
        linkA_id = str(link.idx) + "_A"
        linkA = link.__class__(None, linkA_id)  # Line(None, 'LNxxx') 식
        linkA.set_points(pA)

        linkA.set_from_node(link.from_node)  # 원본 from_node
        linkA.set_to_node(new_node)

        # 3.1) from_node ~ linkA 연결
        if link.from_node and (link in link.from_node.to_links):
            link.from_node.to_links.remove(link)
            link.from_node.to_links.append(linkA)
        new_node.from_links.append(linkA)

        # 4) linkB 생성
        linkB_id = str(link.idx) + "_B"
        linkB = link.__class__(None, linkB_id)
        linkB.set_points(pB)

        linkB.set_from_node(new_node)
        linkB.set_to_node(link.to_node)

        if link.to_node and (link in link.to_node.from_links):
            link.to_node.from_links.remove(link)
            link.to_node.from_links.append(linkB)
        new_node.to_links.append(linkB)

        # 필요하면 cost나 차선정보 복사
        linkA.calculate_cost()
        linkB.calculate_cost()

        return [linkA, linkB]

    def to_pose(self, point):
        from geometry_msgs.msg import PoseStamped
        pose = PoseStamped()
        pose.pose.position.x = point[0]
        pose.pose.position.y = point[1]
        pose.pose.position.z = point[2]
        pose.header.frame_id = 'map'
        return pose

if __name__ == '__main__':
    FullGlobalPlanner()
