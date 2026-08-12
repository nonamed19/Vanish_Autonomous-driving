import React from "react";
import styles from "../styles/CustomAlert.module.css";

const CustomAlert = ({ message, onClose }) => {
  return (
    <div className={styles.alertOverlay}>
      <div className={styles.alertBox}>
        <h2>{message}</h2>
      </div>
    </div>
  );
};

export default CustomAlert;