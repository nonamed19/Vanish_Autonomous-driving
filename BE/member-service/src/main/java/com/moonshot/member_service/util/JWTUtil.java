package com.moonshot.member_service.util;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.Base64;
import java.util.Date;

import com.moonshot.member_service.entity.Member;
import com.moonshot.member_service.exception.JwtValidationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import jakarta.annotation.PostConstruct;

@Slf4j
@Component
public class JWTUtil {

    /**
     * [경고]
     *
     * 비대칭키를 이용하여 인증 서버의 키는 개인키(Private Key)를 사용.
     * private_key.pem은 resources에 위치하지만 예시로 설정한 것.
     * 절대로 key 파일은 프로젝트 내부에 위치하지 않음.
     *  --> jar, war 등으로 추출 시 key 파일이 포함됨.
     *  --> Git과 같은 저장소에도 올라갈 수 있음.
     *
     */
    @Value("${jwt.private-key-path}")
    private String privateKeyPath;
    private PrivateKey privateKey;

    @Value("${jwt.public-key-path}")
    private String publicKeyPath;
    private PublicKey publicKey;

    @Value("${jwt.access-token-validity}")
    private long accessTokenValidityTime;

    @Value("${jwt.refresh-token-validity}")
    private long refreshTokenValidityTime;

    private Date maxAge;

    @PostConstruct // Bean이 생성되고, Dependency Injection이 완료된 후 초기화 해야함을 명시.
    public void init() throws Exception {
        this.privateKey = loadPrivateKey();
        this.publicKey = loadPublicKey();
    }

    public PrivateKey loadPrivateKey() throws Exception {

        ClassPathResource resource = new ClassPathResource(privateKeyPath);

        String privateKeyPEM = new String(resource.getInputStream().readAllBytes())
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");

        byte[] encoded = Base64.getDecoder().decode(privateKeyPEM);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);

        return keyFactory.generatePrivate(keySpec);
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

    // Access Token 생성
    public String createAccessToken(Long userNo, String teamName) {

        Instant now = ZonedDateTime.now().toInstant(); // 토큰 생성 시간.
        Instant validity = now.plus(Duration.ofMinutes(accessTokenValidityTime)); // 토큰 유효 시간

        maxAge = Date.from(validity);

        return Jwts.builder()
                .subject(String.valueOf(userNo)) // 토큰의 식별자
                .claim("TeamName", teamName) // 토큰에 포함될 정보
                .issuedAt(Date.from(now)) // 토큰 발급 시간
                .expiration(Date.from(validity)) // 토큰 만료 시간
                .signWith(privateKey, Jwts.SIG.RS256) // 토큰 서명 (암호화) 및 방식, 비공개 키(개인키, private key)로 싸이닝.
                .compact(); // 문자열 변환
    }

    // Refresh Token 생성
    public String createRefreshToken(Long userNo) {

        Instant now = ZonedDateTime.now().toInstant(); // 토큰 생성 시간.
        Instant validity = now.plus(Duration.ofHours(refreshTokenValidityTime)); // 토큰 유효 시간

        maxAge = Date.from(validity);

        return Jwts.builder()
                .subject(String.valueOf(userNo)) // 토큰의 식별자
                .claim("TeamName", "") // 토큰에 포함될 정보
                .issuedAt(Date.from(now)) // 토큰 발급 시간
                .expiration(Date.from(validity)) // 토큰 만료 시간
                .signWith(privateKey, Jwts.SIG.RS256) // 토큰 서명 (암호화) 및 방식, 비공개 키(개인키, private key)로 싸이닝.
                .compact(); // 문자열 변환
    }

    public boolean validateToken(String token) throws JwtValidationException {
        try {
            Jwts.parser()
                    .verifyWith(publicKey) // 공개키로 복호화
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

    public Long extractUserNo(String token, boolean isRefreshToken) {
        return Long.parseLong(extractAllClaims(token, isRefreshToken).getSubject());
    }

    public String extractUserTeamName(String token, boolean isRefreshToken) {
        return extractAllClaims(token, isRefreshToken).get("TeamName", String.class);
    }

    public Date extractExpiration(String token, boolean isRefreshToken) {
        return extractAllClaims(token, isRefreshToken).getExpiration();
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

    // 남은 만료 시간 계산 (밀리초)
    public Date getExpirationTime(String token, boolean isRefreshToken) {
        return extractExpiration(token, isRefreshToken);
    }

    // Refresh Token 생성
    public String generateRefreshToken(Member user) {
        Instant now = ZonedDateTime.now().toInstant(); // 토큰 생성 시간
        Instant validity = now.plus(Duration.ofHours(refreshTokenValidityTime)); // 토큰 유효 시간

        Date expiration = Date.from(validity);

        return Jwts.builder()
                .subject(String.valueOf(user.getId())) // 토큰의 식별자 (유저 ID)
                .claim("TeamName", "") // 토큰에 포함될 정보 (여기서는 빈 값으로 설정)
                .issuedAt(Date.from(now)) // 토큰 발급 시간
                .expiration(expiration) // 토큰 만료 시간
                .signWith(privateKey, Jwts.SIG.RS256) // 서명 (비공개 키 사용)
                .compact(); // 문자열 변환
    }

    public Date getMaxAge() {
        return maxAge;
    }
}