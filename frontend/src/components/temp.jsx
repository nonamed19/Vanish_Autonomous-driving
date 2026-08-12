import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { THREE } from "../utils/three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MapComponent = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();
  const panelRef = useRef();
  const dragHandleRef = useRef();
  const [panelHeight, setPanelHeight] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  // 차량 위치 상태
  const [vehiclePosition, setVehiclePosition] = useState([126.5628, 37.5249]);
  const carModelRef = useRef(null);
  const customLayerRef = useRef(null);

  // 경로 및 목적지 상태
  const [destination, setDestination] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);

  // 모델 로드 상태 추가
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  // 최소 패널 높이 설정 (%)
  const MIN_PANEL_HEIGHT = 15;

  // modelTransform 상태 정의
  const [modelTransform, setModelTransform] = useState(null);

  // 모델 로드 재시도 기능
  const retryModelLoad = () => {
    if (!modelLoaded && !modelLoading) {
      // 모델 로드 상태 설정
      setModelLoading(true);

      // 모델이 이미 로드되었는지 확인
      if (customLayerRef.current && mapRef.current) {
        console.log("3D 모델 로드 재시도");

        // 기존 레이어가 있으면 제거
        if (mapRef.current.getLayer("3d-model")) {
          mapRef.current.removeLayer("3d-model");
        }

        // 레이어 다시 추가
        mapRef.current.addLayer(customLayerRef.current);
      } else {
        console.warn("커스텀 레이어가 초기화되지 않았습니다.");
        setModelLoading(false);
      }
    }
  };

  useEffect(() => {
    // Add your Mapbox access token here
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    // 기본 좌표 및 줌 레벨 설정
    const defaultLongitude = vehiclePosition[0];
    const defaultLatitude = vehiclePosition[1];
    const defaultZoom = 19.3;

    // 모델 위치 계산 및 modelTransform 초기화
    const modelOrigin = vehiclePosition;
    const modelAltitude = 0;
    const modelRotate = [Math.PI / 2, 0, 0];

    const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
      modelOrigin,
      modelAltitude
    );

    setModelTransform({
      translateX: modelAsMercatorCoordinate.x,
      translateY: modelAsMercatorCoordinate.y,
      translateZ: modelAsMercatorCoordinate.z,
      rotateX: modelRotate[0],
      rotateY: modelRotate[1],
      rotateZ: modelRotate[2],
      scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits(),
    });

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/sharmx1am/cm8ibm75x017501r094cmctgp",
      center: [defaultLongitude, defaultLatitude],
      zoom: defaultZoom,
      pitch: 60,
      bearing: 28,
      antialias: true, // 3D 렌더링을 위한 안티앨리어싱 활성화
    });

    // 지도가 로드된 후 3D 차량 모델 추가
    mapRef.current.on("style.load", () => {
      // 커스텀 레이어 정의
      customLayerRef.current = {
        id: "3d-model",
        type: "custom",
        renderingMode: "3d",
        onAdd: function (map, gl) {
          this.camera = new THREE.Camera();
          this.scene = new THREE.Scene();

          // 조명 추가
          const directionalLight = new THREE.DirectionalLight(0xffffff);
          directionalLight.position.set(0, -70, 100).normalize();
          this.scene.add(directionalLight);

          const directionalLight2 = new THREE.DirectionalLight(0xffffff);
          directionalLight2.position.set(0, 70, 100).normalize();
          this.scene.add(directionalLight2);

          // 모델 로드
          setModelLoading(true);
          const loader = new GLTFLoader();
          loader.load(
            "/models/n_vision_74.glb",
            (gltf) => {
              this.scene.add(gltf.scene);
              carModelRef.current = gltf.scene;
              setModelLoaded(true);
              setModelLoading(false);
              console.log("3D 모델 로드 완료");
            },
            (xhr) => {
              console.log((xhr.loaded / xhr.total) * 100 + "% 로드됨");
            },
            (error) => {
              console.error("모델 로드 오류:", error);
              setModelLoading(false);
            }
          );

          // 렌더러 설정
          this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
          });

          this.renderer.autoClear = false;
          this.map = map;
        },
        render: function (gl, matrix) {
          if (!this.camera || !this.scene || !modelTransform) return;

          const rotationX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            modelTransform.rotateX
          );
          const rotationY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            modelTransform.rotateY
          );
          const rotationZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            modelTransform.rotateZ
          );

          const m = new THREE.Matrix4().fromArray(matrix);
          const l = new THREE.Matrix4()
            .makeTranslation(
              modelTransform.translateX,
              modelTransform.translateY,
              modelTransform.translateZ
            )
            .scale(
              new THREE.Vector3(
                modelTransform.scale,
                -modelTransform.scale, // Y축 반전 (중요)
                modelTransform.scale
              )
            )
            .multiply(rotationX)
            .multiply(rotationY)
            .multiply(rotationZ);

          this.camera.projectionMatrix = m.multiply(l);
          this.renderer.resetState();
          this.renderer.render(this.scene, this.camera);
          this.map.triggerRepaint();
        },
      };

      mapRef.current.addLayer(customLayerRef.current);

      // 경로 레이어 추가
      mapRef.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });

      mapRef.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#4264fb",
          "line-width": 6,
          "line-opacity": 0.8,
        },
      });

      // 목적지 마커 레이어 추가
      mapRef.current.addSource("destination", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
        },
      });

      mapRef.current.addLayer({
        id: "destination-point",
        type: "circle",
        source: "destination",
        paint: {
          "circle-radius": 10,
          "circle-color": "#ff0000",
        },
      });

      // 지도 클릭 이벤트 처리 - 목적지 설정
      mapRef.current.on("click", (e) => {
        if (isRouting) return; // 이미 주행 중이면 목적지 변경 불가

        const coords = [e.lngLat.lng, e.lngLat.lat];
        setDestination(coords);

        // 목적지 마커 업데이트
        mapRef.current.getSource("destination").setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: coords,
          },
        });

        // 경로 생성
        generateRoute(vehiclePosition, coords);
      });
    });

    // Map needs to be resized when the container size changes
    const resizeMap = () => {
      if (mapRef.current) {
        mapRef.current.resize();
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
      document.head.removeChild(styleElement);
    };
  }, []);

  // 경로 생성 함수 (간단한 직선 경로 생성, 실제로는 Directions API 사용 권장)
  const generateRoute = (start, end) => {
    // 시작점과 목적지가 같은 경우 경로 생성하지 않음
    if (start[0] === end[0] && start[1] === end[1]) {
      console.log("시작점과 목적지가 동일합니다.");
      setRouteCoordinates([]);

      // 경로 레이어 비우기
      if (mapRef.current && mapRef.current.getSource("route")) {
        mapRef.current.getSource("route").setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        });
      }
      return;
    }

    // 간단한 경로 생성 (직선 경로를 여러 포인트로 분할)
    const points = 50; // 경로 포인트 수
    const route = [];

    for (let i = 0; i <= points; i++) {
      const ratio = i / points;
      const lng = start[0] + (end[0] - start[0]) * ratio;
      const lat = start[1] + (end[1] - start[1]) * ratio;
      route.push([lng, lat]);
    }

    setRouteCoordinates(route);

    // 경로 레이어 업데이트
    if (mapRef.current && mapRef.current.getSource("route")) {
      mapRef.current.getSource("route").setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: route,
        },
      });
    }

    // 모델이 아직 로드되지 않았다면 로드 시도
    if (!modelLoaded && !modelLoading) {
      retryModelLoad();
    }
  };

  // 차량 위치 업데이트 함수
  const updateVehiclePosition = (newPosition, bearing) => {
    setVehiclePosition(newPosition);

    // 새 위치에 대한 MercatorCoordinate 계산
    const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
      newPosition,
      0 // 고도
    );

    // modelTransform 업데이트
    setModelTransform((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        translateX: modelAsMercatorCoordinate.x,
        translateY: modelAsMercatorCoordinate.y,
        translateZ: modelAsMercatorCoordinate.z,
        rotateZ: bearing ? (bearing * Math.PI) / 180 : prev.rotateZ,
      };
    });

    // 지도 뷰를 차량 위치로 이동
    if (mapRef.current) {
      mapRef.current.panTo(newPosition, {
        duration: 500, // 애니메이션 시간 (밀리초)
        essential: true,
      });
    }
  };

  // 경로를 따라 차량 이동 시작
  const startRouting = () => {
    if (!destination || routeCoordinates.length === 0) {
      alert("목적지를 먼저 선택해주세요.");
      return;
    }

    // 시작점과 목적지가 같은 경우 주행 시작하지 않음
    if (
      vehiclePosition[0] === destination[0] &&
      vehiclePosition[1] === destination[1]
    ) {
      alert("현재 위치와 목적지가 동일합니다. 다른 목적지를 선택해주세요.");
      return;
    }

    // 모델이 로드되지 않았으면 알림
    if (!carModelRef.current) {
      alert("3D 모델이 아직 로드 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsRouting(true);
    setCurrentRouteIndex(0);
  };

  // 경로를 따라 차량 이동 처리
  useEffect(() => {
    if (!isRouting || routeCoordinates.length === 0) return;

    const moveAlongRoute = () => {
      if (currentRouteIndex >= routeCoordinates.length - 1) {
        setIsRouting(false);
        return;
      }

      const nextIndex = currentRouteIndex + 1;
      const currentPos = routeCoordinates[currentRouteIndex];
      const nextPos = routeCoordinates[nextIndex];

      // 방향 계산 (bearing)
      const bearing = calculateBearing(currentPos, nextPos);

      // 차량 위치 및 방향 업데이트
      updateVehiclePosition(nextPos, bearing);
      setCurrentRouteIndex(nextIndex);
    };

    const interval = setInterval(moveAlongRoute, 100); // 이동 속도 조절

    return () => clearInterval(interval);
  }, [isRouting, currentRouteIndex, routeCoordinates]);

  // 두 좌표 사이의 방향(bearing) 계산 함수
  const calculateBearing = (start, end) => {
    const startLat = (start[1] * Math.PI) / 180;
    const startLng = (start[0] * Math.PI) / 180;
    const endLat = (end[1] * Math.PI) / 180;
    const endLng = (end[0] * Math.PI) / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x =
      Math.cos(startLat) * Math.sin(endLat) -
      Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);

    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    bearing = (bearing + 360) % 360; // 0-360 범위로 정규화

    return bearing;
  };

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

    if (panelHeight < 25) {
      setPanelHeight(MIN_PANEL_HEIGHT);
    } else if (panelHeight > 70) {
      setPanelHeight(80);
    } else {
      setPanelHeight(40);
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

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        ref={mapContainerRef}
        id="map"
        style={{
          height: `${100 - panelHeight}%`,
          width: "100%",
          transition: isDragging ? "none" : "height 0.3s ease-out",
        }}
      />

      {/* Info Panel */}
      <div
        ref={panelRef}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: `${panelHeight}%`,
          backgroundColor: "white",
          borderTopLeftRadius: "15px",
          borderTopRightRadius: "15px",
          boxShadow: "0px -2px 10px rgba(0, 0, 0, 0.1)",
          transition: isDragging ? "none" : "height 0.3s ease-out",
          overflow: "hidden",
        }}
      >
        {/* Handle to drag panel */}
        <div
          ref={dragHandleRef}
          style={{
            width: "50px",
            height: "5px",
            backgroundColor: "#ccc",
            borderRadius: "10px",
            margin: "10px auto",
            cursor: "grab",
            touchAction: "none",
            ...(isDragging && { cursor: "grabbing" }),
          }}
        />

        {/* Panel content */}
        <div style={{ padding: "20px" }}>
          <h3>차량 정보</h3>
          <p>
            현재 위치: {vehiclePosition[0].toFixed(6)},{" "}
            {vehiclePosition[1].toFixed(6)}
          </p>

          {!isRouting && (
            <>
              <p>목적지를 지도에서 선택하세요:</p>

              <button
                onClick={startRouting}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#22c55e",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  opacity:
                    !destination ||
                    routeCoordinates.length === 0 ||
                    (vehiclePosition[0] === destination[0] &&
                      vehiclePosition[1] === destination[1])
                      ? 0.5
                      : 1,
                  pointerEvents:
                    !destination ||
                    routeCoordinates.length === 0 ||
                    (vehiclePosition[0] === destination[0] &&
                      vehiclePosition[1] === destination[1])
                      ? "none"
                      : "auto",
                }}
                disabled={
                  !destination ||
                  routeCoordinates.length === 0 ||
                  (vehiclePosition[0] === destination[0] &&
                    vehiclePosition[1] === destination[1])
                }
              >
                주행 시작
              </button>
            </>
          )}

          {isRouting && (
            <>
              <p>목적지로 이동 중...</p>
              <div
                style={{
                  width: "100%",
                  backgroundColor: "#eee",
                  borderRadius: "4px",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    width: `${
                      (currentRouteIndex / (routeCoordinates.length - 1)) * 100
                    }%`,
                    height: "10px",
                    backgroundColor: "#4264fb",
                    borderRadius: "4px",
                  }}
                />
              </div>
              <button
                onClick={() => setIsRouting(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                주행 중지
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
