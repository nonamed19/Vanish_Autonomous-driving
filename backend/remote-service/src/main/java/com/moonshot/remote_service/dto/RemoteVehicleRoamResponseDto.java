package com.moonshot.remote_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RemoteVehicleRoamResponseDto {
    private boolean success;
    private String message;
}
