package com.moonshot.remote_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class VehicleResultResponse {
    private boolean success;
    private String message;
    private VehicleResponse vehicle;
}
