import React, { useState } from "react";
import Hyundai from "../assets/images/Vanish.png";
import CheckImage from "../assets/images/check.png";
import VisibleIcon from "../assets/images/visible.png";
import UnvisibleIcon from "../assets/images/unvisible.png";
import OutImage from "../assets/images/warning.png";
import { withdraw } from "../api/members";
import { useNavigate } from "react-router-dom";
import styles from "../styles/MyProfile.module.css";

const ProfileWithdraw = () => {
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [inputError, setInputError] = useState(false);

  const navigate = useNavigate();

  const handleWithdraw = async () => {
    // 오류 처리: 비밀번호가 입력되지 않은 경우
    if (!withdrawPassword.trim()) {
      setInputError(true);
      setErrorText("비밀번호를 입력해 주세요.");
      return; // 오류 발생 시 함수 종료 (모달 방지)
    }

    try {
      await withdraw({ password: withdrawPassword });
      setShowSuccessModal(true); // 회원 탈퇴 성공 시 모달 표시
    } catch (error) {
      console.error(error);
      setErrorText(error.response?.data || "회원 탈퇴 중 오류가 발생했습니다.");
      setInputError(true);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    navigate("/login"); // 성공 모달 닫기 후 로그인 페이지로 이동
  };

  const handleConfirmWithdraw = () => {
    // 확인 모달 닫기 및 탈퇴 처리
    setShowConfirmModal(false);
    handleWithdraw();
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <div className={styles.profileContainer}>
      <div
        className={styles.logoContainer}
        onClick={() => navigate("/home")}
        style={{ cursor: "pointer" }}
      >
        <img src={Hyundai} alt="Hyundai" className={styles.HyundaiLogo} />
      </div>
      <h2>회원 탈퇴</h2>

      {/* 입력 필드 */}
      <div className={styles.inputWrapper}>
        <input
          type={isPasswordVisible ? "text" : "password"} // 패스워드 토글 기능 적용
          placeholder="비밀번호 입력"
          value={withdrawPassword}
          onChange={(e) => {
            setWithdrawPassword(e.target.value);
            setInputError(false); // 입력 시 에러 초기화
            setErrorText(""); // 에러 메시지 초기화
          }}
          className={`${styles.passwordInput} ${inputError ? styles.InputError : ""}`}
        />
        <img
          src={isPasswordVisible ? UnvisibleIcon : VisibleIcon}
          alt={isPasswordVisible ? "Hide Password" : "Show Password"}
          className={styles.passwordToggleIcon}
          onClick={togglePasswordVisibility}
        />
      </div>
      {errorText && <p className={styles.signoutErrorText}>{errorText}</p>} {/* 에러 메시지 표시 */}

      {/* 회원 탈퇴 버튼 */}
      <button
        onClick={() => {
          if (!withdrawPassword.trim()) {
            setInputError(true);
            setErrorText("비밀번호를 입력해 주세요.");
            return; // 오류 발생 시 확인 모달 방지
          }
          setShowConfirmModal(true); // 비밀번호가 올바른 경우 확인 모달 표시
        }}
        className={`${styles.changeButton} ${styles.clickable}`}
      >
        회원 탈퇴
      </button>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.signupModalContent}>
            <img src={OutImage} alt="재확인 아이콘" />
            <p>정말로 탈퇴하시겠습니까?</p>
            <div>
              <button
                onClick={handleConfirmWithdraw}
                className={`${styles.modalCloseButton} ${styles.confirmButton}`}
              >
                확인
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className={`${styles.modalCloseButton} ${styles.cancelButton}`}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <img src={CheckImage} alt="Success" />
            <p>회원 탈퇴가 완료되었습니다.</p>
            <button onClick={handleCloseSuccessModal} className={styles.modalCloseButton}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileWithdraw;
