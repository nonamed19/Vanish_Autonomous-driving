import React, { useState } from "react";
import Hyundai from "../assets/images/Vanish.png";
import { logout } from "../api/auth";
import { useNavigate } from "react-router-dom";
import styles from "../styles/MyProfile.module.css";
import ExitImage from "../assets/images/exit.png"; // 모달 창 이미지
import CheckImage from "../assets/images/check.png"; // 모달 창 이미지

const MyProfile = () => {
  const email = localStorage.getItem("email");
  const name = localStorage.getItem("name");
  const birthdate = localStorage.getItem("birthdate");
  const navigate = useNavigate();

  const [showLogoutModal, setShowLogoutModal] = useState(false); // 로그아웃 모달 표시 상태

  // 생년월일 포맷팅 함수
  const formatBirthdate = (dateString) => {
    if (!dateString || dateString === "0000-00-00") {
      return "0000년 00월 00일"; // 기본값 처리
    }

    const [year, month, day] = dateString.split("-");
    return `${year}년 ${month}월 ${day}일`;
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false); // 모달 닫기
      navigate("/login"); // 로그인 페이지로 이동
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={styles.profileContainer}>
      <div
        className={styles.logoContainer}
        onClick={() => navigate("/Home")}
        style={{ cursor: "pointer" }}
      >
        <img src={Hyundai} alt="Hyundai" className={styles.HyundaiLogo} />
      </div>
      {/* 마이페이지 제목 */}
      <h2 className={styles.pageTitle}>계정 정보</h2>

      {/* 고객 정보 박스 */}
      <div className={styles.profileBox}>
        <div className={styles.profileInfo}>
          <span className={styles.infoLabel}>이름</span>
          <span className={styles.infoValue}>{name}</span>
        </div>
        <div className={styles.profileInfo}>
          <span className={styles.infoLabel}>이메일</span>
          <span className={styles.infoValue}>{email}</span>
        </div>
        <div className={styles.profileInfo}>
          <span className={styles.infoLabel}>생년월일</span>
          <span className={styles.infoValue}>{formatBirthdate(birthdate)}</span>
        </div>
      </div>

      {/* 하단 메뉴 */}
      <div className={styles.actionContainer}>
        <h3
          onClick={() => navigate("/password-change")}
          className={`${styles.actionItem} ${styles.clickable}`}
        >
          비밀번호 변경
        </h3>
        <h3
          onClick={() => navigate("/profile-withdraw")}
          className={`${styles.actionItem} ${styles.clickable}`}
        >
          회원 탈퇴
        </h3>
        <h3
          onClick={() => setShowLogoutModal(true)} // 로그아웃 모달 표시
          className={`${styles.actionItem} ${styles.clickable}`}
        >
          로그아웃
        </h3>
      </div>
      {/* 로그아웃 확인 모달 */}
      {showLogoutModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <img src={ExitImage} alt="ExitImage" />
            <p className={styles.logoutMessage}>로그아웃하시겠습니까?</p>
            <div>
              {/* 확인 버튼 */}
              <button
                onClick={handleLogout}
                className={`${styles.modalCloseButton} ${styles.confirmButton}`}
              >
                확인
              </button>
              {/* 취소 버튼 */}
              <button
                onClick={() => setShowLogoutModal(false)}
                className={`${styles.modalCloseButton} ${styles.cancelButton}`}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
