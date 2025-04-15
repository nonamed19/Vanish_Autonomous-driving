package com.moonshot.vehicle_service.repository;

import com.moonshot.vehicle_service.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, String> {
    Optional<Vehicle> findByOwnerId(Long ownerId);

    boolean existsByVehicleVinAndOwnerId(String vehicleVin, Long ownerId);

    List<Vehicle> getVehiclesByVehicleVin(String vehicleVin);

    Vehicle getVehicleByVehicleVin(String vehicleVin);
}
