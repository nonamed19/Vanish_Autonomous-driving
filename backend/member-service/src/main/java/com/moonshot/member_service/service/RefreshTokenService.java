package com.moonshot.member_service.service;

import com.moonshot.member_service.entity.Member;
import com.moonshot.member_service.entity.RefreshToken;
import com.moonshot.member_service.repository.RefreshTokenRepository;
import com.moonshot.member_service.util.JWTUtil;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JWTUtil jwtUtil; // JWT 생성/검증 유틸

    // Refresh Token 저장 (Setter 제거, 빌더 패턴 사용)
    public RefreshToken createRefreshToken(Member user) {
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(jwtUtil.generateRefreshToken(user)) // Refresh Token 생성
                .expiryDate(LocalDateTime.now().plusDays(7)) // 7일 유효
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    // Refresh Token 검증
    public Optional<RefreshToken> verifyRefreshToken(String token) {
        return refreshTokenRepository.findByToken(token)
                .filter(t -> t.getExpiryDate().isAfter(LocalDateTime.now())); // 만료 여부 체크
    }

    // Refresh Token 업데이트 (새로운 토큰 발급 시)
    public RefreshToken updateRefreshToken(Member user) {
        String newToken = jwtUtil.generateRefreshToken(user);
        LocalDateTime newExpiryDate = LocalDateTime.now().plusDays(7);

        Optional<RefreshToken> existingToken = refreshTokenRepository.findByUser(user);

        if (existingToken.isPresent()) {
            RefreshToken updatedToken = existingToken.get().updateToken(newToken, newExpiryDate);
            return refreshTokenRepository.save(updatedToken);
        }

        return createRefreshToken(user);
    }

    // Refresh Token 삭제 (로그아웃 시)
    public void deleteByUser(Member user) {
        refreshTokenRepository.deleteByUser(user);
    }
}
