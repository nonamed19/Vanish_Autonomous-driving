package com.moonshot.remote_service.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "roam_task")
@Data
@NoArgsConstructor
public class RoamTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String vehicleVin;

    @Column(nullable = false)
    private Long userNo;

    @Column(nullable = false)
    private Instant roamStartTime;

    @Column(nullable = false)
    private Instant roamEndTime;

    // ROS로부터 차량 탑승 여부를 확인하는 플래그
    @Column(nullable = false)
    private boolean boarded = false;

    // 사용자가 알림에 응답했는지 여부 (배회 연장 요청 등)
    @Column(nullable = false)
    private boolean userResponded = false;

    // 사용자가 배회 연장을 요청했을 때 갱신된 배회 종료 시각 (선택적)
    private Instant extendedRoamEndTime;
}
