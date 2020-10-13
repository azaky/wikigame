// // async chrome APIs

// export async function sendMessage(message) {
//   return new Promise((resolve, reject) => {
//     try {
//       chrome.runtime.sendMessage(message, reply => {
//         resolve(reply);
//       });
//     } catch (err) {
//       reject(err);
//     }
//   });
// }

// export async function setLocalStorage(payload) {
//   return new Promise((resolve, reject) => {
//     try {
//       chrome.storage.local.set(payload, () => {
//         resolve();
//       });
//     } catch (err) {
//       reject(err);
//     }
//   });
// }

// export async function getLocalStorage(payload) {
//   return new Promise((resolve, reject) => {
//     try {
//       chrome.storage.local.get(payload, data => {
//         resolve(data);
//       });
//     } catch (err) {
//       reject(err);
//     }
//   });
// }