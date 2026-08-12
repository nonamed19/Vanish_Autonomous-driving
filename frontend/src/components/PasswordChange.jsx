import React, { useState } from "react";
import Hyundai from "../assets/images/Vanish.png";
import { changePassword } from "../api/members";
import { useNavigate } from "react-router-dom";
import styles from "../styles/MyProfile.module.css";
import VisibleIcon from "../assets/images/visible.png";
import UnvisibleIcon from "../assets/images/unvisible.png";
import CheckImage from "../assets/images/check.png"; // 모달 창 이미지

const PasswordChange = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [inputErrors, setInputErrors] = useState({
    currentPassword: false,
    newPassword: false,
  });
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] =
    useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  const handleChangePassword = async () => {
    let hasError = false;
    const errors = { currentPassword: false, newPassword: false };
    let errorMessage = "";

    // 1. 필수 입력값 검증
    if (!currentPassword.trim() || !newPassword.trim()) {
      errors.currentPassword = !currentPassword.trim();
      errors.newPassword = !newPassword.trim();
      errorMessage = "모든 필드를 입력해 주세요.";
      hasError = true;
    }
    // 2. 새 비밀번호 일치 검증
    else if (currentPassword === newPassword) {
      errors.newPassword = true;
      errorMessage = "새 비밀번호는 기존과 달라야 합니다.";
      hasError = true;
    }

    // 3. 오류 상태 업데이트
    setInputErrors(errors);
    setErrorText(errorMessage);

    if (hasError) return;

    // 4. API 호출
    const email = localStorage.getItem("email");
    try {
      await changePassword({ email, currentPassword, newPassword });
      setShowModal(true); // 성공 모달 표시
      resetForm();
    } catch (error) {
      handleApiError(error);
    }
  };

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setInputErrors({ currentPassword: false, newPassword: false });
    setErrorText("");
  };

  const handleApiError = (error) => {
    console.error("API Error:", error);
    setErrorText(error.response.data);
    setInputErrors({
      currentPassword: true,
      newPassword: true,
    });
  };

  // 5. 토글 기능
  const toggleVisibility = (setter) => () => setter((prev) => !prev);

  return (
    <div className={styles.passwordChangeContainer}>
      {/* 로고 및 제목 */}
      <div
        className={styles.logoContainer}
        onClick={() => navigate("/home")}
        style={{ cursor: "pointer" }}
      >
        <img
          src={Hyundai}
          alt="Hyundai"
          className={styles.HyundaiLogo}
          cursor
        />
      </div>
      <h2 className={styles.passwordTitle}>비밀번호 변경</h2>

      {/* 입력 필드 그룹 */}
      <div className={styles.inputGroup}>
        <div className={styles.inputWrapper}>
          <input
            type={isCurrentPasswordVisible ? "text" : "password"}
            placeholder="현재 비밀번호"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setInputErrors((prev) => ({ ...prev, currentPassword: false }));
            }}
            className={`${styles.passwordInput} ${
              inputErrors.currentPassword ? styles.InputError : ""
            }`}
          />
          <img
            src={isCurrentPasswordVisible ? UnvisibleIcon : VisibleIcon}
            alt="비밀번호 표시 전환"
            className={styles.passwordToggleIcon}
            onClick={toggleVisibility(setIsCurrentPasswordVisible)}
          />
        </div>

        <div className={styles.inputWrapper}>
          <input
            type={isNewPasswordVisible ? "text" : "password"}
            placeholder="새 비밀번호"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setInputErrors((prev) => ({ ...prev, newPassword: false }));
            }}
            className={`${styles.passwordInput} ${
              inputErrors.newPassword ? styles.InputError : ""
            }`}
          />
          <img
            src={isNewPasswordVisible ? UnvisibleIcon : VisibleIcon}
            alt="비밀번호 표시 전환"
            className={styles.passwordToggleIcon}
            onClick={toggleVisibility(setIsNewPasswordVisible)}
          />
        </div>

        {errorText && <p className={styles.errorText}>{errorText}</p>}
      </div>

      {/* 제출 버튼 */}
      <button
        onClick={handleChangePassword}
        className={`${styles.changeButton} ${styles.clickable}`}
      >
        비밀번호 변경
      </button>

      {/* 성공 모달 */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <img src={CheckImage} alt="성공 아이콘" />
            <p>성공적으로 변경되었습니다.</p>
            <button
              onClick={() => {
                setShowModal(false);
                navigate("/home");
              }}
              className={styles.modalCloseButton}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordChange;
