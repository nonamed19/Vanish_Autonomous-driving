// PaymentResult.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import HyundaiSuccess from "../assets/images/check.png"; // 성공 아이콘 이미지
import HyundaiFailure from "../assets/images/warning.png"; // 실패 아이콘 이미지
import barOn from "../assets/images/ivi_statusbar.png";
import barUnder from "../assets/images/ivi_gnb.png";
import styles from "../styles/PaymentResult.module.css";

import { vehicleDestination } from "../api/parking";
import { verifyPayment, cancelPayment } from "../api/payment";
import { useDeviceByAspectRatio } from "../App";

function PaymentResult() {
  const [message, setMessage] = useState("결제 결과 확인 중...");
  const [isSuccess, setIsSuccess] = useState(null); // 성공 여부 상태 추가
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isTablet } = useDeviceByAspectRatio();
  const impUid = searchParams.get("imp_uid");
  console.log(impUid);

  const vehicleVin = localStorage.getItem("vehicleVin");
  const [longitudeMe, setLongitudeMe] = useState(localStorage.getItem("longitudeMe"));
  const [latitudeMe, setLatitudeMe] = useState(localStorage.getItem("latitudeMe"));

  // useEffect(() => {
  //   const long = localStorage.getItem("longitudeMe");
  //   const lat = localStorage.getItem("latitudeMe");

  //   setLongitudeMe(long)
  //   setLatitudeMe(lat)
  // }, []);

  const handleVehicleDestination = async () => {
    try {
      const response = await vehicleDestination({
        vehicleVin: vehicleVin,
        currentLocation: {
          longitude: longitudeMe,
          latitude: latitudeMe,
        },
      });
      console.log(response); // for debugging
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const fetchResult = async () => {
      if (!impUid) {
        setMessage("결제 고유 ID(imp_uid)를 찾을 수 없습니다.");
        setIsSuccess(false);
        return;
      }
      try {
        const result = await verifyPayment(impUid);

        // ✅ 결제 성공 여부 status로 판단
        if (result?.response?.status === "paid") {
          handleVehicleDestination();
          setMessage("결제에 성공하였습니다!");
          setIsSuccess(true);
        } else {
          setMessage("결제 상태가 유효하지 않습니다.");
          setIsSuccess(false);
        }
      } catch (error) {
        console.error("❌ 결제 검증 실패:", error);
        setMessage("결제 검증 중 오류가 발생했습니다.");
        setIsSuccess(false);
      }
    };
    fetchResult();
  }, [impUid]);

  const handleButtonClick = () => {
    if (isSuccess) {
      navigate("/home"); // 결제 성공 시 '/home'으로 이동
    } else {
      navigate("/payment"); // 결제 실패 시 '/payment'로 이동
    }
  };

  return (
    <div className={`${styles.container} ${isTablet ? styles.tabletMode : ""}`}>
      {/* 상단 바 */}
      {isTablet && (
        <div className={styles.tabletTopBar}>
          <img src={barOn} alt="Status Bar" className={styles.topBarImage} />
        </div>
      )}

      <div className={styles.resultContainer}>
        <div className={styles.resultCard}>
          {/* ✅ 로딩 중 상태 표시 */}
          {isSuccess === null && (
            <h2 className={styles.resultMessage}>결제 결과 확인 중입니다...</h2>
          )}

          {/* 성공 또는 실패에 따라 다른 이미지와 메시지 표시 */}
          {isSuccess === true && (
            <div className={styles.successCase}>
              <img
                src={HyundaiSuccess}
                alt="결제 성공"
                className={styles.statusIcon}
              />
              <h2 className={styles.resultMessage}>{message}</h2>
            </div>
          )}
          {isSuccess === false && (
            <div className={styles.failureCase}>
              <img
                src={HyundaiFailure}
                alt="결제 실패"
                className={styles.statusIcon}
              />
              <h2 className={styles.resultMessage}>{message}</h2>
            </div>
          )}

          {/* ✅ 버튼은 결과 확정 후만 노출 */}
          {isSuccess !== null && (
            <button className={styles.homeButton} onClick={handleButtonClick}>
              확인
            </button>
          )}
        </div>
      </div>

      {/* 하단 바 */}
      {isTablet && (
        <div className={styles.tabletBottomBar}>
          <img
            src={barUnder}
            alt="Navigation Bar"
            className={styles.bottomBarImage}
          />
        </div>
      )}
    </div>
  );
}

export default PaymentResult;
