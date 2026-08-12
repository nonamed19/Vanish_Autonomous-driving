#!/usr/bin/env python
# -*- coding: utf-8 -*-

class pidControl:
    def __init__(self, p_gain=0.3, i_gain=0.00, d_gain=0.03, control_time=0.02):
        self.p_gain = p_gain
        self.i_gain = i_gain
        self.d_gain = d_gain
        self.controlTime = control_time
        self.prev_error = 0
        self.i_control = 0

    def pid(self, target_vel, current_vel):
        error = target_vel - current_vel
        p_control = self.p_gain * error
        self.i_control += error * self.controlTime
        i_term = self.i_gain * self.i_control
        d_term = self.d_gain * (error - self.prev_error) / self.controlTime
        output = p_control + i_term + d_term
        self.prev_error = error
        return output
