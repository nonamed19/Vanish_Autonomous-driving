import axiosInstance from "./axiosInstance";

// 초기 결제 내역 등록
export const registerInitHistory = async ({
  parkingLotName,
  baseFee,
  rateFee,
}) => {
  const response = await axiosInstance.post(
    "api/v1/payments/register/init-history",
    {
      parkingLotName,
      baseFee,
      rateFee,
    }
  );
  return response.data;
};

// 입차 시간 등록(ROS)

// 예상 결제 내역
export const paymentsComplete = async () => {
  const response = await axiosInstance.post("api/v1/payments/complete", {});
  return response.data;
};

// 결제 검증
export const verifyPayment = async (impUid) => {
  const response = await axiosInstance.post(`api/v1/payments/${impUid}`);
  return response.data;
};

// 결제 취소
export const cancelPayment = async (impUid) => {
  const response = await axiosInstance.post(`api/v1/payments/cancel/${impUid}`);
  return response.data;
};
