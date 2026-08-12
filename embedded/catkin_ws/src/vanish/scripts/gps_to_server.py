#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
from datetime import datetime

import rospy
from morai_msgs.msg import GPSMessage

from rabbit_publisher import RabbitPublisher


class GPStoServer(object):
    """Publishes the newest GPS sample without reconnecting for every update."""

    def __init__(self):
        rospy.init_node('gps_to_server', anonymous=True)
        self.lat = None
        self.lon = None
        self.has_new_gps = False
        self.vehicle_vin = os.environ.get('VANISH_VEHICLE_VIN', 'KMHEL13CPYA000001')
        self.publisher = RabbitPublisher('ros_exchange')
        rospy.on_shutdown(self.publisher.close)
        rospy.Subscriber('/gps', GPSMessage, self.gps_callback, queue_size=1)

        rate = rospy.Rate(10)
        while not rospy.is_shutdown():
            if self.has_new_gps:
                self.has_new_gps = False
                self.send_server()
            rate.sleep()

    def gps_callback(self, gps_msg):
        self.lat = gps_msg.latitude
        self.lon = gps_msg.longitude
        self.has_new_gps = True

    def send_server(self):
        # MORAI's local coordinates are intentionally offset to the frontend K-City map.
        data = {
            'vehicleVin': self.vehicle_vin,
            'latitude': self.lat + 0.2856728146,
            'longitude': self.lon - 0.210318416,
            'timestamp': datetime.utcnow().replace(microsecond=0).isoformat() + 'Z',
        }
        try:
            self.publisher.publish('vehicle.location', data)
            rospy.logdebug('Location telemetry sent')
        except Exception as error:
            rospy.logwarn_throttle(5, 'Failed to send location telemetry: {}'.format(error))


if __name__ == '__main__':
    try:
        GPStoServer()
    except rospy.ROSInterruptException:
        pass
