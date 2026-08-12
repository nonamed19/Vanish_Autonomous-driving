import React, { useState, useEffect } from "react";
import Hyundai from "../assets/images/Vanish.png";
import Car3 from "../assets/images/Car3.png";
import UnvisibleIcon from "../assets/images/unvisible.png";
import VisibleIcon from "../assets/images/visible.png";
import { Link, useNavigate } from "react-router-dom";
import { useMediaQuery } from "react-responsive";
import styles from "../styles/Login.module.css";
import { login } from "../api/auth";
import { requestForToken } from "../firebase";
import { registerFcmToken } from "../fcm";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  // 태블릿 화면 비율 감지
  const isTablet = useMediaQuery({ query: "(min-aspect-ratio: 16/10)" });

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      navigate("/home");
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    // 입력값 검증
    if (!username || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setError(null);

    try {
      const data = await login({ email: username, password });
      console.log("Login Success:", data);
      // FCM 토큰 요청 및 등록
      const fcmToken = await requestForToken();
      if (fcmToken) {
        await registerFcmToken(fcmToken);
      }
      navigate("/home");
    } catch (err) {
      console.error("Login Failed:", err.message);
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <div className={styles.loginBackground}>
      <div className={styles.loginContainer}>
        <form onSubmit={handleSubmit}>
          <div
            className={styles.liLogoContainer}
            onClick={() => navigate("/Login")}
            style={{ cursor: "pointer" }}
          >
            <img src={Hyundai} alt="Hyundai" className={styles.liHyundaiLogo} />
          </div>
          <div className={styles.inputGroup}>
            <div className={styles.gotolink}>
              <label>Email</label>
              <Link to="/signup" className={styles.goToLink}>
                Create Account
              </Link>
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Email"
            />
          </div>
          <div className={styles.inputGroup}>
            <div className={styles.gotolink}>
              <label>Password</label>
              <Link to="/forgot-password" className={styles.goToLink}>
                Forgot Password?
              </Link>
            </div>
            <div className={styles.passwordWrapper}>
              <input
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <img
                src={isPasswordVisible ? UnvisibleIcon : VisibleIcon}
                alt={isPasswordVisible ? "Visible" : "Unvisible"}
                className={styles.passwordToggleIcon}
                onClick={togglePasswordVisibility}
              />
            </div>
          </div>
          {error && <p className={styles.loginErrorText}>{error}</p>}
          <button type="submit">Login</button>
          {/* <div className={styles.liCopyrightText}>
            <p>COPYRIGHT HYUNDAI MOTOR COMPANY.</p>
            <p>ALL RIGHTS RESERVED.</p>
          </div> */}
        </form>
      </div>
      {isTablet && (
        <div className={styles.carSlider}>
          <img src={Car3} alt="Car3" className={styles.carImage} />
        </div>
      )}
    </div>
  );
}

export default Login;
