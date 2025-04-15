package com.moonshot.vehicle_service.controller;

import com.moonshot.vehicle_service.repository.VehicleRepository;
import com.moonshot.vehicle_service.service.VehicleInternalService;
import com.moonshot.vehicle_service.service.VehicleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/vehicles")
@RequiredArgsConstructor
@Slf4j
public class VehicleInternalController {

    private final VehicleInternalService vehicleInternalService;

    /**
     * 전달받은 차량의 차대번호(VIN)를 기반으로 해당 차량의 소유자 ID를 반환하는 내부용 API.
     * @param vehicleVin
     * @return
     */
    @GetMapping("/owner-id")
    public ResponseEntity<Long> getOwnerIdByVin(@RequestParam String vehicleVin) {
        log.info("ownerId 조회 요청 - VIN: {}", vehicleVin);
        Long ownerId = vehicleInternalService.getOwnerIdByVin(vehicleVin);
        return ResponseEntity.ok(ownerId);
    }

    /**
     * 전달받은 사용자 ID(ownerId)를 기반으로 차량의 차대번호(VIN)를 반환하는 내부용 API.
     * @param ownerId
     * @return
     */
    @GetMapping("/vehicle-vin")
    public ResponseEntity<String> getVehicleVinByOwnerId(@RequestParam Long ownerId) {
        log.info("vehicleVin 조회 요청 - ownerId: {}", ownerId);
        String vehicleVin = vehicleInternalService.getVehicleVinByOwnerId(ownerId);
        return ResponseEntity.ok(vehicleVin);
    }
}
