package com.moonshot.remote_service.repository;

import com.moonshot.remote_service.entity.ParkingLot;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ParkingLotRepository extends CrudRepository<ParkingLot, Long> {

    @Query(value = "SELECT * FROM parking_lot " +
            "WHERE status = 'A' " +
            "AND ST_Distance(location, POINT(:lng, :lat)) <= :radius " +
            "ORDER BY ST_Distance(location, POINT(:lng, :lat)) ASC LIMIT 2", nativeQuery = true)
    List<ParkingLot> findTop2NearestParkingLotsWithinRadius(@Param("lng") double longitude,
                                                            @Param("lat") double latitude,
                                                            @Param("radius") double radius);

    @Query(value = "SELECT *, (base_fee + 6 * rate_fee) as hourly_cost FROM parking_lot " +
            "WHERE status = 'A' " +
            "AND ST_Distance(location, POINT(:lng, :lat)) <= :radius " +
            "ORDER BY (base_fee + 6 * rate_fee) ASC LIMIT 2", nativeQuery = true)
    List<ParkingLot> findTop2CheapestParkingLotsWithinRadius(@Param("lng") double longitude,
                                                             @Param("lat") double latitude,
                                                             @Param("radius") double radius);

    // 위도와 경도가 일치하는 단일 ParkingLot을 찾는 메서드 추가
    @Query(value = "SELECT * FROM parking_lot " +
            "WHERE ST_Y(location) = :latitude AND ST_X(location) = :longitude " +
            "AND status = 'A' " +
            "LIMIT 1", nativeQuery = true)
    ParkingLot findByLatitudeAndLongtitude(@Param("latitude") double latitude,
                                                  @Param("longitude") double longitude);
}
