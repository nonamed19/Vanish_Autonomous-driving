import axiosInstance from "./axiosInstance";

// 회원 탈퇴
export const withdraw = async ({ password }) => {
  const response = await axiosInstance.post("api/v1/members/withdraw", {
    password,
  });
  localStorage.clear();
  return response.data;
};

// 회원 정보 조회
export const profile = async () => {
  const response = await axiosInstance.get("api/v1/members/profile", {});
  console.log(response.data); // for debugging

  const { email, name, birthdate } = response.data;
  localStorage.setItem("email", email);
  localStorage.setItem("name", name);
  localStorage.setItem("birthdate", birthdate);
  return response.data;
};

// 비밀번호 변경
export const changePassword = async ({
  email,
  currentPassword,
  newPassword,
}) => {
  const response = await axiosInstance.post("api/v1/members/change-password", {
    email,
    currentPassword,
    newPassword,
  });
  return response.data;
};
