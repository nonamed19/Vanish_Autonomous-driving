import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://j12a707.p.ssafy.io/",
  //baseURL: "http://localhost:8080/",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 서버에서 access token 재발급 API 미구현 상태임. 향후 구현 시 주석 해제
// axiosInstance.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;
//     if (error.response.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true;
//       try {
//         const refreshToken = localStorage.getItem("refreshToken");
//         const response = await axios.post(
//           "https://j12a707.p.ssafy.io/api/v1/auth/refresh",
//           { refreshToken }
//         );
//         const { accessToken } = response.data;
//         localStorage.setItem("accessToken", accessToken);
//         originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
//         return axios(originalRequest);
//       } catch (err) {
//         console.error("Refresh token failed:", err);
//       }
//     }
//     return Promise.reject(error);
//   }
// );

export default axiosInstance;
