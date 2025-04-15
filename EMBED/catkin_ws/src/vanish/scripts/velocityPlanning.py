#!/usr/bin/env python
# -*- coding: utf-8 -*-

import math
import numpy as np
from shapely.geometry import Point, Polygon


class velocityPlanning:
    def __init__(self, car_max_speed, road_friciton):
        self.car_max_speed = car_max_speed
        self.road_friction = road_friciton
        self.school_zones = [
            Polygon([
                (95, 1141), (129, 1203), (123, 1207), (109, 1183),
                (80, 1200), (73, 1189), (102, 1170), (89, 1145)
            ])
        ]

    def curvedBaseVelocity(self, global_path, point_num):
        out_vel_plan = []

        # (초기 point_num 구간 일정속도)
        # for i in range(point_num):
        #     out_vel_plan.append(10)

        # (곡률 기반 계산)
        for i in range(0, len(global_path.poses) - point_num):
            x_list = []
            y_list = []
            for box in range(-point_num, point_num):
                x = global_path.poses[i + box].pose.position.x
                y = global_path.poses[i + box].pose.position.y
                x_list.append([-2 * x, -2 * y, 1])
                y_list.append(-(x ** 2 + y ** 2))
            A = np.array(x_list)
            B = np.array(y_list)
            X = np.linalg.lstsq(A, B, rcond=None)[0]
            r = np.sqrt(X[0] ** 2 + X[1] ** 2 - X[2])

            # v_max = sqrt(r*g*마찰)
            v_max = math.sqrt(r * 9.81 * self.road_friction)
            if v_max > self.car_max_speed:
                v_max = self.car_max_speed
                
            # school_zone limit     
            path_point = global_path.poses[i].pose.position
            point = Point(path_point.x, path_point.y)

            for zone in self.school_zones:
                if zone.contains(point):
                    v_max = min(v_max, 8.33333)  # 제한속도 적용
                
            out_vel_plan.append(v_max)

        # 마지막 일부
        for i in range(len(global_path.poses) - point_num, len(global_path.poses) - 10):
            out_vel_plan.append(8.3333)
        for i in range(len(global_path.poses) -10, len(global_path.poses)):
            out_vel_plan.append(4)
        return out_vel_plan
