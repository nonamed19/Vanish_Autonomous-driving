#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import rospy
from morai_msgs.msg import ScenarioLoad
from morai_msgs.srv import MoraiScenarioLoadSrv

def srv_client():
    rospy.init_node('MoraiSL_client', anonymous=True)

    try:
        # (1) 서비스가 실행될 때까지 대기
        rospy.wait_for_service('/Service_MoraiSL', timeout=5)
        ros_srv = rospy.ServiceProxy('/Service_MoraiSL', MoraiScenarioLoadSrv)

        # (2) 송신할 시나리오 설정
        scenario_setting = ScenarioLoad()
        scenario_setting.file_name = "my_scenario.json"  # 불러올 시나리오 파일
        scenario_setting.load_network_connection_data = True
        scenario_setting.delete_all = False
        scenario_setting.load_ego_vehicle_data = True
        scenario_setting.load_surrounding_vehicle_data = True
        scenario_setting.load_pedestrian_data = True
        scenario_setting.load_obstacle_data = True
        scenario_setting.set_pause = False  # 시뮬레이터 즉시 실행 여부

        # (3) 서비스 호출 (한 번만 실행)
        result = ros_srv(scenario_setting)

        # (4) 서비스 호출 결과 확인
        rospy.loginfo("✅ 시나리오 로드 결과: {}".format(result))

    except rospy.ROSException:
        rospy.logerr("❌ `/Service_MoraiSL` 서비스가 실행되지 않음! MORAI 시뮬레이터를 확인하세요.")
    except rospy.ServiceException:
        rospy.logwarn("⚠ 시뮬레이터 서비스 호출 실패")
    except Exception as e:
        rospy.logerr("❌ 예기치 않은 오류 발생: {}".format(e))

if __name__ == '__main__':
    try:
        srv_client()
    except rospy.ROSInterruptException:
        pass

