package com.moonshot.member_service.repository;

import com.moonshot.member_service.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByEmail(String email);
    Optional<Member> findByEmailAndBirthdate(String email, LocalDate birthdate);
}
