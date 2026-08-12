import axiosInstance from "./axiosInstance";

// 주차 목적지 조회
export const parkingDestination = async ({ vehicleVin, destination }) => {
  const response = await axiosInstance.post(
    `api/v1/remote/parking/destination?vehicleVin=${vehicleVin}`,
    { destination } // destination : { "latitude", "longitude"}
  );
  // console.log(response.data); // for debugging
  return response.data;
};

// 주차 목적지 설정
export const parkingChoose = async ({ vehicleVin, destination }) => {
  const response = await axiosInstance.post(
    `api/v1/remote/parking/choose?vehicleVin=${vehicleVin}`,
    { destination } // destination : { "latitude", "longitude"}
  );
  // console.log(response.data); // for debugging
  return response.data;
};

// 원격 호출 목적지 설정
export const vehicleDestination = async ({ vehicleVin, currentLocation }) => {
  const response = await axiosInstance.post(
    `api/v1/remote/destination?vehicleVin=${vehicleVin}`,
    { currentLocation }
    // currentLocation : { "latitude", "longitude" }
    // requestTime : "2025-03-14T12:45:00Z", 선택 사항; 없으면 즉시 출발
  );
  // console.log(response.data); // for debugging
  return response.data;
};

// 배회 요청
export const vehicleRoam = async ({
  vehicleVin,
  currentLocation,
  roamDuration,
}) => {
  const response = await axiosInstance.post(
    `api/v1/remote/roam?vehicleVin=${vehicleVin}`,
    { vehicleVin, currentLocation, roamDuration }
  );
  console.log(response.data); // for debugging
  return response.data;
};

export const roamStop = async(vehicleVin) => {
  const response = await axiosInstance.post(
  `api/v1/remote/roam/stop?vehicleVin=${vehicleVin}`);
  console.log(response.data);
  return response.data;
};
