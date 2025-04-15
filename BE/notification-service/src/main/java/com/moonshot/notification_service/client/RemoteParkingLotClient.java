package com.moonshot.notification_service.client;

import com.moonshot.notification_service.dto.ParkingLotDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "REMOTE-SERVICE", path = "/api/v1/remote")
public interface RemoteParkingLotClient {
    @GetMapping("/parking-lots/{id}")
    ParkingLotDto getParkingLotById(@PathVariable("id") String id);
}
