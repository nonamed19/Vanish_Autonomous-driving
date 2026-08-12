package com.moonshot.notification_service.client;

import com.moonshot.notification_service.dto.VehicleDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "VEHICLE-SERVICE", path = "/api/v1/vehicles")
public interface RemoteVehicleClient {
    @GetMapping("/by-vin")
    VehicleDto getVehicleByVin(@RequestParam("vehicleVin") String vehicleVin);
}
