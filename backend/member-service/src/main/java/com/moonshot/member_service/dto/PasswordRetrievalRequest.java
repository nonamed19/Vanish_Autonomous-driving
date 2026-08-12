package com.moonshot.member_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class PasswordRetrievalRequest {

    @Email(message = "유효한 이메일 주소를 입력하세요.")
    @NotNull(message = "이메일은 필수입니다.")
    private String email;

    @NotNull(message = "생년월일은 필수입니다.")
    private LocalDate birthdate;
}
