package com.moonshot.remote_service.repository;

import com.moonshot.remote_service.entity.RoamTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RoamTaskRepository extends JpaRepository<RoamTask, Long> {
    Optional<RoamTask> findByVehicleVin(String vehicleVin);
}
