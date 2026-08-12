import React, { useEffect } from "react";
import axiosInstance from "../api/axiosInstance"; 
import { useNavigate } from "react-router-dom";

const ParkingRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    axiosInstance
      .post("/api/v1/remote/parking/choose?parkingLotId=4")
      .then((res) => {
        console.log("주차 API 호출 성공:", res.data);
        // 호출 완료 후 홈으로 이동
        navigate("/");
      })
      .catch((err) => {
        console.error("주차 API 호출 실패:", err);
        navigate("/");
      });
  }, [navigate]);

  return (
    <div>
      <h2>주차 API 호출 중...</h2>
      <p>잠시만 기다려 주세요.</p>
    </div>
  );
};

export default ParkingRedirect;
