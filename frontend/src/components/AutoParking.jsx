import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Assuming you're using React Router
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "../styles/AutoParking.module.css";
import menuIcon from "../assets/images/menu.png";
import backIcon from "../assets/images/back.png";
import checkImage from "../assets/images/check.png";
import clockImage from "../assets/images/clock.png";
import sortIcon from "../assets/images/settings-sliders.png";
import Ioniq9 from "../assets/images/Ioniq9-Personal.png";
import Ioniq5 from "../assets/images/Ioniq5-Shared.png";
import Nexo from "../assets/images/Nexo.png";
import parking_lot_1 from "../assets/images/parking_lot_1.jpg";
import parking_lot_2 from "../assets/images/parking_lot_2.jpg";
// import parking_lot_3 from "../assets/images/parking_lot_3.jpg";
import barOn from "../assets/images/ivi_statusbar.png";
import barUnder from "../assets/images/ivi_gnb.png";
import LocPin from "../assets/images/location.png";
import { useDeviceByAspectRatio } from "../hooks/useDeviceByAspectRatio";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { vehicleslocation, vehiclesStatus } from "../api/vehicles";
import { useSerialPolling } from "../hooks/useSerialPolling";
import {
  parkingDestination,
  parkingChoose,
  vehicleDestination,
} from "../api/parking";
import { registerInitHistory } from "../api/payment";

const AutoParking = () => {
  const mapContainerRef = useRef();
  const menuContainerRef = useRef();
  const mapRef = useRef();
  const panelRef = useRef();
  const dragHandleRef = useRef();
  const [panelHeight, setPanelHeight] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [menuTranslate, setMenuTranslate] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [headerText, setHeaderText] =
    useState("이동할 주차장을 선택해 주세요.");
  const [panelView, setPanelView] = useState("default");

  const navigate = useNavigate();
  const connectedId = localStorage.getItem("connectedVehicleId");

  const carModelRef = useRef();
  const customLayerRef = useRef();
  const vehiclePositionRef = useRef([126.5628, 37.5249]);
  const [vehiclePosition, setVehiclePosition] = useState([126.5628, 37.5249]);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const vehicleVin = localStorage.getItem("vehicleVin");
  const { isTablet } = useDeviceByAspectRatio();

  const [sortType, setSortType] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [longitudeMe, setLongitudeMe] = useState(126.5628);
  const [latitudeMe, setLatitudeMe] = useState(37.5249);
  const [distanceToLot, setDistanceToLot] = useState(0);
  const [distanceToCar, setDistanceToCar] = useState(0);

  // const frame = localStorage.getItem("frame");
  // const zoom = frame === "tablet" ? 19.0 : 19.6;
  // const pitch = frame === "tablet" ? 30 : 60;
  // const defaultLongitude = 126.5628; // 경도 설정
  // const defaultLatitude = 37.5249; // 위도 설정

  // temp
  localStorage.setItem("longitude", vehiclePosition[0]);
  localStorage.setItem("latitude", vehiclePosition[1]);

  // 최소 패널 높이 설정 (%)
  const MIN_PANEL_HEIGHT = 5;

  // useEffect(() => {
  //   const frame = localStorage.getItem("frame");
  //   if (frame === "tablet") {
  //     setPanelHeight(40);
  //   } else {
  //     setPanelHeight(60);
  //   }
  // }, []);

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
  const [hasRegisteredVehicle, setHasRegisteredVehicle] = useState(1);

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

  const [parkingList, setParkingList] = useState([]);

  useEffect(() => {
    const handleParkingDestination = async () => {
      try {
        const response = await parkingDestination({
          vehicleVin: vehicleVin,
          destination: {
            longitude: vehiclePosition[0],
            latitude: vehiclePosition[1],
          },
        });
        // console.log(response); // for debugging

        const updatedList = response.nearestParkingLots.map((lot, index) => ({
          name: lot.parkingLotName,
          address: lot.address,
          latitude: lot.latitude,
          longitude: lot.longitude,
          congestion: lot.congestion,
          baseFee: parseInt(lot.baseFee, 10),
          rateFee: parseInt(lot.rateFee, 10),
          distance: lot.distance,
          image: index === 0 ? parking_lot_1 : parking_lot_2,
        }));

        setParkingList(updatedList);
      } catch (error) {
        console.error(error);
      }
    };

    if (vehicleVin && vehiclePosition) {
      handleParkingDestination();
    }
  }, [vehicleVin, vehiclePosition]);

  const handleParkingChoose = async () => {
    try {
      const response = await parkingChoose({
        vehicleVin: vehicleVin,
        destination: {
          longitude: selectedLot.longitude,
          latitude: selectedLot.latitude,
        },
      });
      console.log(response); // for debugging
    } catch (error) {
      console.error(error);
    }
  };

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

  // temp, ROS 및 BACKEND에서 주차장 정보 가져오기
  // const [parkingList, setParkingList] = useState([
  //   {
  //     name: "A타워 주차장",
  //     distance: 150,
  //     rateFee: 2000,
  //     congestion: "혼잡",
  //     image: parking_lot_1,
  //   },
  //   {
  //     name: "B빌딩 주차장",
  //     distance: 300,
  //     rateFee: 1800,
  //     congestion: "여유",
  //     image: parking_lot_2,
  //   },
  // ]);

  useEffect(() => {
    switch (panelView) {
      case "default":
        setHeaderText("이동할 주차장을 선택해 주세요.");
        break;
      case "selected":
        setHeaderText(`${localStorage.name}님, 안전 운전 하세요.`);
        break;
      case "parked":
        setHeaderText("필요 시에 차량 호출이 가능합니다.");
        break;
      case "wait":
        setHeaderText("선택 지점으로 이동하고 있어요.");
        break;
      default:
        setHeaderText("이동할 주차장을 선택해 주세요.");
    }
  }, [panelView]);

  useEffect(() => {
    if (sortType === "distance") {
      setParkingList((prev) =>
        [...prev].sort((a, b) => a.distance - b.distance)
      );
    } else if (sortType === "rateFee") {
      setParkingList((prev) => [...prev].sort((a, b) => a.rateFee - b.rateFee));
    }
  }, [sortType]);

  // 메뉴 토글 함수
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  useSerialPolling(async () => {
      try {
        const response = await vehicleslocation(vehicleVin);
        const { longitude, latitude } = response.gps;
        localStorage.setItem("latitude", latitude);
        localStorage.setItem("longitude", longitude);
        setVehiclePosition([longitude, latitude]);
        vehiclePositionRef.current = [longitude, latitude];
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
    }, 1000, Boolean(vehicleVin));

  useSerialPolling(async () => {
      try {
        const response = await vehiclesStatus({
          vehicleVin: vehicleVin,
          gps: {
            longitude: longitudeMe,
            latitude: latitudeMe,
          },
          carGps: {
            longitude: vehiclePosition[0],
            latitude: vehiclePosition[1],
          },
        });
        // console.log(response); // for debugging
        localStorage.setItem("engineStatus", response.engineStatus);
        localStorage.setItem("distanceToLot", response.distanceToLot);
        localStorage.setItem("distanceToCar", response.distanceToCar);
        localStorage.setItem("speedKmh", response.speedKmh);
        localStorage.setItem("parked", response.parked);
        setDistanceToLot(response.distanceToLot);
        setDistanceToCar(response.distanceToCar);
      } catch (error) {
        console.error(error);
      }
    }, 1000, Boolean(vehicleVin));

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
      panelRef.current.classList.add(styles.minimized);
    } else if (panelHeight > 70) {
      setPanelHeight(80);
    } else {
      setPanelHeight(60);
      panelRef.current.classList.remove(styles.minimized);
    }

    if (mapRef.current) {
      mapRef.current.resize();
    }
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

  const [showMapModal, setShowMapModal] = useState(false);
  const [customPickupPoint, setCustomPickupPoint] = useState(null);
  const mapModalRef = useRef(null);
  const [showWaitModal, setShowWaitModal] = useState(false);

  useEffect(() => {
    if (!showMapModal || !mapModalRef.current) return;

    const modalMap = new mapboxgl.Map({
      container: mapModalRef.current,
      center: vehiclePosition,
      style: "mapbox://styles/sharmx1am/cm8ibm75x017501r094cmctgp",
      zoom: 19,
      pitch: 30,
      bearing: 28,
      // antialias: true,
    });

    const el = document.createElement("div");
    el.style.backgroundImage = `url(${LocPin})`;
    el.style.width = "40px";
    el.style.height = "40px";
    el.style.backgroundSize = "cover";
    el.style.borderRadius = "50%";

    const marker = new mapboxgl.Marker({ element: el });

    modalMap.on("click", (e) => {
      const lngLat = [e.lngLat.lng, e.lngLat.lat];
      setCustomPickupPoint(lngLat);
      marker.setLngLat(lngLat).addTo(modalMap);
    });

    return () => {
      modalMap.remove();
    };
  }, [showMapModal]);

  const parkingLotName = localStorage.getItem("selectedParkingLot");
  const baseFee = localStorage.getItem("baseFee");
  const rateFee = localStorage.getItem("rateFee");
  const longitude_lot = localStorage.getItem("longitude_lot");
  const latitude_lot = localStorage.getItem("latitude_lot");

  let called = false;

  const handleRegisterInitHistory = async () => {
    if (called) return;
    called = true;

    try {
      const response = await registerInitHistory({
        parkingLotName,
        baseFee,
        rateFee,
      });
      console.log(response); // for debugging
    } catch (error) {
      console.error(error);
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
        style={{ height: `${100 - panelHeight}%` }}
      >
        {/* 지도 위에 버튼 렌더링 */}
        {panelView === "selected" ||
          (panelView === "parked" && (
            <div className={styles.readyButtons}>
              <button
                onClick={() => setShowMapModal(true)}
                className={styles.changeButton}
              >
                승차 지점 변경
              </button>
            </div>
          ))}
      </div>
      {/* Info Panel */}
      <div
        ref={panelRef}
        className={styles.panel}
        style={{ height: `${panelHeight}%` }}
      >
        {/* Handle to drag panel */}
        <div
          ref={dragHandleRef}
          className={`${styles.dragHandle} ${
            isDragging ? styles.dragging : ""
          }`}
        />
        <div className={styles.panelHeader}>
          <span className={styles.panelHeaderText}>{headerText}</span>
        </div>
        <div className={styles.panelBody}>
          {panelView === "default" && (
            <>
              <div className={styles.settingContainer}>
                <div className={styles.sortButtons}>
                  <img
                    src={backIcon}
                    alt="뒤로가기"
                    className={styles.backIconImage}
                    onClick={() => navigate(-1)}
                  />
                  <button
                    onClick={() => setSortType("distance")}
                    className={`${styles.sortButton} ${
                      sortType === "distance" || !sortType
                        ? styles.activeSortButton
                        : ""
                    }`}
                  >
                    가까운
                  </button>
                  <button
                    onClick={() => setSortType("rateFee")}
                    className={`${styles.sortButton} ${
                      sortType === "rateFee" ? styles.activeSortButton : ""
                    }`}
                  >
                    낮은 금액
                  </button>
                  <img
                    src={sortIcon}
                    alt="정렬 아이콘"
                    className={styles.sortIconImage}
                    onClick={() =>
                      setSortType((prev) =>
                        prev === "distance" ? "rateFee" : "distance"
                      )
                    }
                  />
                </div>

                <div className={styles.cardList}>
                  {parkingList.map((lot, idx) => (
                    <div key={idx} className={styles.parkingCard}>
                      <div
                        className={styles.parkingCardContent}
                        onClick={() => {
                          setSelectedLot(lot); // 선택한 주차장 정보 설정
                          setShowConfirmModal(true); // 확인 모달 표시
                        }}
                      >
                        <div className={styles.imageSection}>
                          <img
                            src={lot.image}
                            alt={`${lot.name} 이미지`}
                            className={styles.parkingImage}
                          />
                        </div>

                        <div className={styles.infoSection}>
                          <span className={styles.infoName}>
                            <h3>{lot.name}</h3>
                            <span
                              className={`${styles.infoValue} ${
                                lot.congestion === "혼잡"
                                  ? styles.textHighlightBad
                                  : lot.congestion === "여유"
                                  ? styles.textHighlightGood
                                  : styles.infoValue
                              }`}
                            >
                              {lot.congestion}
                            </span>
                          </span>
                          <div className={styles.infoName}>
                            <span className={styles.info}>이동 거리</span>
                            <span className={styles.infoValue}>
                              {lot.distance}
                            </span>
                          </div>
                          <div className={styles.infoName}>
                            <span className={styles.info}>기본 요금</span>
                            <span className={styles.infoValue}>
                              {lot.rateFee.toLocaleString()}원/30분
                            </span>
                          </div>
                          <div className={styles.infoName}>
                            <span className={styles.info}>추가 요금</span>
                            <span className={styles.infoValue}>
                              {lot.rateFee.toLocaleString()}원/30분
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {panelView === "selected" && selectedLot && (
            <>
              <div className={styles.settingContainer}>
                <h2 className={styles.drivingText}>
                  하차 시 자동 주차가 예정되어 있습니다.
                </h2>
                <div className={styles.cardList}>
                  {/* 선택된 주차장 정보 카드 */}
                  <div key={selectedLot.name} className={styles.pickingCard}>
                    <div className={styles.parkingCardContent}>
                      <div className={styles.imageSection}>
                        <img
                          src={selectedLot.image}
                          alt={`${selectedLot.name} 이미지`}
                          className={styles.parkingImage}
                        />
                      </div>
                      <div className={styles.infoSection}>
                        <span className={styles.infoName}>
                          <h3>{selectedLot.name}</h3>
                          <span
                            className={`${styles.infoValue} ${
                              selectedLot.congestion === "혼잡"
                                ? styles.textHighlightBad
                                : selectedLot.congestion === "여유"
                                ? styles.textHighlightGood
                                : styles.infoValue
                            }`}
                          >
                            {selectedLot.congestion}
                          </span>
                        </span>
                        <div className={styles.infoName}>
                          <span className={styles.info}>이동 거리</span>
                          <span className={styles.infoValue}>
                            {selectedLot.distance}
                          </span>
                        </div>
                        <div className={styles.infoName}>
                          <span className={styles.info}>기본 요금</span>
                          <span className={styles.infoValue}>
                            {selectedLot.rateFee.toLocaleString()}원/30분
                          </span>
                        </div>
                        <div className={styles.infoName}>
                          <span className={styles.info}>추가 요금</span>
                          <span className={styles.infoValue}>
                            {selectedLot.rateFee.toLocaleString()}원/30분
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPanelView("parked");
                    // handleRegisterInitHistory();
                    handleParkingChoose();
                    localStorage.setItem("longitudeMe", vehiclePosition[0]);
                    localStorage.setItem("latitudeMe", vehiclePosition[1]);
                    setLongitudeMe(vehiclePosition[0]);
                    setLatitudeMe(vehiclePosition[1]);
                  }}
                  className={styles.moveButton}
                >
                  하차 완료
                </button>
                <button
                  onClick={() => {
                    setPanelView("default");
                    setSelectedLot(null);
                  }}
                  className={styles.backButton}
                >
                  다른 주차장 선택하기
                </button>
              </div>
            </>
          )}

          {panelView === "parked" && (
            <>
              <div className={styles.settingContainer}>
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
                <div className={styles.callSection}>
                  <div className={styles.callDetail}>
                    <span>주차 지점</span>
                    <span className={styles.infoValue}>
                      {localStorage.getItem("selectedParkingLot")}{" "}
                      {/* 선택한 주차장 이름으로 변경 */}
                    </span>
                  </div>
                  <div className={styles.callDetail}>
                    <span>현재 나와의 거리</span>
                    <span className={styles.infoValue}>
                      {distanceToCar.toFixed(0)}m
                    </span>
                  </div>
                  <div className={styles.callDetail}>
                    <span>복귀 소요 시간</span>
                    <span className={styles.infoValue}>
                      <span className={styles.infoValue}>
                        {(parseFloat(distanceToCar) / 40 + 1).toFixed(0)}분
                      </span>
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <button
                    onClick={() => {
                      navigate("/payment");
                    }}
                    className={styles.callButton}
                  >
                    차량 호출
                  </button>
                </div>
              </div>
            </>
          )}

          {panelView === "wait" && (
            <>
              <div className={styles.VehicleContainer}>
                <span className={styles.VehicleText}>
                  {connectedVehicle.name}
                </span>
                <img
                  src={connectedVehicle.image}
                  alt="connectedVehicle image"
                  className={styles.VehicleImage}
                />
                <div className={styles.callSection}>
                  <div className={styles.callDetail}>
                    <span>현재 나와의 거리</span>
                    <span className={styles.infoValue}>
                      {distanceToCar.toFixed(0)}m
                    </span>
                  </div>
                  <div className={styles.callDetail}>
                    <span>복귀 예정 시간</span>
                    <span className={styles.infoValue}>
                      {(parseFloat(distanceToCar) / 40 + 1).toFixed(0)}분
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    navigate("/home");
                  }}
                  className={styles.moveButton}
                >
                  탑승 완료
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {showConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <img
              src={selectedLot?.image || "/images/placeholder.png"}
              alt={`${selectedLot?.name} 이미지`}
              className={styles.modalParkingImage}
            />
            <h3>{selectedLot?.name}</h3>

            {selectedLot?.congestion === "혼잡" && (
              <>
                <p className={styles.textWarning}>
                  <span className={styles.textHighlightBad}>혼잡</span>
                  <span> 주차장을 선택하시겠습니까?</span>
                </p>
                <span className={styles.textDetail}>
                  <p>*주차장이 만석일 경우,</p>
                  <span>주차장 내부를 자동으로 </span>
                  <span className={styles.textHighlightLoop}>배회</span>
                  <span>합니다.</span>
                </span>
              </>
            )}

            {selectedLot?.congestion === "여유" && (
              <>
                <p className={styles.textWarning}>
                  <span className={styles.textHighlightGood}>여유</span>
                  <span> 주차장을 선택하시겠습니까?</span>
                </p>
              </>
            )}

            <div className={styles.modalButtons}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setShowSuccessModal(true);
                  setPanelView("selected"); // 상태 전환 추가
                  localStorage.setItem("selectedParkingLot", selectedLot.name);
                  localStorage.setItem("baseFee", selectedLot.baseFee);
                  localStorage.setItem("rateFee", selectedLot.rateFee);
                  localStorage.setItem("longitude_lot", selectedLot.longitude);
                  localStorage.setItem("latitude_lot", selectedLot.latitude);
                  localStorage.setItem("selectedMethod", "ParkingLot");
                }}
              >
                선택
              </button>

              <button onClick={() => setShowConfirmModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
      {/* 성공 모달 */}
      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <img className={styles.imageSucceed} src={checkImage} alt="Check" />
            <h2>하차 시 자동 주차가 실행됩니다.</h2>
            <button
              className={styles.modalCloseButton}
              onClick={() => {
                setShowSuccessModal(false);
                setIsConfirmed(true);
                // setPanelHeight(60);
                setHeaderText(`${localStorage.name}님, 안전 운전 하세요.`); // 헤더 텍스트 업데이트
                // localStorage.setItem("selectedParkingLot", selectedLot.name);
                // localStorage.setItem("baseFee", selectedLot.baseFee);
                // localStorage.setItem("rateFee", selectedLot.rateFee);
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
      {/* 지도 모달 */}
      {showMapModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.mapModal}>
            <div ref={mapModalRef} className={styles.mapModalContainer} />

            <div className={styles.modalButtons}>
              <button
                onClick={() => {
                  if (customPickupPoint) {
                    console.log("선택된 좌표:", customPickupPoint);
                    localStorage.setItem("longitudeMe", customPickupPoint[0]);
                    localStorage.setItem("latitudeMe", customPickupPoint[1]);
                    localStorage.setItem("selectedMethod", "MyLocation");

                    // 여기에 서버 전송 or 상태 저장 코드 추가 가능
                    setShowMapModal(false);
                    setShowWaitModal(true);
                    // navigate("/payment");
                    // setVehiclePosition([lng, lat]); ← 필요 시 반영
                  } else {
                    alert("지도에서 위치를 선택하세요.");
                  }
                }}
              >
                선택
              </button>
              <button onClick={() => setShowMapModal(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {showWaitModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <img className={styles.imageSucceed} src={clockImage} alt="Check" />
            <h2>선택 지점에 자동으로 정차합니다.</h2>
            <button
              className={styles.modalCloseButton}
              onClick={() => {
                setShowWaitModal(false);
                setIsConfirmed(true);
                setPanelView("wait");
                setHeaderText(`선택 지점으로 이동하고 있어요.`); // 헤더 텍스트 업데이트
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
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
};

export default AutoParking;
