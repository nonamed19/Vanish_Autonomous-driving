package com.moonshot.member_service.entity;

import jakarta.annotation.Nullable;
import jakarta.persistence.*;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Date;

@Entity
@Table(name = "users")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Slf4j
public class Member {
    @Id
    @Getter
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Getter
    @Setter
    @Column(nullable = false)
    private String name;

    @Setter
    @Column(nullable = false)
    private String password;

    @Getter
    @Setter
    @Column(nullable = false)
    private String email;

    @Getter
    @Setter
    @Column(nullable = false)
    private LocalDate birthdate;

    @Getter
    @CreationTimestamp
    private LocalDateTime createdAt;

    @Getter
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Getter
    @Setter
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Status status; // Status는 ACTIVE, INACTIVE 등의 enum

    /**
     * 비밀번호가 일치하는지 확인하는 메서드
     *
     * @param rawPassword 사용자가 입력한 원본 비밀번호
     * @param encoder     BCryptPasswordEncoder
     * @return 일치하면 true, 아니면 false
     */
    public boolean checkPassword(String rawPassword, BCryptPasswordEncoder encoder) {
        log.info("Checking password : {}", rawPassword);
        log.info("Checking password : {}", encoder.encode(rawPassword));
        return encoder.matches(rawPassword, this.password);
    }
    public enum Status {
        ACTIVE, INACTIVE
    }
}
