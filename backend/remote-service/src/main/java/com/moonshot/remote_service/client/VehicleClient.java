package com.moonshot.remote_service.client;

import com.moonshot.remote_service.dto.VehicleResponse;
import com.moonshot.remote_service.dto.VehicleResultResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "vehicle-service", path = "/api/v1/vehicles")
public interface VehicleClient {

    /**
     * 사용자 소유의 차량 정보 조회 API
     * @return 해당 사용자의 차량 정보
     */
    @GetMapping("/my")
    VehicleResultResponse getMyVehicle(@RequestHeader("Authorization") String authorization);
}
