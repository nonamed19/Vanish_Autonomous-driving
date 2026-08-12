package com.moonshot.vehicle_service.util;

import com.moonshot.vehicle_service.exception.JwtValidationException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

@Slf4j
@Component
public class JWTUtil {

    @Value("${jwt.public-key-path}")
    private String publicKeyPath;
    private PublicKey publicKey;

    @PostConstruct // Bean이 생성되고, Dependency Injection이 완료된 후 초기화 해야함을 명시.
    public void init() throws Exception {
        this.publicKey = loadPublicKey();
    }

    private PublicKey loadPublicKey() throws Exception {
        ClassPathResource resource = new ClassPathResource(publicKeyPath);

        String publicKeyPEM = new String(resource.getInputStream().readAllBytes())
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");

        byte[] encoded = Base64.getDecoder().decode(publicKeyPEM);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(encoded);

        return keyFactory.generatePublic(keySpec);
    }

    public Long extractUserNo(String token, boolean isRefreshToken) {
        return Long.parseLong(extractAllClaims(token, isRefreshToken).getSubject());
    }

    public Claims extractAllClaims(String token, boolean isRefreshToken) {
        String actualToken = null;
        try {
            log.info("token: '{}'", token);
            log.info("isRefreshToken= '{}'", isRefreshToken);
            // refreshToken인 경우 그대로 사용, accessToken인 경우 Bearer 제거
            actualToken = isRefreshToken ? token : resolveToken(token);
            log.info("token: '{}'", actualToken);
            return Jwts.parser()
                    .clock(() -> Date.from(Instant.now()))
                    .verifyWith(publicKey)
                    .build()
                    .parseSignedClaims(actualToken)
                    .getPayload();

        } catch (ExpiredJwtException e) {
            throw new JwtValidationException(
                    JwtValidationException.JwtErrorType.EXPIRED_TOKEN,
                    e
            );
        }
    }

    // Bearer 토큰에서 JWT 추출
    public String resolveToken(String bearerToken) {
        log.info("bearerToken: '{}'", bearerToken);

        // Bearer 접두사가 없는 경우도 처리
        if (StringUtils.hasText(bearerToken)) {
            if (bearerToken.startsWith("Bearer ")) {
                return bearerToken.substring(7).trim();
            } else {
                // Bearer 접두사 없이 토큰이 직접 전달된 경우
                return bearerToken.trim();
            }
        }
        return null;
    }
}
