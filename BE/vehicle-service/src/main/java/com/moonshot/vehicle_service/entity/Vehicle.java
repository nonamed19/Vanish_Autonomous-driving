package com.moonshot.vehicle_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "vehicles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    // 차량 차대번호(VIN)를 기본 키로 사용
    @Id
    @Column(length = 17)
    private String vehicleVin;

    @Column(nullable = false, unique = true)
    private Long ownerId;  // JWT에서 추출한 회원 ID

    @Column(nullable = false)
    private String model;

    @Column(nullable = false)
    private String vehicleName;

    @Column(columnDefinition = "bigint default 1")
    private Long planId;

    @CreationTimestamp
    private LocalDateTime registeredAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(name = "is_parked", nullable = true)
    private boolean isParked;

    @Column(name = "registration_num", length = 20)
    private String registrationNum;

    @Column(name = "ownership", length = 20)
    private String ownership;
}
