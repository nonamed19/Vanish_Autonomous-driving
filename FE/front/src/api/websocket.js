// import SockJS from "sockjs-client";
// import Stomp from "stompjs";

// // const Stomp = require("stompjs");

// let stompClient = null;
// const subscriptions = {};

// export const connectWebSocket = () => {
//   const socket = new SockJS("https://j12a707.p.ssafy.io/ws");
//   stompClient = Stomp.over(socket);

//   stompClient.connect(
//     {},
//     (frame) => {
//       console.log("WebSocket connected:", frame);

//       Object.keys(subscriptions).forEach((topic) => {
//         stompClient.subscribe(topic, (message) => {
//           const callback = subscriptions[topic];
//           if (callback) {
//             const data = JSON.parse(message.body);
//             callback(data);
//           }
//         });
//       });
//     },
//     (error) => {
//       console.error("WebSocket connection error:", error);
//     }
//   );
// };

// export const subscribeTopic = (topic, callback) => {
//   subscriptions[topic] = callback;

//   if (stompClient && stompClient.connected) {
//     stompClient.subscribe(topic, (message) => {
//       const data = JSON.parse(message.body);
//       callback(data);
//     });
//   }
// };

// export const disconnectWebSocket = () => {
//   if (stompClient && stompClient.connected) {
//     stompClient.disconnect(() => {
//       console.log("WebSocket disconnected");
//     });
//   }
// };
