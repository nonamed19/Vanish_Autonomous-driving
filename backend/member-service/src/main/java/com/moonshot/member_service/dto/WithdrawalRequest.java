package com.moonshot.member_service.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class WithdrawalRequest {
    @NotBlank(message = "비밀번호는 필수 입력 값입니다.")
    private String password;
}
