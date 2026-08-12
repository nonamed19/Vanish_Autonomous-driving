package com.moonshot.payment_service.repository;

import com.moonshot.payment_service.entity.PaymentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import com.moonshot.payment_service.entity.PaymentHistory.PaymentStatus;

import java.util.List;
import java.util.Optional;

public interface PaymentHistoryRepository extends JpaRepository<PaymentHistory, Long> {
    Optional<PaymentHistory> findByUserIdAndStatus(Long userId, PaymentStatus status);
    List<PaymentHistory> findAllByUserIdAndStatus(Long userId, PaymentStatus status);
}
