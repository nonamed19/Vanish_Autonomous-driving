import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import styles from "../styles/MapComponent.module.css";
import { vehicleslocation } from "../api/vehicles";

const MapComponent = () => {
  const mapContainerRef = useRef();
  const mapRef = useRef();
  const panelRef = useRef();
  const dragHandleRef = useRef();
  const carModelRef = useRef();
  const customLayerRef = useRef();
  const vehiclePositionRef = useRef([126.5628, 37.5249]);

  const [vehiclePosition, setVehiclePosition] = useState([126.5628, 37.5249]);
  const [panelHeight, setPanelHeight] = useState(40);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  // const [destination, setDestination] = useState(null);
  // const [isRouting, setIsRouting] = useState(false);
  // const [routeCoordinates, setRouteCoordinates] = useState([]);
  // const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const vehicleVin = localStorage.getItem("vehicleVin");

  const MIN_PANEL_HEIGHT = 15;

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
    const interval = setInterval(async () => {
      try {
        const response = await vehicleslocation(vehicleVin);
        const { latitude, longitude } = response.gps;

        const newPosition = [longitude, latitude];
        setVehiclePosition(newPosition);
        vehiclePositionRef.current = newPosition;
        console.log(longitude, latitude); // for debugging

        if (mapRef.current && modelLoaded) {
          mapRef.current.easeTo({
            center: newPosition,
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

  const add3DBuildings = (map) => {
    map.addLayer({
      id: "main-parking-building",
      type: "fill-extrusion",
      source: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {
            height: 30,
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

              this.scene.add(model);// 차량 현재 위치 조회
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

  return (
    <div className={styles.mapWrapper}>
      <div
        ref={mapContainerRef}
        className={styles.mapContainer}
        style={{ height: `${100 - panelHeight}%` }}
      />
      <div
        ref={panelRef}
        className={styles.panel}
        style={{ height: `${panelHeight}%` }}
      >
        <div ref={dragHandleRef} className={styles.dragHandle} />
        <div className={styles.panelContent}>
          <h3>차량 정보</h3>
          <p>
            {/* 현재 위치: {vehiclePosition[0].toFixed(6)},{" "}
            {vehiclePosition[1].toFixed(6)} */}
            현재 위치: {localStorage.getItem("latitude")},{" "}
            {localStorage.getItem("longitude")}
          </p>
          <div style={{ marginTop: "10px" }}>
            <label>
              경도:{" "}
              <input
                type="number"
                step="0.000001"
                value={vehiclePosition[0]}
                onChange={(e) =>
                  setVehiclePosition([
                    parseFloat(e.target.value),
                    vehiclePosition[1],
                  ])
                }
              />
            </label>
            <label>
              위도:{" "}
              <input
                type="number"
                step="0.000001"
                value={vehiclePosition[1]}
                onChange={(e) =>
                  setVehiclePosition([
                    vehiclePosition[0],
                    parseFloat(e.target.value),
                  ])
                }
              />
            </label>
          </div>
          {modelLoading && (
            <p style={{ marginTop: "10px" }}>3D 모델 로딩 중...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
