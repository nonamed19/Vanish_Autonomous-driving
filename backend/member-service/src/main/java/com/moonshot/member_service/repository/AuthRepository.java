package com.moonshot.member_service.repository;

import com.moonshot.member_service.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuthRepository extends JpaRepository<Member, Long> {
    // 이메일로 회원 찾기
    Optional<Member> findByEmail(String email);
}
