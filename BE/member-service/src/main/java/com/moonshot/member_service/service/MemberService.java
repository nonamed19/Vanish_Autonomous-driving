package com.moonshot.member_service.service;

import com.moonshot.member_service.dto.MemberResponse;
import com.moonshot.member_service.dto.PasswordChangeRequest;
import com.moonshot.member_service.entity.Member;
import com.moonshot.member_service.repository.MemberRepository;
import com.moonshot.member_service.util.JWTUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Slf4j
@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JWTUtil jwtUtil;

    public MemberService(MemberRepository memberRepository, BCryptPasswordEncoder passwordEncoder, JWTUtil jwtUtil) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public void changePassword(PasswordChangeRequest request) {
        // 이메일로 회원 조회
        Member member = memberRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        // 현재 비밀번호 검증 (getter 대신 checkPassword 메서드 사용)
        if (!member.checkPassword(request.getCurrentPassword(), passwordEncoder)) {
            throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
        }

        // 새 비밀번호 인코딩 후 업데이트
        member.setPassword(passwordEncoder.encode(request.getNewPassword()));
        memberRepository.save(member);
    }

    /**
     * 회원 프로필 조회
     *
     * 회원 ID를 기반으로 회원 정보를 조회하여, 민감 정보를 제외한 응답 DTO(MemberResponse)를 반환한다.
     *
     * @param memberId 회원 ID
     * @return MemberResponse 회원 정보 응답 DTO
     */
    public MemberResponse getMemberProfile(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));
        return new MemberResponse(
                member.getName(),
                member.getEmail(),
                member.getBirthdate(),
                member.getCreatedAt(),
                member.getUpdatedAt()
        );
    }

    /**
     * 회원 탈퇴 처리
     *
     * 요청 헤더의 Access Token에서 회원 ID를 추출하고, 전달받은 비밀번호와 비교하여 일치하면
     * 해당 회원의 상태를 "INACTIVE"로 업데이트한다.
     *
     * @param accessToken Authorization 헤더에 담긴 "Bearer {accessToken}"
     * @param password    탈퇴 확인용 비밀번호
     */
    public void withdraw(String accessToken, String password) {
        // 토큰에서 "Bearer " 접두사를 제거
        String token = jwtUtil.resolveToken(accessToken);
        if (token == null || token.isEmpty()) {
            throw new IllegalArgumentException("유효한 토큰이 전달되지 않았습니다.");
        }

        // Access Token에서 회원 ID 추출 (false: access token임)
        Long memberId = jwtUtil.extractUserNo(token, false);
        Optional<Member> memberOpt = memberRepository.findById(memberId);
        if (memberOpt.isEmpty()) {
            throw new IllegalArgumentException("회원 정보를 찾을 수 없습니다.");
        }
        Member member = memberOpt.get();

        // 비밀번호 검증 (Member 엔티티의 checkPassword() 사용)
        if (!member.checkPassword(password, passwordEncoder)) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        // 회원 상태를 "INACTIVE"로 업데이트 (회원 탈퇴 처리)
        member.setStatus(Member.Status.INACTIVE);
        memberRepository.save(member);

        //관련 토큰 무효화 처리: refreshTokenService.deleteByUser(member);
        log.info("회원 탈퇴 완료: 회원ID {}", member.getId());
    }
}
