package com.moonshot.payment_service.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "vehicle-service")
public interface VehicleClient {

    /**
     * 차량의 차대번호(VIN)를 기반으로 해당 차량의 소유자 ID를 조회
     * @param vehicleVin
     * @return
     */
    @GetMapping("/internal/vehicles/owner-id")
    Long getOwnerIdByVin(@RequestParam("vehicleVin") String vehicleVin);

    /**
     * userId로 VIN 조회
     * @param ownerId
     * @return
     */
    @GetMapping("/internal/vehicles/vehicle-vin")
    String getVehicleVinByOwnerId(@RequestParam("ownerId") Long ownerId);
}
