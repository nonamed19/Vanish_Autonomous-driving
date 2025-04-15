package com.moonshot.remote_service.client;

import com.moonshot.remote_service.dto.InitPaymentHistoryRequest;
import com.moonshot.remote_service.dto.NotificationRequestDto;
import jakarta.validation.Valid;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "payment-service", path = "/api/v1/payments")
public interface PaymentClient {

    @PostMapping("/register/init-history")
    public ResponseEntity<String> registerInitHistory(@RequestHeader("Authorization") String authorization,
                                                      @Valid @RequestBody InitPaymentHistoryRequest request);

}