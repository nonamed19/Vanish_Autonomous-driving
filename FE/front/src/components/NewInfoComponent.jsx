import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Hyundai from "../assets/images/Vanish.png";
import Nexo from "../assets/images/Nexo.png";
import styles from "../styles/NewInfo.module.css";
import CustomAlert from "./CustomAlert";
import { register } from "../api/vehicles";

function NewInfoComponent() {
  const navigate = useNavigate();
  const [vehicleVin, setVehicleVin] = useState("");
  const [model, setModel] = useState("Nexo");
  const [vehicleName, setVehicleName] = useState("");
  const [registrationNum, setRegistrationNum] = useState("");
  const [ownership, setOwnership] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorMessages, setErrorMessages] = useState([]);
  const [showVehicleInfo, setShowVehicleInfo] = useState(false);

  const handleRegister = async () => {
    try {
      const response = await register({
        vehicleVin,
        model,
        vehicleName,
        registrationNum,
        ownership,
      });
      console.log(response.data);
      navigate("/vehicle-registration");
      // } else {
      //   console.log(response.data);
      //   setErrorMessage("차량 등록에 실패했습니다.");
    } catch (error) {
      console.error(error.response?.data);
      setErrorMessage("차량 등록 중 오류가 발생했습니다.");
    }
  };

  // VIN 입력 핸들러
  const handleVinChange = (e) => {
    const value = e.target.value.toUpperCase(); // 자동 대문자 처리
    if (value.length > 17) return; // 입력 제한
    setVehicleVin(value);
  };

  // 자동차등록번호 입력 핸들러
  const handleRegistrationNumChange = (e) => {
    let value = e.target.value;
    if (value.length > 9) return; // 입력 제한
    setRegistrationNum(value);
  };

  // Verify 핸들러
  const handleVerify = () => {
    let errors = [];

    if (localStorage.getItem("registrationNum")) {
      errors.push("이미 등록된 차량입니다.");
      setErrorMessages(errors);
      setShowVehicleInfo(false);
      return;
    }

    if (!/^[A-Z]{5}[0-9]{2}[A-Z]{4}[0-9]{6}$/.test(vehicleVin)) {
      errors.push("차대번호를 정확히 입력해 주세요.");
    }

    if (
      !/^[0-9]{2,3}[가-힣]{1} [0-9]{4}$/.test(registrationNum) || 
      registrationNum.length !== 8 && registrationNum.length !== 9
    ) {
      errors.push("자동차등록번호를 정확히 입력해 주세요.");
    }    

    if (errors.length > 1) {
      setErrorMessages(["차대번호 및 자동차등록번호를 정확히 입력해 주세요."]);
      setShowVehicleInfo(false);
      return;
    } else if (errors.length > 0) {
      setErrorMessages(errors);
      setShowVehicleInfo(false);
      return;
    }

    setErrorMessages([]);
    setShowVehicleInfo(true);
  };

  const [showAlert, setShowAlert] = useState(false);

  return (
    <div className={styles.NewInfoContainer}>
      {/* 상단 로고 */}
      <div
        className={styles.LogoContainer}
        onClick={() => navigate("/home")}
        style={{ cursor: "pointer" }}
      >
        <img src={Hyundai} alt="Hyundai" className={styles.HyundaiLogo} />
      </div>

      {/* 제목 */}
      <h2 className={styles.Title}>차량 정보 등록</h2>

      {/* 입력 폼 */}
      <div className={styles.InputContainer}>
        <label>차대번호 (VIN Code)</label>
        <input
          type="text"
          placeholder="VIN Code"
          value={vehicleVin}
          onChange={handleVinChange}
          className={`${styles.Input} ${
            errorMessages.some((msg) => msg.includes("차대번호"))
              ? styles.InputError
              : ""
          }`}
          jsx
          Copy
          Edit
        />

        <label>자동차등록번호</label>
        <input
          type="text"
          placeholder="Ex) 12가 3456 or 123가 4567"
          value={registrationNum}
          onChange={handleRegistrationNumChange}
          className={`${styles.Input} ${
            errorMessages.some((msg) => msg.includes("자동차등록번호"))
              ? styles.InputError
              : ""
          }`}
        />

        <button onClick={handleVerify} className={styles.VerifyButton}>
          Verify
        </button>
        {errorMessages.length > 0 && (
          <div className={styles.ErrorText}>
            {errorMessages.map((msg, idx) => (
              <p key={idx}>{msg}</p>
            ))}
          </div>
        )}

        {/* 차량 정보 표시 */}
        {showVehicleInfo && (
          <div className={styles.PreviewContainer}>
            <img
              src={Nexo}
              alt="Nexo Preview"
              className={styles.PreviewImage}
            />
            <h3 className={styles.VehicleName}>Nexo</h3>

            <div className={styles.OwnershipOptions}>
              {["개인 차량", "공유받은 차", "법인/리스/렌트 차"].map((type) => (
                <button
                  key={type}
                  className={`${styles.OwnershipButton} ${
                    ownership === type ? styles.SelectedButton : ""
                  }`}
                  onClick={() => setOwnership(type)}
                >
                  {type}
                </button>
              ))}
            </div>
            <div>
              <label>차량 이름</label>
              <input
                type="text"
                placeholder="Vehicle Name"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                className={`${styles.Input} ${
                  errorMessage ? styles.InputError : ""
                }`}
              />
            </div>
            <button onClick={handleRegister} className={styles.RegisterButton}>
              차량 등록
            </button>
            {/* 커스텀 알림 */}
            {showAlert && (
              <CustomAlert
                message="차량이 등록되었습니다."
                onClose={() => setShowAlert(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NewInfoComponent;
