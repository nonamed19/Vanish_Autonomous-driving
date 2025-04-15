import React, { useEffect, useState } from "react";
import styles from "../styles/Pay.module.css";
import Hyundai from "../assets/images/Vanish.png";
import { registerInitHistory, paymentsComplete, verifyPayment, cancelPayment } from "../api/payment";
import { useNavigate } from "react-router-dom";
import {useDeviceByAspectRatio} from "../App";
import barOn from "../assets/images/ivi_statusbar.png";
import barUnder from "../assets/images/ivi_gnb.png";

function PayComponent() {
  const impCode = import.meta.env.VITE_IMP_CODE;
  const [expectedPayment, setExpectedPayment] = useState(null);
  const navigate = useNavigate();
  const { isTablet } = useDeviceByAspectRatio();
  
  useEffect(() => {
    async function fetchExpectedPayment() {
      try {
        const data = await paymentsComplete();
        setExpectedPayment(data);
      } catch (error) {
        console.error("예상 결제 정보 불러오기 실패:", error);
      }
    }
    fetchExpectedPayment();
  }, []);


  const handlePayment = async (pg, payMethod) => {
    if (!expectedPayment) {
      alert("예상 결제 내역이 없습니다.");
      return;
    }

    const paymentData = expectedPayment;
    const isMobile = /iPhone|Android/i.test(navigator.userAgent);

    if (window.IMP) {
      const { IMP } = window;
      IMP.init(impCode);

      const name = localStorage.getItem("name");
      const email = localStorage.getItem("email");

      const requestObj = {
        pg: pg,
        pay_method: payMethod,
        merchant_uid: `merchant_${new Date().getTime()}`,
        name: paymentData.parkingLotName,
        amount: paymentData.totalFee,
        buyer_email: email,
        buyer_name: name,
      };

      if(isMobile){
        requestObj.m_redirect_url = "https://j12a707.p.ssafy.io/payment-result";
      }
      
      IMP.request_pay(requestObj, async (rsp) => {
        if (!isMobile) {
          if (rsp.success) {
            try {
              navigate("/payment-result?imp_uid=" + rsp.imp_uid);
            } catch (error) {
              console.error("결제 검증 실패:", error);
              alert("결제에 실패했습니다.");
              navigate("/payment-result?imp_uid=" + rsp.imp_uid);
            }
          } else {
            alert("결제가 실패했습니다: " + rsp.error_msg);
          }
        }
      });
    } else {
      alert("아임포트 라이브러리가 로드되지 않았습니다.");
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
      
      {/* 로고 및 제목 */}
      <div className={styles.logoContainer} style={{ cursor: "pointer" }}>
        <img
          src={Hyundai}
          alt="Hyundai"
          className={styles.HyundaiLogo}
          cursor
        />
      </div>
      <div className={styles.payContainer}>
      <h2>예상 결제 내역</h2>
      <div className={styles.payBox}>
        {expectedPayment && (
          <div className={styles.infoSection}>
            <div className={styles.infoDetail}>
              <span>주차장 이름</span>
              <span className={styles.infoValue}>
                {expectedPayment.parkingLotName}
              </span>
            </div>
            <div className={styles.infoDetail}>
              <span>주차 시작</span>
              <span className={styles.infoValue}>
                {new Date(expectedPayment.parkingStart).toLocaleString()}
              </span>
            </div>
            <div className={styles.infoDetail}>
              <span>주차 종료</span>
              <span className={styles.infoValue}>
                {new Date(expectedPayment.parkingEnd).toLocaleString()}
              </span>
            </div>
            <div className={styles.infoDetail}>
              <span>주차 시간</span>
              <span className={styles.infoValue}>
                {expectedPayment.parkingDuration}분
              </span>
            </div>
            <div className={styles.infoDetail}>
              <span>기본 요금</span>
              <span className={styles.infoValue}>
                {expectedPayment.baseFee}원
              </span>
            </div>
            <div className={styles.infoDetail}>
              <span>추가 요금</span>
              <span className={styles.infoValue}>
                {expectedPayment.rateFee}원
              </span>
            </div>
            <div className={styles.infoDetail}>
              <span>총 결제 금액</span>
              <span className={styles.infoValue}>
                {expectedPayment.totalFee}원
              </span>
            </div>
          </div>
          )}
        </div>
        <div className={styles.buttonContainer}>
          <button
            className={styles.payButton}
            onClick={() => handlePayment("html5_inicis.INIpayTest", "card")}
            >
            카드 결제
          </button>
          <button
            className={styles.kakaoButton}
            onClick={() => handlePayment("kakaopay", "trans")}
            >
            KAKAO PAY 결제
          </button>
        </div>
      </div>


      {/* 하단 바 */}
      {isTablet && (
        <div className={styles.tabletBottomBar}>
          <img src={barUnder} alt="Navigation Bar" className={styles.bottomBarImage} />
        </div>
      )}
    </div>
  );
}

export default PayComponent;
