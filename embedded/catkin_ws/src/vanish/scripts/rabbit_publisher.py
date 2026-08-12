#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Small, reconnecting RabbitMQ publisher shared by telemetry ROS nodes."""

import json
import os
import threading

import pika


class RabbitPublisher(object):
    def __init__(self, exchange):
        self.exchange = exchange
        self.host = os.environ.get("VANISH_RABBITMQ_HOST", "j12a707.p.ssafy.io")
        self.port = int(os.environ.get("VANISH_RABBITMQ_PORT", "3001"))
        self.username = os.environ.get("VANISH_RABBITMQ_USER", "guest")
        self.password = os.environ.get("VANISH_RABBITMQ_PASSWORD", "guest")
        self.connection = None
        self.channel = None
        self.lock = threading.Lock()

    def _connect(self):
        if self.connection is not None and self.connection.is_open and self.channel is not None and self.channel.is_open:
            return

        self.close()
        credentials = pika.PlainCredentials(self.username, self.password)
        parameters = pika.ConnectionParameters(
            host=self.host, port=self.port, credentials=credentials, heartbeat=30,
            blocked_connection_timeout=5, connection_attempts=1, socket_timeout=5,
        )
        self.connection = pika.BlockingConnection(parameters)
        self.channel = self.connection.channel()
        self.channel.exchange_declare(exchange=self.exchange, exchange_type="direct", durable=True)

    def publish(self, routing_key, payload):
        body = json.dumps(payload, separators=(",", ":"))
        with self.lock:
            for attempt in range(2):
                try:
                    self._connect()
                    self.channel.basic_publish(
                        exchange=self.exchange, routing_key=routing_key, body=body,
                        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
                    )
                    return
                except (pika.exceptions.AMQPError, OSError):
                    self.close()
                    if attempt:
                        raise

    def close(self):
        if self.connection is not None:
            try:
                self.connection.close()
            except (pika.exceptions.AMQPError, OSError):
                pass
        self.connection = None
        self.channel = None
