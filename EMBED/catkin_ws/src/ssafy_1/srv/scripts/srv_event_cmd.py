#!/usr/bin/env python
# -*- coding: utf-8 -*-

import rospy
from morai_msgs.msg import EventInfo, Lamps
from morai_msgs.srv import MoraiEventCmdSrv

def srv_client():
    rospy.init_node('MoraiEventCmd_client', anonymous=True)

    try:
        rospy.wait_for_service('/Service_MoraiEventCmd', timeout=5)
        ros_srv = rospy.ServiceProxy('/Service_MoraiEventCmd', MoraiEventCmdSrv)

        # 차량 제어 설정
        lamp_cmd = Lamps()
        lamp_cmd.turnSignal = 1
        lamp_cmd.emergencySignal = 0

        set_Event_control = EventInfo()
        set_Event_control.option = 7
        set_Event_control.ctrl_mode = 3
        set_Event_control.gear = 4
        set_Event_control.lamps = lamp_cmd

        result = ros_srv(set_Event_control)

    except rospy.ROSException:
        pass
    except rospy.ServiceException:
        pass
    except Exception:
        pass

if __name__ == '__main__':
    try:
        srv_client()
    except rospy.ROSInterruptException:
        pass
