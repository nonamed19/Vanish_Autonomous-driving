package com.moonshot.member_service.service;

import com.moonshot.member_service.entity.EmailVerification;
import com.moonshot.member_service.repository.EmailVerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private final EmailVerificationRepository emailVerificationRepository;
    private final EmailService emailService; // 미리 구현한 EmailService 사용

    /**
     * 사용자가 입력한 이메일로 인증 코드를 생성하여 이메일 발송하고, DB에 저장한다.
     *
     * @param email 사용자가 입력한 이메일
     */
    public void sendVerificationCode(String email) {
        // 6자리 숫자로 인증 코드 생성
        String code = String.format("%06d", new Random().nextInt(1000000));

        // 유효기간 10분 설정
        LocalDateTime expiryTime = LocalDateTime.now().plusMinutes(10);

        // 이메일 인증 정보를 DB에 저장 (이미 존재하면 업데이트)
        EmailVerification verification = emailVerificationRepository.findByEmail(email)
                .orElse(EmailVerification.builder().email(email).build());

        verification.setVerificationCode(code);
        verification.setExpiryTime(expiryTime);
        verification.setVerified(false);

        emailVerificationRepository.save(verification);

        // 이메일 발송
        emailService.sendVerificationEmail(email, code);
    }

    /**
     * 이메일과 인증 코드를 받아서 검증한다.
     * 인증 코드가 일치하고 만료되지 않았다면 인증 완료 상태로 업데이트한다.
     *
     * @param email 사용자가 입력한 이메일
     * @param code  사용자가 입력한 인증 코드
     * @return 인증 성공 여부 (true/false)
     */
    public boolean verifyEmailCode(String email, String code) {
        // DB에서 해당 이메일로 저장된 인증 정보를 가져옴
        EmailVerification verification = emailVerificationRepository.findByEmail(email)
                .orElse(null);

        if (verification == null) {
            return false;
        }

        // 인증 코드가 일치하는지, 만료되지 않았는지 체크
        if (verification.getVerificationCode().equals(code) &&
                verification.getExpiryTime().isAfter(LocalDateTime.now())) {

            // 인증 완료 처리 (예: isVerified 플래그 업데이트)
            verification.setVerified(true);
            emailVerificationRepository.save(verification);
            return true;
        }

        return false;
    }
}
