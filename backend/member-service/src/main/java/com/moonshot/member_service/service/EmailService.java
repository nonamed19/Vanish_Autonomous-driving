package com.moonshot.member_service.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendVerificationEmail(String toEmail, String verificationCode) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Vanish 회원가입 이메일 인증");
        message.setText("인증 코드는: " + verificationCode + " 입니다. 해당 코드를 입력해주세요.");
        mailSender.send(message);
    }

    public void sendPasswordRetrievalEmail(String toEmail, String tempPassword) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("임시 비밀번호 안내");
        message.setText("요청하신 임시 비밀번호는: " + tempPassword + "\n로그인 후 비밀번호를 변경해 주세요.");
        mailSender.send(message);
    }
}
