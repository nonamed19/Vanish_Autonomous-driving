import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Assuming you're using React Router
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "../styles/AutoRoaming.module.css";
import menuIcon from "../assets/images/menu.png";
import backIcon from "../assets/images/back.png";
import checkImage from "../assets/images/check.png";
import clockImage from "../assets/images/clock.png";
import timeImage from "../assets/images/time.png";
import Ioniq9 from "../assets/images/Ioniq9-Personal.png";
import Ioniq5 from "../assets/images/Ioniq5-Shared.png";
import Nexo from "../assets/images/Nexo.png";
import parking_lot_1 from "../assets/images/parking_lot_1.jpg";
import parking_lot_2 from "../assets/images/parking_lot_2.jpg";
// import parking_lot_3 from "../assets/images/parking_lot_3.jpg";
import barOn from "../assets/images/ivi_statusbar.png";
import barUnder from "../assets/images/ivi_gnb.png";
import LocPin from "../assets/images/location.png";
import { useDeviceByAspectRatio } from "../App";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { vehicleslocation, vehiclesStatus } from "../api/vehicles";
import {
  parkingDestination,
  vehicleDestination,
  vehicleRoam,
  roamStop,
} from "../api/parking";

const AutoRoaming = () => {
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
  const [headerText, setHeaderText] = useState("Setting View");
  const [panelView, setPanelView] = useState("setting");
  const [driving, setDriving] = useState(false);
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
  const [roamingTime, setRoamingTime] = useState(0);
  const [longitudeLot, setLongitudeLot] = useState(126.5628);
  const [latitudeLot, setLatitudeLot] = useState(37.5249);
  const [longitudeMe, setLongitudeMe] = useState(126.5628);
  const [latitudeMe, setLatitudeMe] = useState(37.5249);
  const [distanceToLot, setDistanceToLot] = useState(0);
  const [distanceToCar, setDistanceToCar] = useState(0);

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
  const [hasRegisteredVehicle, setHasRegisteredVehicle] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

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

  const handleVehicleDestinationMe = async () => {
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

  const handleVehicleDestinationLot = async () => {
    try {
      const response = await vehicleDestination({
        vehicleVin: vehicleVin,
        currentLocation: {
          longitude: longitude_lot,
          latitude: latitudePickup,
        },
      });
      console.log(response); // for debugging
    } catch (error) {
      console.error(error);
    }
  };

  const handleVehicleRoam = async () => {
    try {
      const response = await vehicleRoam({
        vehicleVin: vehicleVin,
        currentLocation: {
          latitude: latitudeMe,
          longitude: longitudeMe,
        },
        roamDuration: 300,
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

  // 메뉴 토글 함수
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    switch (panelView) {
      case "setting":
        setHeaderText("하차 지점을 5분 간격으로 배회합니다.");
        break;
      case "ready":
        setHeaderText(`하차 후 자율 배회가 예정되어 있습니다.`);
        break;
      case "roaming":
        setHeaderText("5분 뒤에 돌아올게요.");
        break;
      case "end":
        setHeaderText("승차 지점에서 탑승을 기다리고 있어요.");
        break;
      case "wait":
        setHeaderText("선택 지점으로 이동하고 있어요.");
        break;
      default:
        setHeaderText("하차 지점을 5분 간격을 배회합니다.");
    }
  }, [panelView]);

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
    }, 500); // 0.5 sec
    return () => clearInterval(interval);
  }, [vehicleVin, modelLoaded]);

  useEffect(() => {
    const interval = setInterval(async () => {
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
    }, 500); // 0.2 sec
    return () => clearInterval(interval);
  }, [vehicleVin, longitudeMe, latitudeMe, vehiclePosition]);

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

    // const marker = new mapboxgl.Marker();

    modalMap.on("click", (e) => {
      const lngLat = [e.lngLat.lng, e.lngLat.lat];
      setCustomPickupPoint(lngLat);
      marker.setLngLat(lngLat).addTo(modalMap);
    });

    return () => {
      modalMap.remove();
    };
  }, [showMapModal]);

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
        {panelView === "ready" ||
          (panelView === "roaming" && (
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
          {panelView === "setting" && (
            <>
              <div className={styles.settingContainer}>
                <img
                  src={backIcon}
                  alt="뒤로가기"
                  className={styles.backIconImage}
                  onClick={() => navigate(-1)}
                />
                <img
                  className={styles.timeIconImage}
                  src={timeImage}
                  alt="time"
                />
                <h2>예상 탑승 시간을 선택해 주세요.</h2>
                <div className={styles.warningMessage}>
                  <span>*추후 시간 조정 및</span>
                  <span className={styles.textHighlightLoop}>주차</span>
                  <span>전환이 가능합니다.</span>
                </div>
                <div className={styles.sortButtons}>
                  <button
                    onClick={() => {
                      setShowSuccessModal(true);
                      setPanelView("ready");
                      setRoamingTime(5);
                    }}
                    className={styles.moveButton}
                  >
                    <span className={styles.timeText}>5</span>
                    <span>min.</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSuccessModal(true);
                      setPanelView("ready");
                      setRoamingTime(10);
                    }}
                    className={styles.moveButton}
                  >
                    <span className={styles.timeText}>10</span>
                    <span>min.</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowSuccessModal(true);
                      setPanelView("ready");
                      setRoamingTime(15);
                    }}
                    className={styles.moveButton}
                  >
                    <span className={styles.timeText}>15</span>
                    <span>min.</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    navigate("/auto-parking");
                  }}
                  className={styles.backButton}
                >
                  자동 주차 직접 선택
                </button>
              </div>
            </>
          )}

          {panelView === "ready" && (
            <>
              <div className={styles.readyContainer}>
                <img
                  src={backIcon}
                  alt="뒤로가기"
                  className={styles.backIconImage}
                  onClick={() => navigate(-1)}
                />
                <div className={styles.warningMessage}>
                  <span>
                    탑승 <span className={styles.textHighlightBad}>지연 </span>
                    시 다음으로 이동합니다.
                  </span>
                </div>
                <div className={styles.cardList}>
                  <h3>{parkingList[0].name}</h3>
                  <div className={styles.parkingCard}>
                    <div className={styles.parkingCardContent}>
                      <div className={styles.infoSection}>
                        <div className={styles.infoDetail}>
                          <span>이동 거리</span>
                          <span className={styles.infoValue}>
                            {parkingList[0].distance}
                          </span>
                        </div>
                        <div className={styles.infoDetail}>
                          <span>기본 요금</span>
                          <span className={styles.infoValue}>
                            {parkingList[0].rateFee}원/30분
                          </span>
                        </div>
                        <div className={styles.infoDetail}>
                          <span>추가 요금</span>
                          <span className={styles.infoValue}>
                            {parkingList[0].rateFee}원/30분
                          </span>
                        </div>
                        <div className={styles.infoDetail}>
                          <span>혼잡도</span>
                          <span
                            className={
                              parkingList[0].congestion === "혼잡"
                                ? styles.textHighlightBad
                                : styles.textHighlightGood
                            }
                          >
                            {parkingList[0].congestion}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* ▼ 추후 주석 처리할 트리거 버튼 */}
                <button
                  onClick={() => {
                    setPanelView("roaming");
                    setHeaderText("15분 뒤에 돌아올게요.");
                    localStorage.setItem("longitudeMe", vehiclePosition[0]);
                    localStorage.setItem("latitudeMe", vehiclePosition[1]);
                    setLongitudeMe(vehiclePosition[0]);
                    setLatitudeMe(vehiclePosition[1]);
                    handleVehicleRoam();
                  }}
                  className={styles.moveButton}
                >
                  차량 하차
                </button>
                <button
                  onClick={() => {
                    navigate("/auto-parking");
                  }}
                  className={styles.backButton}
                >
                  직접 주차 전환
                </button>
              </div>
            </>
          )}

          {panelView === "roaming" && (
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
                    {distanceToCar.toFixed(0)}m
                  </div>
                  <div className={styles.callDetail}>
                    <span>복귀 예정 시간</span>
                    {(parseFloat(distanceToCar) / 40 + 1).toFixed(0)}분
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowStopModal(true);
                    roamStop(vehicleVin);
                  }}
                  className={styles.moveButton}
                >
                  배회 종료
                </button>
              </div>
              <button
                onClick={() => {
                  navigate("/auto-parking");
                }}
                className={styles.backButton}
              >
                주차 전환
              </button>
              {/* <button
                onClick={() => {
                  navigate("/home")
                }}
                className={styles.triggerButton}
              >
                탑승 완료
              </button> */}
            </>
          )}

          {panelView === "end" && (
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

      {/* 성공 모달 */}
      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <img className={styles.imageSucceed} src={checkImage} alt="Check" />
            <h2>하차 시 자율 배회가 실행됩니다.</h2>
            <button
              className={styles.modalCloseButton}
              onClick={() => {
                setShowSuccessModal(false);
                setIsConfirmed(true);
                setPanelHeight(60);
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {showStopModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <img className={styles.imageSucceed} src={clockImage} alt="Check" />
            <h2>승차 지점에 자동으로 정차합니다.</h2>
            <button
              className={styles.modalCloseButton}
              onClick={() => {
                setShowStopModal(false);
                setIsConfirmed(true);
                setPanelView("end");
                setHeaderText(`승차 지점에서 탑승을 기다리고 있어요.`); // 헤더 텍스트 업데이트
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
                    setLongitudeMe(customPickupPoint[0]);
                    setLatitudeMe(customPickupPoint[1]);
                    localStorage.setItem("selectedMethod", "MyLocation");

                    // 여기에 서버 전송 or 상태 저장 코드 추가 가능
                    setShowMapModal(false);
                    setPanelView("roaming");
                    // setVehiclePosition([lng, lat]); ← 필요 시 반영
                    handleVehicleDestinationMe();
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

export default AutoRoaming;
