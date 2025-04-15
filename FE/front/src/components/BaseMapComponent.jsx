import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Assuming you're using React Router
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "../styles/BaseMap.module.css";
import noneImage from "../assets/images/none.png"; // Import the image
import parkingIcon from "../assets/images/parking-area.png"; // 주차 아이콘 이미지
import roamingIcon from "../assets/images/loop.png"; // 배회 아이콘 이미지
import refuelIcon from "../assets/images/fuel.png"; // 주유 아이콘 이미지
import menuIcon from "../assets/images/menu.png";
import Ioniq9 from "../assets/images/Ioniq9-Personal.png";
import Ioniq5 from "../assets/images/Ioniq5-Shared.png";
import Nexo from "../assets/images/Nexo.png";
import barOn from "../assets/images/ivi_statusbar.png";
import barUnder from "../assets/images/ivi_gnb.png";
import { useDeviceByAspectRatio } from "../App";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { vehicleslocation, vehiclesStatus } from "../api/vehicles";

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
  // parking 상태 정의
  const [parking, setParking] = useState(true); // 초기값은 false
  const { isTablet } = useDeviceByAspectRatio();

  const navigate = useNavigate();
  const connectedId = localStorage.getItem("connectedVehicleId");

  const carModelRef = useRef();
  const customLayerRef = useRef();
  const vehiclePositionRef = useRef([126.5628, 37.5249]);
  const [vehiclePosition, setVehiclePosition] = useState([126.5628, 37.5249]);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const vehicleVin = localStorage.getItem("vehicleVin");
  const [longitudeMe, setLongitudeMe] = useState(126.5628);
  const [latitudeMe, setLatitudeMe] = useState(37.5249);

  // temp
  localStorage.setItem("longitude", vehiclePosition[0]);
  localStorage.setItem("latitude", vehiclePosition[1]);

  // 최소 패널 높이 설정 (%)
  const MIN_PANEL_HEIGHT = 5;

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      navigate("/Login");
    }
  }, []);

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

  // temp
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

  const connectedVehicle = initialVehicles.find((v) => v.connected);
  useEffect(() => {
    if (["1", "2", "3"].includes(connectedId)) {
      setHasRegisteredVehicle(1);
    }
  }, [connectedId]);

  // 차량 등록 여부를 나타내는 임의 변수 (0: 없음, 1: 있음)
  const [hasRegisteredVehicle, setHasRegisteredVehicle] = useState(0);

  const mainParkingCoordinates = [
    [126.5630591, 37.5250445],
    [126.5628456, 37.5247062],
    [126.5629846, 37.524661],
    [126.5631936, 37.5250037],
  ];
  const subParkingCoordinates = [
    [126.5618804, 37.5241713],
    [126.5615959, 37.5240847],
    [126.5618135, 37.5238753],
    [126.5620624, 37.5240061],
  ];

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
    const interval = setInterval(async () => {
      try {
        const response = await vehicleslocation(vehicleVin);
        const { longitude, latitude } = response.gps;
        localStorage.setItem("latitude", latitude);
        localStorage.setItem("longitude", longitude);
        setVehiclePosition([longitude, latitude]);
        vehiclePositionRef.current = [vehiclePosition[0], vehiclePosition[1]];
        // console.log(vehiclePosition);
        if (mapRef.current && modelLoaded) {
          mapRef.current.easeTo({
            center: vehiclePositionRef.current,
            duration: 1000,
            pitch: 60,
            bearing: mapRef.current.getBearing(),
          });
          mapRef.current.triggerRepaint();
        }
      } catch (error) {
        console.error("차량 위치 요청 실패:", error);
      }

      const longitude_tmp = localStorage.getItem("longitude");
      const latitude_tmp = localStorage.getItem("latitude");
      const longitudeMe_tmp = localStorage.getItem("longitude");
      const latitudeMe_tmp = localStorage.getItem("latitude");
      try {
        const response = await vehiclesStatus({
          vehicleVin: vehicleVin,
          gps: {
            longitude: longitudeMe_tmp,
            latitude: latitudeMe_tmp,
          },
          carGps: {
            longitude: longitude_tmp,
            latitude: latitude_tmp,
          },
        });
        // console.log(response); // for debugging
        localStorage.setItem("engineStatus", response.engineStatus);
        localStorage.setItem("distanceToLot", response.distanceToLot);
        localStorage.setItem("distanceToCar", response.distanceToCar);
        localStorage.setItem("speedKmh", response.speedKmh);
        localStorage.setItem("parked", response.parked);
        setParking(response.parked)
      } catch (error) {
        console.error(error);
      }
    }, 1000); // 0.2 sec
    return () => clearInterval(interval);
  }, [vehicleVin, modelLoaded, parking]);

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

  const getModelTransform = (position) => {
    const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
      position,
      0
    );
    return {
      translateX: modelAsMercatorCoordinate.x,
      translateY: modelAsMercatorCoordinate.y,
      translateZ: modelAsMercatorCoordinate.z,
      rotateX: Math.PI / 2,
      rotateY: Math.PI - Math.PI / 6.5,
      rotateZ: 0,
      scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() * 1,
    };
  };

  useEffect(() => {
    if (mapRef.current) return;
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    const [lng, lat] = vehiclePosition;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/sharmx1am/cm8ibm75x017501r094cmctgp",
      center: [lng, lat],
      zoom: 20,
      pitch: 60,
      bearing: 28,
      antialias: true,
    });
  }, []);

  useEffect(() => {
    const resizeMap = () => {
      if (mapRef.current) mapRef.current.resize();
    };
    const observer = new ResizeObserver(resizeMap);
    if (mapContainerRef.current) observer.observe(mapContainerRef.current);
    return () => {
      if (mapContainerRef.current) observer.unobserve(mapContainerRef.current);
    };
  }, []);

  const add3DBuildings = (map) => {
    map.addLayer({
      id: "main-parking-building",
      type: "fill-extrusion",
      source: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {
            height: 15,
            base: 0,
            color: "#82F1E0",
          },
          geometry: {
            type: "Polygon",
            coordinates: [mainParkingCoordinates],
          },
        },
      },
      paint: {
        "fill-extrusion-color": ["get", "color"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-opacity": 0.8,
      },
    });

    map.addLayer({
      id: "sub-parking-building",
      type: "fill-extrusion",
      source: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {
            height: 20,
            base: 0,
            color: "#FDAE00",
          },
          geometry: {
            type: "Polygon",
            coordinates: [subParkingCoordinates],
          },
        },
      },
      paint: {
        "fill-extrusion-color": ["get", "color"],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-opacity": 0.8,
      },
    });
  };

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.on("style.load", () => {
      const map = mapRef.current;
      add3DBuildings(map);

      if (map.getLayer("3d-model")) return;
      customLayerRef.current = {
        id: "3d-model",
        type: "custom",
        renderingMode: "3d",
        onAdd: function (map, gl) {
          this.camera = new THREE.Camera();
          this.scene = new THREE.Scene();

          const light1 = new THREE.DirectionalLight(0xffffff, 1);
          light1.position.set(0, 1, 1);
          this.scene.add(light1);

          const light2 = new THREE.DirectionalLight(0xffffff, 1);
          this.scene.add(light2);

          setModelLoading(true);
          const loader = new GLTFLoader();
          loader.load(
            // "/models/n_vision_74.glb",
            "/models/ioniq5.glb",
            (gltf) => {
              const model = gltf.scene;

              this.scene.add(model); // 차량 현재 위치 조회
              carModelRef.current = model;
              setModelLoaded(true);
              setModelLoading(false);
              console.log("3D 모델 로드 완료");
            },
            (xhr) => {
              console.log((xhr.loaded / xhr.total) * 100 + "% 로드됨");
            },
            (err) => {
              console.error("모델 로드 오류:", err);
              setModelLoading(false);
            }
          );

          this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
          });
          this.renderer.autoClear = false;
          this.renderer.outputColorSpace = THREE.SRGBColorSpace;
          this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
          this.renderer.toneMappingExposure = 1;
        },
        render: function (gl, matrix) {
          if (!this.camera || !this.scene || !this.renderer) return;
          const currentTransform = getModelTransform(
            vehiclePositionRef.current
          );

          const rotX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            currentTransform.rotateX
          );
          const rotY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            currentTransform.rotateY
          );
          const rotZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            currentTransform.rotateZ
          );

          const m = new THREE.Matrix4().fromArray(matrix);
          const l = new THREE.Matrix4()
            .makeTranslation(
              currentTransform.translateX,
              currentTransform.translateY,
              currentTransform.translateZ
            )
            .scale(
              new THREE.Vector3(
                currentTransform.scale,
                -currentTransform.scale,
                currentTransform.scale
              )
            )
            .multiply(rotX)
            .multiply(rotY)
            .multiply(rotZ);

          this.camera.projectionMatrix = m.multiply(l);
          this.renderer.resetState();
          this.renderer.render(this.scene, this.camera);
        },
      };
      map.addLayer(customLayerRef.current);
    });
  }, []);

  useEffect(() => {
    vehiclePositionRef.current = vehiclePosition;
    if (!mapRef.current || !modelLoaded) return;
    mapRef.current.easeTo({
      center: vehiclePosition,
      duration: 1000,
      bearing: mapRef.current.getBearing(),
      pitch: 60,
    });
    mapRef.current.triggerRepaint();
  }, [vehiclePosition, modelLoaded]);

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

  const handleDragStart = (e) => {
    setIsDragging(true);
    setStartY(e.type.includes("touch") ? e.touches[0].clientY : e.clientY);
  };

  const handleDrag = (e) => {
    if (!isDragging) return;
    const clientY = e.type.includes("touch") ? e.touches[0].clientY : e.clientY;
    const deltaY = startY - clientY;
    const deltaPercent = (deltaY / window.innerHeight) * 100;
    const newHeight = Math.min(
      Math.max(panelHeight + deltaPercent, MIN_PANEL_HEIGHT),
      90
    );
    setPanelHeight(newHeight);
    setStartY(clientY);
    if (mapRef.current) mapRef.current.resize();
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setPanelHeight(
      panelHeight < 25 ? MIN_PANEL_HEIGHT : panelHeight > 70 ? 80 : 40
    );
    if (mapRef.current) mapRef.current.resize();
  };

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
    <div className={`${styles.container} ${isTablet ? styles.tabletMode : ""}`}>
      <div className={styles.contentWrapper}>

        {/* 상단 바 */}
        {isTablet && (
          <div className={styles.tabletTopBar}>
            <img src={barOn} alt="Status Bar" className={styles.topBarImage} />
          </div>
        )}

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

        {/* <div
          ref={mapContainerRef}
          id="map"
          className={styles.mapContainer}
          style={isTablet ? {} : { height: `${100 - panelHeight}%` }}
        /> */}

        <div className={styles.boxContainer}>
          {/* 지도 */}
          <div
            ref={mapContainerRef}
            id="map"
            className={styles.mapContainer}
            style={isTablet ? {} : { height: `${100 - panelHeight}%` }}
          />

          {/* 상단 좌측 텍스트 레이아웃 */}
          <div className={styles.topLeftText}>
            {/* 세로 방향 텍스트 (column) */}
            <div className={styles.columnText}>
              <span className={styles.meterText}>
                {localStorage.getItem("speedKmh") || 0}
              </span>
              <span>km/h</span>
            </div>

            {/* 가로 방향 텍스트 (row) */}
            <div className={styles.rowText}>
              <span className={parking ? styles.highlight : ""}>P</span>
              <span>R</span>
              <span>N</span>
              <span className={!parking ? styles.highlight : ""}>D</span>
            </div>
          </div>
        </div>


        {/* Info Panel */}
        <div
          ref={panelRef}
          className={styles.panel}
          style={isTablet ? {} : { height: `${panelHeight}%` }}
        >
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
              <div className={styles.settingContainer}>
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
              <div className={styles.settingContainer}>
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
              <div className={styles.settingContainer}>
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
              차량 상태 변경
            </button>
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
    </div>
  );
};

export default BaseMapComponent;
