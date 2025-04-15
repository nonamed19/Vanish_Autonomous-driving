package com.moonshot.vehicle_service.exception;

public class JwtValidationException extends RuntimeException {
    private JwtErrorType errorType;

    public enum JwtErrorType {
        INVALID_TOKEN("유효하지 않은 토큰"),
        EXPIRED_TOKEN("만료된 토큰"),
        UNSUPPORTED_TOKEN("지원되지 않는 토큰 형식"),
        MALFORMED_TOKEN("잘못된 토큰 구조"),
        UNAUTHORIZED_TOKEN("권한이 없는 토큰");

        private final String message;

        JwtErrorType(String message) {
            this.message = message;
        }

        public String getMessage() {
            return message;
        }
    }

    public JwtValidationException(JwtErrorType errorType) {
        super(errorType.getMessage());
        this.errorType = errorType;
    }

    public JwtValidationException(JwtErrorType errorType, Throwable cause) {
        super(errorType.getMessage(), cause);
        this.errorType = errorType;
    }

    public JwtErrorType getErrorType() {
        return errorType;
    }
}