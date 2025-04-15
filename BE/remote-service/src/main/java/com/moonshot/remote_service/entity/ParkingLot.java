package com.moonshot.remote_service.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.locationtech.jts.geom.Point;

@Entity
@Table(name = "parking_lot")
@Getter
@Setter
public class ParkingLot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, length = 255)
    private String address;

    // MySQL의 POINT 타입과 매핑 (경도, 위도 순)
    @Column(nullable = false, columnDefinition = "POINT")
    private Point location;

    @Column(nullable = false)
    private Integer congestion;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(nullable = false, columnDefinition = "ENUM('A','I')")
    private String status;

    @Column(name = "base_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFee;

    @Column(name = "rate_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal rateFee;
}
