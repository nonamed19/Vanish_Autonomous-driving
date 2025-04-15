#!/usr/bin/env python3
import rospy
from morai_msgs.msg import CtrlCmd

def control_ego_vehicle():
    rospy.init_node('ego_vehicle_controller', anonymous=True)
    pub = rospy.Publisher('/ctrl_cmd', CtrlCmd, queue_size=10)
    rate = rospy.Rate(10)  # 10Hz

    accel, brake, steering = 0.5, 0.0, 0.1  # 🚗 가속 50%, 브레이크 없음, 살짝 우회전
    reverse = False  # 후진 모드 여부

    prev_msg = None  # 이전 메시지 저장용

    rospy.loginfo("🚗 차량 제어 시작: 고정된 명령 실행")

    while not rospy.is_shutdown():
        # 🔹 CtrlCmd 메시지 생성
        msg = CtrlCmd()
        msg.acceleration = accel
        msg.brake = brake
        msg.steering = steering
        msg.longlCmdType = 1  # 1: 가속 페달 직접 제어 모드

        # 🚗 **이전 메시지와 비교하여 변화가 있을 때만 로그 출력**
        if prev_msg is None or (msg.acceleration, msg.brake, msg.steering, reverse) != (prev_msg.acceleration, prev_msg.brake, prev_msg.steering, prev_msg.longlCmdType):
            rospy.loginfo(f"🚗 Sending CtrlCmd: Accel={msg.acceleration}, Brake={msg.brake}, Steering={msg.steering}, Reverse={reverse}")

        pub.publish(msg)
        prev_msg = msg  # 🌟 현재 메시지를 이전 메시지로 저장

        rate.sleep()

if __name__ == '__main__':
    try:
        control_ego_vehicle()
    except rospy.ROSInterruptException:
        pass
