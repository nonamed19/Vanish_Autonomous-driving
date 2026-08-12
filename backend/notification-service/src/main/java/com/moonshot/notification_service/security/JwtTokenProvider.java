package com.moonshot.notification_service.security;

import com.moonshot.notification_service.exception.JwtValidationException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import jakarta.annotation.PostConstruct;
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

@Component
public class JwtTokenProvider {

    @Value("${jwt.public-key-path}")
    private String publicKeyPath;  // public key가 위치한 경로 (예: "keys/public_key.pem")

    private PublicKey publicKey;

    @PostConstruct
    public void init() throws Exception {
        // resources에 위치한 public key 파일에서 공개키를 로드
        ClassPathResource resource = new ClassPathResource(publicKeyPath);
        String publicKeyPEM = new String(resource.getInputStream().readAllBytes())
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
        byte[] encoded = Base64.getDecoder().decode(publicKeyPEM);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(encoded);
        publicKey = keyFactory.generatePublic(keySpec);
    }

    public boolean validateToken(String token) throws JwtValidationException {
        try {
            // 공개키로 토큰의 서명을 검증
            Jwts.parser()
                    .verifyWith(publicKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (SecurityException e) {
            throw new JwtValidationException(JwtValidationException.JwtErrorType.UNAUTHORIZED_TOKEN, e);
        } catch (MalformedJwtException e) {
            throw new JwtValidationException(JwtValidationException.JwtErrorType.MALFORMED_TOKEN, e);
        } catch (UnsupportedJwtException e) {
            throw new JwtValidationException(JwtValidationException.JwtErrorType.UNSUPPORTED_TOKEN, e);
        } catch (IllegalArgumentException e) {
            throw new JwtValidationException(JwtValidationException.JwtErrorType.INVALID_TOKEN, e);
        } catch (ExpiredJwtException e) {
            throw new JwtValidationException(JwtValidationException.JwtErrorType.EXPIRED_TOKEN, e);
        }
    }

    public Claims extractAllClaims(String token, boolean isRefreshToken) {
        String actualToken = isRefreshToken ? token : resolveToken(token);
        try {
            return Jwts.parser()
                    .clock(() -> Date.from(Instant.now()))
                    .verifyWith(publicKey)
                    .build()
                    .parseSignedClaims(actualToken)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            throw new JwtValidationException(JwtValidationException.JwtErrorType.EXPIRED_TOKEN, e);
        }
    }

    public Long extractUserNo(String token, boolean isRefreshToken) {
        // 토큰의 subject로 저장된 사용자 번호를 Long 타입으로 변환
        return Long.parseLong(extractAllClaims(token, isRefreshToken).getSubject());
    }

    // Bearer 토큰에서 JWT 추출
    public String resolveToken(String bearerToken) {
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
