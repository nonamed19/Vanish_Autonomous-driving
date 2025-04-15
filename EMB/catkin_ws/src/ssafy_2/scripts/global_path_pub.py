#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import rospkg
from math import cos, sin, pi, sqrt, pow
from geometry_msgs.msg import PoseStamped
from nav_msgs.msg import Path

# global_path_pub 은 txt 파일로 저장한 Path 데이터를 global Path (전역경로) 로 읽어오는 예제입니다.
# 만들어진 global Path(전역경로) 는 Local Path (지역경로) 를 만드는데 사용된다.

class global_path_pub:
    def __init__(self, pkg_name='ssafy_2', path_name='kcity'):
        rospy.init_node('global_path_pub', anonymous=True)

        # ✅ (1) Global Path publisher 선언 및 Global Path 변수 생성
        '''
        Global Path 데이터를 Publish하는 변수와 메세지를 선언한다.
        Global Path의 frame_id는 map 좌표계를 기준으로 설정한다.
        '''
        self.global_path_pub = rospy.Publisher('/global_path', Path, queue_size=10)
        self.global_path_msg = Path()
        self.global_path_msg.header.frame_id = 'map'

        # ✅ (2) 읽어올 경로의 텍스트파일 이름을 정하고, 읽기 모드로 열기
        '''
        Path 데이터가 기록된 txt 파일의 경로를 설정하고 읽기 모드로 연다.
        '''
        rospack = rospkg.RosPack()
        pkg_path = rospack.get_path(pkg_name)
        full_path = pkg_path + '/path/' + path_name + '.txt'  # `make_path.txt` 사용
        self.f = open(full_path, 'r')
        lines = self.f.readlines()

        # ✅ (3) 읽어온 경로 데이터를 Global Path 변수에 넣기
        '''
        읽어온 x, y, z 좌표 데이터를 self.global_path_msg 변수에 넣는다.
        '''
        for line in lines:
            tmp = line.split()
            read_pose = PoseStamped()
            read_pose.pose.position.x = float(tmp[0])
            read_pose.pose.position.y = float(tmp[1])
            read_pose.pose.position.z = float(tmp[2])
            read_pose.pose.orientation.w = 1.0  # 방향 정보는 기본 값으로 설정
            self.global_path_msg.poses.append(read_pose)

        self.f.close()

        rate = rospy.Rate(10)  # 10hz
        while not rospy.is_shutdown():
            # ✅ (4) Global Path 정보 Publish
            '''
            Global Path 메시지를 퍼블리시하는 코드
            '''
            self.global_path_msg.header.stamp = rospy.Time.now()
            self.global_path_pub.publish(self.global_path_msg)
            rospy.loginfo("Global Path Published - 총 {} 개의 포인트".format(len(self.global_path_msg.poses)))
            rate.sleep()

if __name__ == '__main__':
    try:
        test_track = global_path_pub()
    except rospy.ROSInterruptException:
        pass

