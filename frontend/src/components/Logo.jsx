import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import applogo from "../assets/images/Vanish.png";
import styles from "../styles/Logo.module.css";

function Logo() {
  const navigate = useNavigate();

  useEffect(() => {
    // 2초 후 로그인 화면으로 이동
    const timeout = setTimeout(() => {
      navigate("/login");
    }, 2000);

    return () => clearTimeout(timeout); // Cleanup timeout
  }, [navigate]);

  return (
    <div className={styles.applogoContainer}>
      <img src={applogo} alt="Logo" className={styles.applogoImage} />
    </div>
  );
}

export default Logo;
