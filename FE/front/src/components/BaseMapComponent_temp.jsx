import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "../styles/BaseMap.module.css";
import noneImage from "../assets/images/none.png"; // Import the image
import parkingIcon from "../assets/images/parking-area.png"; // 주차 아이콘 이미지
import roamingIcon from "../assets/images/loop.png"; // 배회 아이콘 이미지
import refuelIcon from "../assets/images/fuel.png"; // 주유 아이콘 이미지
import { useNavigate, Link } from "react-router-dom"; // Assuming you're using React Router
import menuIcon from "../assets/images/menu.png";
import Ioniq9 from "../assets/images/Ioniq9-Personal.png";
import Ioniq5 from "../assets/images/Ioniq5-Shared.png";
import Nexo from "../assets/images/Nexo.png";
import { vehicleslocation } from "../api/vehicles";

const BaseMapComponent = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();
  const panelRef = useRef();
  const dragHandleRef = useRef();
  const [panelHeight, setPanelHeight] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef();
  const [touchStartX, setTouchStartX] = useState(0);
  const [menuTranslate, setMenuTranslate] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [driving, setDriving] = useState(false);
  // const { isTablet } = useDeviceByAspectRatio();

  // const [userName, setUserName] = useState(""); // 굳이 useState로 관리할 필요 없을 듯

  const navigate = useNavigate();
  const connectedId = localStorage.getItem("connectedVehicleId");

  // temp
  localStorage.setItem("longitude", "126.5628");
  localStorage.setItem("latitude", "37.5249");

  let initialVehicles = [
    {
      id: 1,
      name: "IONIQ 9",
      type: "개인 차량",
      image: Ioniq9,
      connected: connectedId === "1",
    },
    {
      id: 2,
      name: "IONIQ 5",
      type: "공유받은 차",
      image: Ioniq5,
      connected: connectedId === "2",
    },
  ];

  if (localStorage.getItem("vehicleVin")) {
    initialVehicles.push({
      id: 3,
      name: localStorage.getItem("model"),
      type: localStorage.getItem("ownership"),
      image: Nexo,
      connected: connectedId === "3",
    });
  }

  // useEffect(() => {
  //   const interval = setInterval(async () => {
  //     try {
  //       const response = await vehicleslocation();
  //       console.log(response.gps); // for debugging
  //     } catch (error) {
  //       console.error("차량 위치 요청 실패:", error);
  //     }
  //   }, 500); // 0.5 sec
  //   return () => clearInterval(interval);
  // }, []);FE/front/src/components/BaseMapComponent.jsx

  const connectedVehicle = initialVehicles.find((v) => v.connected);
  useEffect(() => {
    if (["1", "2", "3"].includes(connectedId)) {
      setHasRegisteredVehicle(1);
    }
  }, [connectedId]);

  // 최소 패널 높이 설정 (%)
  const MIN_PANEL_HEIGHT = 5;

  // 차량 등록 여부를 나타내는 임의 변수 (0: 없음, 1: 있음)
  const [hasRegisteredVehicle, setHasRegisteredVehicle] = useState(0);

  const toggleVehicleStatus = () => {
    if (hasRegisteredVehicle === 0) {
      // 1. 차량 등록 X → 등록 O (운전 중 X)
      setHasRegisteredVehicle(1);
      setDriving(false);
    } else if (hasRegisteredVehicle === 1 && !driving) {
      // 2. 차량 등록 O → 운전 중 O
      setDriving(true);
    } else {
      // 3. 운전 중 O → 차량 등록 X (초기 상태)
      setHasRegisteredVehicle(0);
      setDriving(false);
    }
  };

  // 메뉴 토글 함수
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      navigate("/Login");
    }
  }, []);

  useEffect(() => {
    // Add your Mapbox access token here
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    const defaultZoom = 19.3;
    const defaultLongitude = 126.5628; // 경도 설정
    const defaultLatitude = 37.5249; // 위도 설정

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/sharmx1am/cm8ibm75x017501r094cmctgp",
      center: [defaultLongitude, defaultLatitude],
      zoom: defaultZoom,
      pitch: 60,
      bearing: 28,
      antialias: true, // 3D 렌더링을 위한 안티앨리어싱 활성화
    });

    // Add error handling
    mapRef.current.on("error", (e) => {
      // Prevent the error from being logged to console
      e.preventDefault();

      // Optionally, you can handle specific errors or log them in a controlled way
      if (e.error && e.error.status === 404) {
        // Handle 404 errors silently or with custom logic
        console.debug("Resource not found, but error suppressed");
      }
    });

    // Map needs to be resized when the container size changes
    const resizeMap = () => {
      if (
        mapRef.current &&
        mapContainerRef.current &&
        mapContainerRef.current.offsetWidth > 0
      ) {
        try {
          mapRef.current.resize();
        } catch (e) {
          console.debug("Error resizing map:", e);
        }
      }
    };

    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .mapboxgl-ctrl-attrib-button {
        display: none !important;
      }
      
      .mapboxgl-ctrl-bottom-left .mapboxgl-ctrl {
        margin: 0 0 10px 10px;
      }
      
      .mapboxgl-ctrl-logo {
        display: block !important;
        position: relative !important;
        margin: 0 !important;
      }
    `;
    document.head.appendChild(styleElement);

    // Add resize observer to detect height changes
    const observer = new ResizeObserver(resizeMap);
    if (mapContainerRef.current) {
      observer.observe(mapContainerRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
      if (mapContainerRef.current) {
        observer.unobserve(mapContainerRef.current);
      }
      // Remove the style element when component unmounts
      document.head.removeChild(styleElement);
    };
  }, []);

  // 드래그 시작 핸들러
  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
    setStartY(clientY);
  };

  // 드래그 중 핸들러
  const handleDrag = (e) => {
    if (!isDragging) return;

    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
    const deltaY = startY - clientY;

    const windowHeight = window.innerHeight;
    const deltaPercent = (deltaY / windowHeight) * 100;

    const newHeight = Math.min(
      Math.max(panelHeight + deltaPercent, MIN_PANEL_HEIGHT),
      90
    );

    setPanelHeight(newHeight);
    setStartY(clientY);

    if (mapRef.current) {
      mapRef.current.resize();
    }
  };

  // 드래그 종료 핸들러
  const handleDragEnd = () => {
    setIsDragging(false);

    if (panelHeight < MIN_PANEL_HEIGHT + 30) {
      setPanelHeight(MIN_PANEL_HEIGHT);
      panelRef.current.classList.add(styles.minimized); // 패널 최소화 상태 추가
    } else if (panelHeight < 40) {
      setPanelHeight(MIN_PANEL_HEIGHT);
    } else if (panelHeight > 70) {
      setPanelHeight(80);
    } else {
      setPanelHeight(40);
      panelRef.current.classList.remove(styles.minimized); // 패널 최소화 상태 제거
    }

    if (mapRef.current) {
      mapRef.current.resize();
    }
  };

  // 이벤트 리스너 등록
  useEffect(() => {
    const dragHandle = dragHandleRef.current;

    if (dragHandle) {
      dragHandle.addEventListener("mousedown", handleDragStart);
      window.addEventListener("mousemove", handleDrag);
      window.addEventListener("mouseup", handleDragEnd);

      dragHandle.addEventListener("touchstart", handleDragStart);
      window.addEventListener("touchmove", handleDrag);
      window.addEventListener("touchend", handleDragEnd);
    }

    return () => {
      if (dragHandle) {
        dragHandle.removeEventListener("mousedown", handleDragStart);
        window.removeEventListener("mousemove", handleDrag);
        window.removeEventListener("mouseup", handleDragEnd);

        dragHandle.removeEventListener("touchstart", handleDragStart);
        window.removeEventListener("touchmove", handleDrag);
        window.removeEventListener("touchend", handleDragEnd);
      }
    };
  }, [isDragging, startY, panelHeight]);

  // Dynamic styles that need to be calculated
  const mapContainerStyle = {
    height: `${100 - panelHeight}%`,
    transition: isDragging ? "none" : "height 0.3s ease-out",
  };

  const panelStyle = {
    height: `${panelHeight}%`,
    transition: isDragging ? "none" : "height 0.3s ease-out",
  };

  // 메뉴 아이템 데이터
  const menuItems = [
    {
      id: 1,
      text: "차량 등록 및 설정",
      path: "/vehicle-registration",
      active: true,
    },
    { id: 2, text: "인카페이먼트", path: "#", active: false },
    { id: 3, text: "차량 디지털 키", path: "#", active: false },
    { id: 4, text: "다른 차량 이용하기", path: "#", active: false },
    { id: 5, text: "출발 알림 및 목록", path: "#", active: false },
    { id: 6, text: "연동 서비스", path: "#", active: false },
    { id: 7, text: "앱 설정", path: "#", active: false },
    { id: 8, text: "계정 설정", path: "/my-profile", active: true },
  ];

  // Touch handlers for menu swipe
  const handleMenuTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleMenuTouchMove = (e) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const diff = touchStartX - currentX;

    // Only allow swiping left (negative values)
    if (diff > 0) {
      setMenuTranslate(diff);
    }
  };

  const handleMenuTouchEnd = () => {
    setIsSwiping(false);

    // If swiped more than 100px, close the menu
    if (menuTranslate > 100) {
      toggleMenu();
    }

    // Reset translation
    setMenuTranslate(0);
  };

  return (
    <div className={styles.container}>
      {/* Menu Button */}
      <button
        className={styles.menuButton}
        onClick={toggleMenu}
        aria-label="메뉴 열기"
      >
        <img
          src={menuIcon}
          alt="메뉴 아이콘"
          className={styles.menuIconImage}
        />
      </button>

      {/* Menu Overlay */}
      {menuOpen && (
        <div
          className={`${styles.menuOverlay} ${menuOpen ? styles.active : ""}`}
          onClick={toggleMenu}
        >
          <div
            ref={menuContainerRef}
            className={styles.menuContainer}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleMenuTouchStart}
            onTouchMove={handleMenuTouchMove}
            onTouchEnd={handleMenuTouchEnd}
            style={{
              transform: `translateX(${-menuTranslate}px)`,
              transition: isSwiping ? "none" : "transform 0.3s ease-out",
            }}
          >
            {/* Menu content */}
            <div className={styles.menuHeader}>
              <span className={styles.menuHeaderText}>MY MENU</span>
            </div>
            <ul className={styles.menuList}>
              {menuItems.map((item) => (
                <li key={item.id} className={styles.menuItem}>
                  {item.active ? (
                    <Link to={item.path} className={styles.menuLink}>
                      · {item.text}
                    </Link>
                  ) : (
                    <span className={styles.menuText}>· {item.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div
        ref={mapContainerRef}
        id="map"
        className={styles.mapContainer}
        style={mapContainerStyle}
      />

      {/* Info Panel */}
      <div ref={panelRef} className={styles.panel} style={panelStyle}>
        {/* Handle to drag panel */}
        <div
          ref={dragHandleRef}
          className={`${styles.dragHandle} ${
            isDragging ? styles.dragging : ""
          }`}
        />

        {/* Panel content - header always shows, body only when expanded */}
        <div className={styles.panelContent}>
          {/* 패널 헤더 - 항상 표시 */}
          <div className={styles.panelHeader}>
            <span className={styles.panelHeaderText}>
              {localStorage.name
                ? `${localStorage.name}님, 안녕하세요.`
                : "로그인해 주세요."}
            </span>
          </div>
          {/* 패널 본문 - 차량 등록 X */}
          {hasRegisteredVehicle === 0 && (
            <div className={styles.noVehicleContainer}>
              <img
                src={noneImage}
                alt="등록된 차량 없음"
                className={styles.noVehicleImage}
              />
              <span className={styles.noVehicleText}>
                등록된 차량이 없어요.
              </span>
            </div>
          )}

          {/* 패널 본문 - 차량 등록 O, 운전 중 X */}
          {hasRegisteredVehicle === 1 && !driving && (
            <div className={styles.VehicleContainer}>
              <span className={styles.VehicleText}>
                {connectedVehicle.name}
              </span>
              <img
                src={connectedVehicle.image}
                alt="connectedVehicle image"
                className={styles.VehicleImage}
              />
            </div>
          )}

          {/* 패널 본문 - 차량 등록 O, 운전 중 O */}
          {hasRegisteredVehicle === 1 && driving && (
            <div className={styles.VehicleContainer}>
              <span className={styles.drivingText}>
                애프터 드라이브 서비스를 즐겨 보세요.
              </span>
              {/* 하단 아이콘들 */}
              <div className={styles.drivingIcons}>
                {/* 주차 · 결제 버튼 */}
                <button
                  onClick={() => navigate("/auto-parking")}
                  className={styles.iconButton}
                >
                  <img
                    src={parkingIcon}
                    alt="주차 · 결제"
                    className={styles.iconImage}
                  />
                  <span>주차 · 결제</span>
                </button>

                {/* 인근 배회 버튼 */}
                <button
                  onClick={() => navigate("/auto-roaming")}
                  className={styles.iconButton}
                >
                  <img
                    src={roamingIcon}
                    alt="인근 배회"
                    className={styles.iconImage}
                  />
                  <span>인근 배회</span>
                </button>

                {/* 차량 주유 버튼 */}
                <button className={styles.iconButton}>
                  <img
                    src={refuelIcon}
                    alt="차량 주유"
                    className={styles.iconImage}
                  />
                  <span>차량 주유</span>
                </button>
              </div>
            </div>
          )}

          {/* 테스트 버튼 */}
          <button onClick={toggleVehicleStatus} className={styles.toggleButton}>
            차량 상태 변경 (테스트)
          </button>
        </div>
      </div>
    </div>
  );
};

export default BaseMapComponent;
