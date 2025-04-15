package com.moonshot.member_service.controller;

import com.moonshot.member_service.dto.MemberResponse;
import com.moonshot.member_service.dto.PasswordChangeRequest;
import com.moonshot.member_service.dto.WithdrawalRequest;
import com.moonshot.member_service.service.MemberService;
import com.moonshot.member_service.util.JWTUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Member;
import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Controller
@RequestMapping("/api/v1/members")
public class MemberController {

    private final MemberService memberService;
    private final JWTUtil jwtUtil;
    public MemberController(MemberService memberService, JWTUtil jwtUtil) {
        this.memberService = memberService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/change-password")
    public ResponseEntity<String> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        try {
            memberService.changePassword(request);
            return ResponseEntity.ok("비밀번호 변경 성공");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("비밀번호 변경 중 오류 발생: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("비밀번호 변경 실패");
        }
    }

    /**
     * 회원 정보 조회 API
     *
     * 요청 헤더의 Access Token에서 회원 ID를 추출하여 해당 회원의 정보를 조회한 후,
     * 민감 정보를 제외한 응답 DTO를 반환한다.
     *
     * @param authorization "Bearer {accessToken}" 형식의 Authorization 헤더
     * @return 회원 정보 응답(MemberResponse)
     */
    @GetMapping("/profile")
    public ResponseEntity<MemberResponse> getProfile(@RequestHeader("Authorization") String authorization) {
        // "Bearer " 접두사 제거
        String token = jwtUtil.resolveToken(authorization);
        log.info("Authorization header: '{}'", authorization);
        if (token == null) {
            log.info("token is null");
            return ResponseEntity.badRequest().build();
        }
        // Access Token에서 회원 ID 추출 (false: access token 처리)
        Long memberId = jwtUtil.extractUserNo(token, false);
        MemberResponse response = memberService.getMemberProfile(memberId);
        return ResponseEntity.ok(response);
    }

    /**
     * 회원 탈퇴 API
     *
     * 클라이언트는 탈퇴 요청 시, Authorization 헤더에 Access Token과 함께,
     * 요청 본문에 탈퇴 확인용 비밀번호를 전송한다.
     *
     * @param authorization "Bearer {accessToken}" 형식의 헤더
     * @param request       WithdrawalRequest DTO (비밀번호 포함)
     * @return 탈퇴 성공 시 메시지, 실패 시 오류 메시지
     */
    @PostMapping("/withdraw")
    public ResponseEntity<String> withdraw(
            @RequestHeader("Authorization") String authorization,
            @Valid @RequestBody WithdrawalRequest request) {
        try {
            memberService.withdraw(authorization, request.getPassword());
            return ResponseEntity.ok("회원 탈퇴 완료");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

