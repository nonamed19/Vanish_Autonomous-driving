import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { DeviceFrameset } from "react-device-frameset";
import { useMediaQuery } from "react-responsive";
import "react-device-frameset/styles/marvel-devices.min.css";
import Logo from "./components/Logo";
import Login from "./components/Login";
import ForgotPassword from "./components/ForgotPassword";
import SignUp from "./components/SignUp";
import Map from "./components/Map";
import MapComponent from "./components/MapComponent";
import BaseMapComponent from "./components/BaseMapComponent";
import VehicleRegister from "./components/VehicleRegisterComponent";
import NewInfo from "./components/NewInfoComponent";
import MyProfile from "./components/MyProfile";
import PasswordChange from "./components/PasswordChange";
import ProfileWithdraw from "./components/ProfileWithdraw";
import AutoParking from "./components/AutoParking";
import AutoRoaming from "./components/AutoRoaming";
import PayComponent from "./components/PayComponent";
import PaymentResult from "./components/PaymentResult";
import ParkingRedirect from "./components/ParkingRedirect";

// 화면 비율 기반으로 적절한 디바이스 프레임 감지 훅
export const useDeviceByAspectRatio = () => {
  // 태블릿/폰 구분을 위한 기본 미디어 쿼리
  const isWideScreen = useMediaQuery({ query: "(min-aspect-ratio: 16/10)" });

  // 현재 화면의 정확한 비율 계산
  const [exactRatio, setExactRatio] = useState(
    typeof window !== "undefined" ? window.innerWidth / window.innerHeight : 0
  );

  useEffect(() => {
    const updateRatio = () => {
      setExactRatio(window.innerWidth / window.innerHeight);
    };

    updateRatio(); // 초기 실행
    window.addEventListener("resize", updateRatio);
    return () => window.removeEventListener("resize", updateRatio);
  }, []);

  return {
    isTablet: isWideScreen || (exactRatio >= 1.4 && exactRatio <= 1.8),
    ratio: exactRatio,
  };
};

function App() {
  const [scale, setScale] = useState(1);
  const [isPWA, setIsPWA] = useState(false);

  // PWA 감지
  useEffect(() => {
    // PWA로 실행 중인지 확인
    const isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone || 
                          document.referrer.includes('android-app://');
    setIsPWA(isPWAInstalled);
  }, []);

  // 개선된 디바이스 감지 로직 사용
  const { isTablet, ratio } = useDeviceByAspectRatio();

  // 동적 스케일 계산 함수
  const getOptimalScale = () => {
    // PWA 또는 모바일 기기의 경우 스케일 조정 없음
    if (isPWA || window.innerWidth <= 768) return 1;

    // PC의 경우 디바이스 유형에 따라 스케일 조정
    const targetWidth = isTablet ? 1024 : 360;  // 태블릿 또는 갤럭시 S24 너비
    const targetHeight = isTablet ? 768 : 780;  // 태블릿 또는 갤럭시 S24 높이
    const currentWidth = window.innerWidth * 0.9;
    const currentHeight = window.innerHeight * 0.9;
    
    const widthScale = currentWidth / targetWidth;
    const heightScale = currentHeight / targetHeight;

    return Math.min(widthScale, heightScale); // 화면에 맞는 최소 스케일 반환
  };

  useEffect(() => {
    // 초기 스케일 계산
    setScale(getOptimalScale());

    // 화면 크기 변경 시 스케일 재계산
    const handleResize = () => {
      setScale(getOptimalScale());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isPWA, isTablet]);

  // 라우트 컴포넌트 - 중복 방지용
  const routeElements = (
    <Routes>
      <Route path="/" element={<Logo />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/map" element={<Map />} />
      <Route path="/main" element={<MapComponent />} />
      <Route path="/home" element={<BaseMapComponent />} />
      <Route path="/vehicle-registration" element={<VehicleRegister />} />
      <Route path="/newinfo" element={<NewInfo />} />
      <Route path="/my-profile" element={<MyProfile />} />
      <Route path="/password-change" element={<PasswordChange />} />
      <Route path="/profile-withdraw" element={<ProfileWithdraw />} />
      <Route path="/payment" element={<PayComponent />} />
      <Route path="/payment-result" element={<PaymentResult />} />
      <Route path="/auto-parking" element={<AutoParking />} />
      <Route path="/parking-redirect" element={<ParkingRedirect />} />
      <Route path="/auto-roaming" element={<AutoRoaming />} />
    </Routes>
  );

  return (
    <div className="app-container">
      {isPWA || window.innerWidth <= 768 ? (
        // PWA/모바일 모드 - 프레임 없음, 직접 콘텐츠 표시
        <Router>
          <div className="device-content mobile-content">
            {routeElements}
          </div>
        </Router>
      ) : isTablet ? (
        // 태블릿 프레임 (PC에서 와이드 스크린)
        <div className="tablet-device-container" style={{ transform: `scale(${scale})` }}>
          <div className="tablet-frame">
            <Router>
              <div className="device-content">
                {routeElements}
              </div>
            </Router>
          </div>
        </div>
      ) : (
        // 폰 프레임 (PC에서 일반 스크린)
        <div className="phone-device-container" style={{ transform: `scale(${scale})` }}>
          <DeviceFrameset device="Galaxy Note 8" color="black">
            <Router>
              <div className="device-content">
                {routeElements}
              </div>
            </Router>
          </DeviceFrameset>
        </div>
      )}

      <style>{`
        /* 전역 스크롤바 숨김 처리 */
        html, body {
          -ms-overflow-style: none;
          scrollbar-width: none;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        html::-webkit-scrollbar, 
        body::-webkit-scrollbar {
          display: none;
          width: 0;
        }

        .app-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 0;
        }

        /* 모바일/PWA 콘텐츠 */
        .mobile-content {
          width: 100vw;
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          transform: none;
          background-color: #fcfcfc;
        }

        /* 태블릿 프레임 스타일링 */
        .tablet-device-container {
          transform-origin: center center;
        }
        
        .tablet-frame {
          width: 1024px;
          height: 768px;
          background-color: #000;
          padding: 15px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          border-radius: 20px;
          overflow: hidden;
        }

        .tablet-frame .device-content {
          border-radius: 10px;
        }

        /* 폰 프레임 스타일링 */
        .phone-device-container {
          transform-origin: center center;
        }

        .device-content {
          width: 100%;
          height: 100%;
          background-color: #fcfcfc;
          position: relative;
          overflow: hidden;
        }

        /* DeviceFrameset 커스터마이징 */
        .marvel-device {
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
}

export default App;