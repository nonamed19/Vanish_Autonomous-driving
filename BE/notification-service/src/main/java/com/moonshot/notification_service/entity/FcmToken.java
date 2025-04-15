package com.moonshot.notification_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "fcm_tokens")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FcmToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter
    @Column(nullable = false, unique = true)
    private Long userId;  // Member ID와 연동

    @Setter
    @Column(nullable = false, length = 512)
    private String token;

}
