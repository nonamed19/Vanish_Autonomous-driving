package com.moonshot.payment_service.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_history")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
@Slf4j
public class PaymentHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;  // Member ID와 연동

    @Column(length = 255)
    private String transactionId;

    @Column(length = 255)
    private String orderNo;

    @Column(nullable = false, length = 255)
    private String orderName;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal baseFee;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal rateFee;

    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    private LocalDateTime parkingStart;

    private LocalDateTime parkingEnd;

    private Integer parkingDuration;

    @Builder.Default
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PaymentStatus status = PaymentStatus.I;

    private LocalDateTime requestedAt;

    private LocalDateTime completedAt;

    public enum PaymentStatus {
        // Init, Pending, Success, Fail, Cancel
        I, P, S, F, C
    }
}
