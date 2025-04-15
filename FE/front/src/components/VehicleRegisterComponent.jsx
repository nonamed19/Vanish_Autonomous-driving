import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Hyundai from "../assets/images/Vanish.png";
import Ioniq9 from "../assets/images/Ioniq9-Personal.png";
import Ioniq5 from "../assets/images/Ioniq5-Shared.png";
import Nexo from "../assets/images/Nexo.png";
import Plus from "../assets/images/plus.png";
import styles from "../styles/Register.module.css";

function VehicleRegister() {
  const navigate = useNavigate();
  const connectedId = localStorage.getItem("connectedVehicleId");

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

  if (localStorage.getItem("registrationNum")) {
    initialVehicles.push({
      id: 3,
      name: localStorage.getItem("vehicleName"),
      type: localStorage.getItem("ownership"),
      image: Nexo,
      connected: connectedId === "3",
    });
  }

  const [vehicles, setVehicles] = useState(initialVehicles);
  const [filter, setFilter] = useState("전체");
  const [sortOption, setSortOption] = useState("차종");

  // 필터링된 차량 리스트
  const filteredVehicles = vehicles.filter(
    (vehicle) => filter === "전체" || vehicle.type === filter
  );

  // 정렬된 차량 리스트
  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    if (sortOption === "차종") return a.name.localeCompare(b.name);
    return a.type.localeCompare(b.type);
  });

  // Connected 차량 변경
  const handleConnect = (id) => {
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === id
          ? { ...vehicle, connected: true }
          : { ...vehicle, connected: false }
      )
    );
    localStorage.setItem("connectedVehicleId", id.toString());
  };

  return (
    <div className={styles.RegisterContainer}>
      {/* 상단 로고 */}
      <div
        className={styles.LogoContainer}
        onClick={() => navigate("/home")}
        style={{ cursor: "pointer" }}
      >
        <img src={Hyundai} alt="Hyundai" className={styles.HyundaiLogo} />
      </div>

      {/* 카드 관리 바 */}
      <div className={styles.ControlBar}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.FilterSelect}
        >
          <option value="전체">전체</option>
          <option value="개인 차량">개인 차량</option>
          <option value="공유받은 차">공유받은 차</option>
          <option value="법인/리스/렌트 차">법인/리스/렌트 차</option>
        </select>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className={`${styles.SortSelect} ${styles.CustomSelect}`}
        >
          <option value="차종">차종</option>
          <option value="소유 형태">소유 형태</option>
        </select>
      </div>

      {/* 차량 리스트 */}
      <div className={styles.VehicleList}>
        {sortedVehicles.length > 0 ? (
          sortedVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className={`${styles.VehicleCard} ${
                vehicle.connected ? styles.ConnectedCard : ""
              }`}
              onClick={() => handleConnect(vehicle.id)}
            >
              <img
                src={vehicle.image}
                alt={vehicle.name}
                className={styles.VehicleImage}
              />
              <div className={styles.VehicleInfo}>
                <h3>{vehicle.name}</h3>
                <p>{vehicle.type}</p>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.NoVehicles}>해당되는 차량이 없습니다.</div>
        )}
      </div>

      {/* 신규 차량 등록 버튼 */}
      <button
        className={styles.RegisterButton}
        onClick={() => navigate("/newinfo")}
      >
        <div>
          <img src={Plus} alt="plus" className={styles.plusIcon} />
          <p>신규 차량 등록</p>
        </div>
      </button>
    </div>
  );
}

export default VehicleRegister;
