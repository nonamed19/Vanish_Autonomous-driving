#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
import actionlib
from std_msgs.msg import Bool, Int32
from geometry_msgs.msg import PoseStamped
from vanish.msg import DriveToGoalAction, DriveToGoalFeedback, DriveToGoalResult

class DriveToGoalServer:
    def __init__(self):
        rospy.init_node('drive_to_goal_server')

        self.server = actionlib.SimpleActionServer('drive_to_goal', DriveToGoalAction, self.execute_cb, False)
        self.feedback = DriveToGoalFeedback()
        self.result = DriveToGoalResult()

        self.goal_pub = rospy.Publisher("/move_base_simple/goal", PoseStamped, queue_size=1)
        self.drive_enable_pub = rospy.Publisher("/drive_enable", Bool, queue_size=1)

        self.arrival_status = 0
        rospy.Subscriber("/arrival_status", Int32, self.arrival_callback)

        self.is_running = False
        self.server.start()
        rospy.loginfo(" Action Server '/drive_to_goal' 시작됨")

    def arrival_callback(self, msg):
        self.arrival_status = msg.data

    def execute_cb(self, goal):
        if self.is_running:
            rospy.logwarn(" 이미 실행 중인 작업이 있습니다.")
            self.result.success = False
            self.result.message = "Another goal is already running"
            self.server.set_aborted(self.result)
            return

        self.is_running = True
        self.arrival_status = 0  # 초기화
        rospy.loginfo(f" 새로운 goal 수신: mode={goal.mode}")

        # 1. 목적지 퍼블리시 → 경로 생성
        self.goal_pub.publish(goal.target_pose)
        rospy.loginfo(" 목표 위치 설정 완료")

        # 2. 호출이면 도착 시간까지 기다리기
        if goal.mode == "call":
            now = rospy.Time.now()
            wait_time = (goal.expected_arrival_time - now).to_sec()
            if wait_time > 0:
                rospy.loginfo(f" {wait_time:.1f}초 동안 도착 시간 맞춰 대기 중...")
                rate = rospy.Rate(1)
                for i in range(int(wait_time)):
                    if self.server.is_preempt_requested():
                        self.cancel_goal("Preempted during wait time")
                        return
                    self.feedback.status = f"Waiting to start ({int(wait_time)-i}s)"
                    self.server.publish_feedback(self.feedback)
                    rate.sleep()
            rospy.loginfo(" 도착 시간 도래 → 주행 시작 준비")

        # 3. 주행 활성화 신호 전송
        self.drive_enable_pub.publish(Bool(data=True))
        rospy.loginfo(" /drive_enable = True 퍼블리시 → 주행 시작")

        # 4. 도착 감지 대기 (arrival_status == 2)
        rate = rospy.Rate(2)
        while not rospy.is_shutdown():
            if self.arrival_status == 2:
                rospy.loginfo(" 목적지 도착 확인됨!")
                break

            if self.server.is_preempt_requested():
                self.cancel_goal("Preempted during driving")
                return

            self.feedback.status = "Driving to destination..."
            self.server.publish_feedback(self.feedback)
            rate.sleep()

        # 5. 주행 완료
        self.result.success = True
        self.result.message = "Arrived at destination"
        self.server.set_succeeded(self.result)
        self.drive_enable_pub.publish(Bool(data=False))  # 다시 비활성화

        self.is_running = False

    def cancel_goal(self, message):
        rospy.logwarn(f" Goal 취소됨: {message}")
        self.result.success = False
        self.result.message = message
        self.server.set_preempted(self.result)
        self.drive_enable_pub.publish(Bool(data=False))
        self.is_running = False


if __name__ == '__main__':
    try:
        DriveToGoalServer()
        rospy.spin()
    except rospy.ROSInterruptException:
        pass
