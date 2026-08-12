import axiosInstance from "./axiosInstance";
import { profile } from "./members";
import { myvehicles } from "./vehicles";

// 회원 로그인
export const login = async ({ email, password }) => {
  const response = await axiosInstance.post("api/v1/auth/login", {
    type: "email",
    email,
    password,
  });
  const { accessToken, refreshToken } = response.data;
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  await profile();
  try {
    await myvehicles();
  }
  catch (error) {
    console.error(error);
  }
  return response.data;
};

// 회원가입
export const createAccount = async (email, name, birthdate, password) => {
  const response = await axiosInstance.post("api/v1/auth/signup", {
    email,
    name,
    birthdate,
    password,
  });
  login({ email, password });
  return response.data;
};

// 로그아웃
export const logout = async () => {
  const response = await axiosInstance.post("api/v1/auth/logout", {});
  const keyToKeep = "connectedVehicleId";
  const keys = Object.keys(localStorage);

  keys.forEach((key) => {
    if (key !== keyToKeep) {
      localStorage.removeItem(key);
    }
  });
  // localStorage.removeItem("accessToken");
  // localStorage.removeItem("refreshToken");
  // localStorage.clear();
  return response.data;
};

// 이메일 인증 요청
export const checkEmail = async (email) => {
  const response = await axiosInstance.post("api/v1/auth/check-email", {
    email,
  });
  return response.data;
};

// 이메일 인증 코드 검증
export const verifyCode = async (email, verificationCode) => {
  const response = await axiosInstance.post("api/v1/auth/verify-code", {
    email,
    verificationCode,
  });
  return response.data;
};

// 비밀번호 찾기
export const retrievePassword = async (email, birthdate) => {
  const response = await axiosInstance.post("api/v1/auth/retrieve-password", {
    email,
    birthdate,
  });
  return response.data;
};

// 이메일 중복 확인
export const verifyEmail = async (email) => {
  const response = await axiosInstance.post("api/v1/auth/verify-email", {
    email,
  });
  return response.data;
};
