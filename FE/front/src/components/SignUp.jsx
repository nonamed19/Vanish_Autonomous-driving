import React, { useState } from "react";
import Hyundai from "../assets/images/Vanish.png";
import CheckImage from "../assets/images/check.png"; // 모달 창 이미지
import UnvisibleIcon from "../assets/images/unvisible.png";
import VisibleIcon from "../assets/images/visible.png";
import styles from "../styles/SignUp.module.css";
import { useNavigate } from "react-router-dom";
import {
  checkEmail,
  verifyEmail,
  verifyCode,
  createAccount,
} from "../api/auth";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [timer, setTimer] = useState(599); // 10분 타이머 for test purpose
  const [isEmailChecked, setIsEmailChecked] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasscodeVisible, setIsPasscodeVisible] = useState(false);
  const navigate = useNavigate();

  // 회원가입 정보 상태
  const [name, setName] = useState({ lastName: "", firstName: "" });
  const [dateOfBirth, setDateOfBirth] = useState({
    year: "",
    month: "",
    day: "",
  });
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercaseLowercase: false,
    number: false,
    specialChar: false,
  });

  const handleEmailSubmit = async () => {
    if (!email) {
      setErrorMessage("이메일을 입력해 주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // 간단한 이메일 형식 검증
    if (!emailRegex.test(email)) {
      setErrorMessage("이메일 주소를 확인해 주세요.");
      return;
    }

    try {
      const checkEmailResult = await checkEmail(email);
      console.log(checkEmailResult); // for debugging
      setIsEmailChecked(true);
      setSuccessMessage("인증 코드가 전송되었습니다.");

      if (checkEmailResult === "사용 가능한 이메일입니다.") {
        await verifyEmail(email);
        setErrorMessage("");
        setSuccessMessage("인증 코드가 전송되었습니다."); // 실제로 Email이 전송되는 시점
        console.log("인증 코드가 전송되었습니다."); // for debugging
        startTimer();
      } else {
        setErrorMessage(checkEmailResult.data.message);
        setSuccessMessage("");
      }
    } catch (err) {
      setErrorMessage(err.response.data);
      setSuccessMessage("");
    }
  };

  const handleVerificationSubmit = async () => {
    try {
      await verifyCode(email, verificationCode);
      setIsVerified(true);
      setErrorMessage("");
      setSuccessMessage("이메일 인증 성공");
    } catch (err) {
      setErrorMessage("인증 코드가 잘못되었거나 만료되었습니다.");
      setSuccessMessage("");
    }
  };

  const startTimer = () => {
    let countdown = timer;
    const interval = setInterval(() => {
      countdown -= 1;
      setTimer(countdown);
      if (countdown <= 0) clearInterval(interval);
    }, 1000);
  };

  const validatePassword = (password) => {
    const lengthValid = password.length >= 8 && password.length <= 20;
    const uppercaseLowercaseValid =
      /[A-Z]/.test(password) || /[a-z]/.test(password); // 대문자 또는 소문자 중 하나만 충족되도록 수정
    const numberValid = /\d/.test(password);
    const specialCharValid = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    setPasswordValidation({
      length: lengthValid,
      uppercaseLowercase: uppercaseLowercaseValid,
      number: numberValid,
      specialChar: specialCharValid,
    });
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    validatePassword(newPassword);
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible); // 비밀번호 표시 상태 전환
  };

  const togglePasscodeVisibility = () => {
    setIsPasscodeVisible(!isPasscodeVisible); // 인증코드 표시 상태 전환
  };

  const handleCompleteSignup = async () => {
    const fullName = name.lastName + name.firstName;
    const birthdate = `${dateOfBirth.year}-${dateOfBirth.month.padStart(
      2,
      "0"
    )}-${dateOfBirth.day.padStart(2, "0")}`;
    console.log(email, fullName, birthdate, password); // for debugging

    if (
      passwordValidation.length &&
      passwordValidation.uppercaseLowercase &&
      passwordValidation.number &&
      passwordValidation.specialChar &&
      password === passwordConfirm
    ) {
      try {
        await createAccount(email, fullName, birthdate, password);
        console.log("signup success"); // for debugging

        setShowModal(true);
      } catch (err) {
        console.log("이미 사용 중인 이메일입니다."); // for debugging
        setErrorMessage("이미 사용 중인 이메일입니다.");
      }
    } else {
      console.log("입력값을 다시 확인해주세요."); // for debugging
      setErrorMessage("입력값을 다시 확인해주세요.");
      setSuccessMessage("");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    navigate("/home");
  };

  return (
    <div className={styles.signupContainer}>
      <div
        className={styles.logoContainer}
        onClick={() => navigate("/Login")}
        style={{ cursor: "pointer" }}
      >
        <img src={Hyundai} alt="Hyundai" className={styles.HyundaiLogo} />
      </div>

      {!isVerified ? (
        <>
          {/* Email Input */}
          <div className={styles.pwInputGroup}>
            <h2>회원 가입</h2>
            <label>Email</label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage(""); 
              }} // 입력 시 즉시 오류 메시지 초기화
              className={
                typeof errorMessage === "string" &&
                errorMessage.includes("이메일")
                  ? styles.errorInput
                  : ""
              }
              disabled={isEmailChecked}
            />
            <button
              className={styles.confirmButton}
              onClick={handleEmailSubmit}
            >
              Confirm
            </button>
          </div>
          {/* Error Message */}
          {errorMessage && (
            <p
              className={`${styles.errorMessage} ${
                errorMessage === "이미 존재하는 이메일입니다." || "이메일을 입력해 주세요."
                  ? styles.specificErrorMessage // 특정 텍스트에만 적용되는 스타일
                  : ""
              }`}
            >
              {errorMessage}
            </p>
          )}

          {/* Success Message */}
          {successMessage && (
            <p className={styles.successMessage}>{successMessage}</p>
          )}

          {/* Verification Code Input */}
          {isEmailChecked && (
            <div className={styles.vcInputGroup}>
              <input
                type={isPasscodeVisible ? "text" : "password"}
                placeholder="Verification Code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className={
                  typeof errorMessage === "string" &&
                  errorMessage.includes("인증 번호")
                    ? styles.errorInput
                    : ""
                }
              />
              <img
                src={isPasscodeVisible ? UnvisibleIcon : VisibleIcon} // 아이콘 변경
                alt={isPasscodeVisible ? "Visible" : "Unvisible"}
                className={styles.passcodeToggleIcon}
                onClick={togglePasscodeVisibility} // 클릭 시 상태 전환
              />
              <div className={styles.timer}>
                {Math.floor(timer / 60)}:{timer % 60}
              </div>
              <button
                className={styles.sendButton}
                onClick={handleVerificationSubmit}
              >
                Enter
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Name Input */}
          <div className={styles.smInputGroup}>
            <h2>회원 가입</h2>
            <label>Name</label>
            <div className={styles.smInputSetName}>
              <input
                type="text"
                placeholder="Last"
                value={name.lastName}
                onChange={(e) => setName({ ...name, lastName: e.target.value })}
              />
              <input
                type="text"
                placeholder="First"
                value={name.firstName}
                onChange={(e) =>
                  setName({ ...name, firstName: e.target.value })
                }
              />
            </div>
          </div>

          {/* Date of Birth Input */}
          <div className={styles.smInputGroup}>
            <label>Date of Birth</label>
            <div className={styles.smInputSetDate}>
              <input
                type="text"
                placeholder="YYYY"
                value={dateOfBirth.year}
                onChange={(e) =>
                  setDateOfBirth({ ...dateOfBirth, year: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="MM"
                value={dateOfBirth.month}
                onChange={(e) =>
                  setDateOfBirth({ ...dateOfBirth, month: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="DD"
                value={dateOfBirth.day}
                onChange={(e) =>
                  setDateOfBirth({ ...dateOfBirth, day: e.target.value })
                }
              />
            </div>
          </div>

          {/* Password Input */}
          <div className={styles.pwInputGroupLast}>
            <label>Password</label>
            <div className={styles.inputWrapper}>
              <input
                type={isPasswordVisible ? "text" : "password"} // 비밀번호 표시 상태에 따라 타입 변경
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                className={`${styles.inputField}`}
              />
              <img
                src={isPasswordVisible ? UnvisibleIcon : VisibleIcon} // 아이콘 변경
                alt={isPasswordVisible ? "Visible" : "Unvisible"}
                className={styles.passwordToggleIcon}
                onClick={togglePasswordVisibility} // 클릭 시 상태 전환
              />
            </div>
            {/* Password Validation */}
            <ul className={styles.passwordValidation}>
              <li
                style={{
                  color: passwordValidation.length ? "#012D5E" : "#E63312",
                }}
              >
                8~20자 이내
              </li>
              <li
                style={{
                  color: passwordValidation.uppercaseLowercase ? "#012D5E" : "#E63312",
                }}
              >
                영문 대/소문자
              </li>
              <li
                style={{
                  color: passwordValidation.number ? "#012D5E" : "#E63312",
                }}
              >
                숫자
              </li>
              <li
                style={{
                  color: passwordValidation.specialChar ? "#012D5E" : "#E63312",
                }}
              >
                특수문자
              </li>
            </ul>
          </div>

          {/* Password Confirm Input */}
          <div className={styles.pwInputGroupLast}>
            <label>Password Confirm</label>
            <input
              type="text" // 타입 고정 (text)
              placeholder="Confirm Password"
              value={passwordConfirm}
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                setErrorMessage("");
              }}
              className={
                passwordConfirm && password !== passwordConfirm ? styles.errorInput : ""
              }
            />
            {passwordConfirm && password !== passwordConfirm && (
              <p className={styles.errorMessageLast}>비밀번호가 일치하지 않습니다.</p>
            )}
          </div>


          {/* Complete Signup Button */}
          {passwordConfirm && password === passwordConfirm && (
            <button
              className={styles.completeButtonLast}
              disabled={
                !(
                  passwordValidation.length &&
                  passwordValidation.uppercaseLowercase &&
                  passwordValidation.number &&
                  passwordValidation.specialChar
                )
              }
              onClick={handleCompleteSignup}
            >
              회원 가입
            </button>
          )}
          {/* Modal Overlay and Content */}
          {showModal && (
            <div className={styles.suModalOverlay}>
              <div className={styles.modalContent}>
                <img src={CheckImage} alt="Check" />
                <p>가입이 완료되었습니다.</p>
                <button
                  onClick={handleCloseModal}
                  className={styles.modalCloseButton}
                >
                  확인
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Copyright Text */}
      {/* <div className={styles.copyrightText}>
        <p>COPYRIGHT HYUNDAI MOTOR COMPANY.</p>
        <p>ALL RIGHTS RESERVED.</p>
      </div> */}
    </div>
  );
};

export default Signup;
