package com.moonshot.member_service.repository;

import com.moonshot.member_service.entity.Member;
import com.moonshot.member_service.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    Optional<RefreshToken> findByUser(Member user);
    void deleteByUser(Member user);
}
