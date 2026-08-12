package com.moonshot.member_service.controller;

import com.moonshot.member_service.dto.*;
import com.moonshot.member_service.service.AuthService;
import com.moonshot.member_service.service.EmailVerificationService;
import com.moonshot.member_service.service.MemberService;
import com.moonshot.member_service.service.RefreshTokenService;
import com.moonshot.member_service.util.JWTUtil;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Slf4j
@Controller
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final JWTUtil jwtUtil;
    private final EmailVerificationService emailVerificationService;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthController(AuthService authService, RefreshTokenService refreshTokenService, JWTUtil jwtUtil, EmailVerificationService emailVerificationService, BCryptPasswordEncoder passwordEncoder) {
        this.authService = authService;
        this.refreshTokenService = refreshTokenService;
        this.jwtUtil = jwtUtil;
        this.emailVerificationService = emailVerificationService;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * 회원가입 API
     *
     * 사용자가 회원가입을 요청하면, 이메일, 이름, 생년월일, 비밀번호를 입력받아 회원을 등록한다.
     *
     * @param MemberSignupRequest 회원가입 요청 DTO (이메일, 이름, 생년월일, 비밀번호 포함)
     * @return 성공 시 회원가입 완료 메시지
     */
    @PostMapping("/signup")
    public ResponseEntity<String> signup(@Valid @RequestBody MemberSignupRequest memberSignupRequest) {
        try {
            // 회원가입 처리
            authService.signup(memberSignupRequest);
            return ResponseEntity.ok("회원가입 성공");
        } catch (IllegalArgumentException e) {
            // 이메일 중복 오류 처리
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 로그인 API
     * 사용자가 이메일과 비밀번호를 전송하면, 인증 후 JWT 토큰을 반환한다.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody MemberLoginRequest loginRequest) {
        try {
            LoginResponse response = authService.login(loginRequest);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("로그인 실패: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
        } catch (Exception e) {
            log.error("로그인 중 오류 발생: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestHeader("Authorization") String token) {
        String refreshToken = jwtUtil.resolveToken(token);

        refreshTokenService.verifyRefreshToken(refreshToken)
                .ifPresent(rt -> refreshTokenService.deleteByUser(rt.getUser())); // 삭제

        return ResponseEntity.ok("로그아웃 완료");
    }

    /**
     * 이메일 인증 요청 API
     *
     * 사용자가 회원가입창에서 이메일을 입력하고 '인증하기' 버튼을 누르면,
     * 입력된 이메일로 인증 코드가 전송되고, 해당 인증 코드는 DB에 저장된다.
     *
     * @param request 이메일 인증 요청 DTO (이메일 포함)
     * @return 인증 코드 발송 성공 메시지 (200 OK) 또는 오류 메시지
     */
    @PostMapping("/verify-email")
    public ResponseEntity<String> sendVerificationEmail(@Valid @RequestBody EmailVerificationRequest request) {
        emailVerificationService.sendVerificationCode(request.getEmail());
        return ResponseEntity.ok("인증 코드가 전송되었습니다.");
    }

    /**
     * 이메일 인증 코드 검증 API
     *
     * 사용자가 입력한 이메일과 인증 코드를 받아서, 해당 코드가 올바른지, 그리고 만료되지 않았는지 확인한다.
     *
     * @param request 이메일과 인증 코드를 담은 요청 DTO
     * @return 인증이 성공하면 200, 실패하면 400 응답
     */
    @PostMapping("/verify-code")
    public ResponseEntity<String> verifyEmailCode(@Valid @RequestBody EmailVerificationCheckRequest request) {
        boolean verified = emailVerificationService.verifyEmailCode(request.getEmail(), request.getVerificationCode());
        if (verified) {
            return ResponseEntity.ok("이메일 인증 성공");
        } else {
            return ResponseEntity.badRequest().body("인증 코드가 잘못되었거나 만료되었습니다.");
        }
    }

    /**
     * 이메일 중복 검사 API
     *
     * 클라이언트에서 이메일을 전송하면 해당 이메일이 이미 존재하는지 검사하여,
     * 사용 가능한 이메일인지 중복 여부를 반환한다.
     *
     * @param request 이메일 검사 요청 DTO (이메일 포함)
     * @return 사용 가능한 경우 "사용 가능한 이메일입니다." / 중복된 경우 "이미 존재하는 이메일입니다."
     */
    @PostMapping("/check-email")
    public ResponseEntity<String> checkEmail(@Valid @RequestBody EmailCheckRequest request) {
        boolean isDuplicate = authService.isEmailExist(request.getEmail());
        if (isDuplicate) {
            return ResponseEntity.badRequest().body("이미 존재하는 이메일입니다.");
        } else {
            return ResponseEntity.ok("사용 가능한 이메일입니다.");
        }
    }

    /**
     * 비밀번호 찾기 API
     * 사용자가 이메일과 생년월일을 입력하면, 해당 회원의 임시 비밀번호를 생성하여 이메일로 전송한다.
     *
     * @param request 비밀번호 찾기 요청 DTO
     * @return 성공 시 "비밀번호 재설정 이메일 전송 완료" 메시지
     */
    @PostMapping("/retrieve-password")
    public ResponseEntity<String> retrievePassword(@Valid @RequestBody PasswordRetrievalRequest request) {
        try {
            authService.retrievePassword(request);
            return ResponseEntity.ok("비밀번호 재설정 이메일 전송 완료");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
