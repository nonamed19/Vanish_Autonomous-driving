import React, { useState } from "react";
import Hyundai from "../assets/images/Vanish.png";
import CheckImage from "../assets/images/check.png";
import styles from "../styles/ForgotPassword.module.css";
import { useNavigate } from "react-router-dom";
import { retrievePassword } from "../api/auth"; // ✅ API 함수 불러오기

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // 이메일 형식 검증 함수
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 생년월일 형식 검증 함수 (YYYY-MM-DD)
  const validateDOB = (dob) => {
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dobRegex.test(dob);
  };

  const handleConfirm = async () => {
    // 입력값 검증
    if (!email || !dob) {
      setErrorMessage("정보를 정확히 입력해 주세요.");
      return;
    }

    // 형식 검증 추가
    if (!validateEmail(email)) {
      setErrorMessage("올바른 이메일 형식이 아닙니다.");
      return;
    }

    if (!validateDOB(dob)) {
      setErrorMessage("올바른 생년월일 형식이 아닙니다.");
      return;
    }

    setErrorMessage(""); // 기존 에러 초기화
    setSuccessMessage("잠시만 기다려주세요...");
    setIsLoading(true);
    try {
      const retPasswordResult = await retrievePassword(email, dob);
      if (retPasswordResult === "비밀번호 재설정 이메일 전송 완료") {
        setSuccessMessage(retPasswordResult);
        setErrorMessage("");
        setShowModal(true);
      } else {
        setSuccessMessage("");
        setErrorMessage("이메일 전송 오류 발생");
      }
    } catch (error) {
      setSuccessMessage("");
      setErrorMessage(error.response.data);
      console.log(error.response.data); // for debugging
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    navigate("/Login");
  };

  return (
    <div className={styles.forgotPasswordContainer}>
      <div
        className={styles.logoContainer}
        onClick={() => navigate("/Login")}
        style={{ cursor: "pointer" }}
      >
        <img src={Hyundai} alt="Hyundai" className={styles.HyundaiLogo} />
      </div>
      <div className={styles.pwInputGroup}>
        <h2>PW 찾기</h2>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errorMessage) setErrorMessage(""); // 에러 초기화
          }}
          placeholder="Email"
          className={(errorMessage && (!validateEmail(email) || !email)) 
            ? styles.errorInput 
            : null}
        />
      </div>
      <div className={styles.pwInputGroup}>
        <label>Date of Birth</label>
        <input
          type="date"
          value={dob}
          onChange={(e) => {
            setDob(e.target.value);
            if (errorMessage) setErrorMessage(""); // 에러 초기화
          }}
          className={(errorMessage && (!validateDOB(dob) || !dob)) 
            ? styles.errorInput 
            : null}
        />
      </div>

      {errorMessage && <p className={styles.confirmErrorMessage}>{errorMessage}</p>}
      {successMessage && (
        <p className={styles.successMessage}>{successMessage}</p>
      )}

      <button onClick={handleConfirm} className={styles.confirmButton}>
        Confirm
      </button>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <img src={CheckImage} alt="Check" />
            <p>이메일이 전송되었습니다.</p>
            <button
              onClick={handleCloseModal}
              className={styles.modalCloseButton}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* <div className={styles.copyrightText}>
        <p>COPYRIGHT HYUNDAI MOTOR COMPANY.</p>
        <p>ALL RIGHTS RESERVED.</p>
      </div> */}
    </div>
  );
}

export default ForgotPassword;
