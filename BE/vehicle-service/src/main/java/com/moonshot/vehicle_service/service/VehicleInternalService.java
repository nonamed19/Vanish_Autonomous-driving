package com.moonshot.vehicle_service.service;

import com.moonshot.vehicle_service.entity.Vehicle;
import com.moonshot.vehicle_service.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VehicleInternalService {

    private final VehicleRepository vehicleRepository;

    public Long getOwnerIdByVin(String vehicleVin) {
        Vehicle vehicle = vehicleRepository.findById(vehicleVin)
                .orElseThrow(() -> new IllegalArgumentException("해당 VIN에 대한 차량이 존재하지 않습니다."));
        return vehicle.getOwnerId();
    }

    public String getVehicleVinByOwnerId(Long ownerId) {
        Vehicle vehicle = vehicleRepository.findByOwnerId(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("해당 OwnerId에 대한 차량이 존재하지 않습니다."));
        return vehicle.getVehicleVin();
    }

}
