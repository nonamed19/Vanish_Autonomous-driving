import axiosInstance from "./axiosInstance";

// 차량 등록
export const register = async ({
  vehicleVin,
  model,
  vehicleName,
  registrationNum,
  ownership,
}) => {
  const response = await axiosInstance.post("api/v1/vehicles/register", {
    vehicleVin,
    model,
    vehicleName,
    registrationNum,
    ownership,
  });
  await myvehicles();
  return response.data;
};

// 본인 소유 차량 정보 조회
export const myvehicles = async () => {
  const response = await axiosInstance.get("api/v1/vehicles/my", {});
  console.log(response.data); // for debugging
  const { vehicleVin, model, vehicleName, registrationNum, ownership } =
    response.data.vehicle;
  localStorage.setItem("vehicleVin", vehicleVin);
  localStorage.setItem("model", model);
  localStorage.setItem("vehicleName", vehicleName);
  localStorage.setItem("registrationNum", registrationNum);
  localStorage.setItem("ownership", ownership);
  return response.data;
};

// 차량 현재 위치 조회(One at a time)
export const vehicleslocation = async (vehicleVin, config = {}) => {
  const response = await axiosInstance.get(
    `api/v1/vehicles/location?vehicleVin=${encodeURIComponent(vehicleVin)}`,
    config
  );
  // console.log(response.data); // for debugging
  return response.data;
};

// 차량 상태 정보 조회
export const vehiclesStatus = async ({ vehicleVin, gps, carGps }) => {
  const response = await axiosInstance.post(
    `api/v1/vehicles/status?vehicleVin=${vehicleVin}`,
    { gps, carGps }
  );
  // console.log(response.data); // for debugging
  return response.data;
};

// 원격 호출 목적지 설정
export const vehiclesdetination = async ({ currentLocation, requestTime }) => {
  const response = await axiosInstance.post("api/v1/vehicles/destination", {
    currentLocation, // { "latitude": 37.5665, "longitude": 126.9780 }
    requestTime, // "2025-03-14T12:45:00Z" 선택 사항; 없으면 즉시 출발
  });
  console.log(response.data); // for debugging
  return response.data;
};
