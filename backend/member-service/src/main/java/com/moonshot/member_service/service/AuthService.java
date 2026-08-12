package com.moonshot.member_service.service;

import com.moonshot.member_service.dto.LoginResponse;
import com.moonshot.member_service.dto.MemberLoginRequest;
import com.moonshot.member_service.dto.MemberSignupRequest;
import com.moonshot.member_service.dto.PasswordRetrievalRequest;
import com.moonshot.member_service.entity.Member;
import com.moonshot.member_service.repository.MemberRepository;
import com.moonshot.member_service.util.JWTUtil;
import com.moonshot.member_service.repository.AuthRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.moonshot.member_service.entity.RefreshToken;

import java.security.SecureRandom;
import java.util.Optional;

@Slf4j
@Service
@Transactional
public class AuthService {

    private final AuthRepository authRepository;
    private final MemberRepository memberRepository;
    private final JWTUtil jwtUtil;
    private final RefreshTokenService refreshTokenService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public AuthService(AuthRepository authRepository, MemberRepository memberRepository, JWTUtil jwtUtil, RefreshTokenService refreshTokenService, BCryptPasswordEncoder passwordEncoder, EmailService emailService) {
        this.authRepository = authRepository;
        this.memberRepository = memberRepository;
        this.jwtUtil = jwtUtil;
        this.refreshTokenService = refreshTokenService;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    /**
     * 회원가입 처리
     *
     * 회원의 정보를 저장하기 전에 BCrypt를 사용하여 비밀번호를 암호화하고 DB에 저장한다.
     *
     * @param memberSignupRequest 회원가입 요청 DTO
     */
    public void signup(MemberSignupRequest memberSignupRequest) {
        // 이메일 중복 검사
        if (isEmailExist(memberSignupRequest.getEmail())) {
            throw new IllegalArgumentException("이미 가입된 이메일입니다.");
        }

        // BCrypt를 사용한 비밀번호 암호화
        String encodedPassword = passwordEncoder.encode(memberSignupRequest.getPassword());

        // 회원 엔티티 생성
        Member member = Member.builder()
                .email(memberSignupRequest.getEmail())
                .name(memberSignupRequest.getName())
                .birthdate(memberSignupRequest.getBirthdate())
                .password(encodedPassword) // BCrypt 형식의 암호화된 비밀번호 저장
                .build();
        log.info("회원 가입 데이터: {}", member);
        // 회원 데이터 저장
        authRepository.save(member);
    }

    /**
     * 이메일 중복 검사
     *
     * 이미 가입된 이메일이 있는지 확인한다.
     *
     * @param email 이메일
     * @return 이메일이 이미 존재하면 true, 아니면 false
     */
    public boolean isEmailExist(String email) {
        return authRepository.findByEmail(email).isPresent();
    }

    /**
     * 로그인 처리
     *
     * 입력받은 이메일과 비밀번호를 검증하여 JWT 토큰(Access, Refresh)을 생성 및 반환한다.
     *
     * @param loginRequest 로그인 요청 DTO
     * @return 로그인 성공 시 LoginResponse (Access Token, Refresh Token)
     * @throws Exception 로그인 실패 시 예외 발생
     */
    public LoginResponse login(MemberLoginRequest loginRequest) throws Exception {
        // 이메일로 회원 조회
        Optional<Member> memberOpt = authRepository.findByEmail(loginRequest.getEmail());
        if (memberOpt.isEmpty()) {
            throw new IllegalArgumentException("회원이 존재하지 않습니다.");
        }
        Member member = memberOpt.get();

        // 비밀번호 검증 (Member 엔티티의 checkPassword 메서드를 사용)
        if (!member.checkPassword(loginRequest.getPassword(), passwordEncoder)) {
            throw new IllegalArgumentException("인증에 실패했습니다.");
        }

        // 토큰 생성
        String accessToken = jwtUtil.createAccessToken(member.getId(), member.getName());
        
        // Refresh Token 업데이트 (한 번 생성한 후 DB에 저장)
        RefreshToken refreshTokenEntity = refreshTokenService.updateRefreshToken(member);
        String refreshToken = refreshTokenEntity.getToken();

        return new LoginResponse(accessToken, refreshToken);
    }

    /**
     * 비밀번호 찾기 처리
     * 입력된 이메일과 생년월일로 회원을 조회한 후, 임시 비밀번호를 생성하고
     * 해당 임시 비밀번호를 BCrypt로 암호화하여 회원 비밀번호를 업데이트하고,
     * 사용자의 이메일로 임시 비밀번호를 전송한다.
     *
     * @param request 비밀번호 찾기 요청 DTO
     */
    public void retrievePassword(PasswordRetrievalRequest request) {
        Optional<Member> memberOpt = memberRepository.findByEmailAndBirthdate(request.getEmail(), request.getBirthdate());
        if (memberOpt.isEmpty()) {
            throw new IllegalArgumentException("해당 정보에 해당하는 회원이 존재하지 않습니다.");
        }
        Member member = memberOpt.get();

        // 임시 비밀번호 생성 (8자리 영숫자)
        String tempPassword = generateTemporaryPassword();

        // 임시 비밀번호를 BCrypt로 암호화하여 업데이트
        String encodedTempPassword = passwordEncoder.encode(tempPassword);
        member.setPassword(encodedTempPassword);
        authRepository.save(member);

        // 임시 비밀번호를 사용자 이메일로 전송
        emailService.sendPasswordRetrievalEmail(member.getEmail(), tempPassword);
    }

    /**
     * 임시 비밀번호 생성 (8자리 영숫자)
     *
     * @return 임시 비밀번호 문자열
     */
    private String generateTemporaryPassword() {
        final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            int index = random.nextInt(CHARACTERS.length());
            sb.append(CHARACTERS.charAt(index));
        }
        return sb.toString();
    }
}
