// export const firebaseConfig = {
//   "projectId": "studio-7067243677-96462",
//   "appId": "1:754343511691:web:b65da880e7c447828a368e",
//   "apiKey": "AIzaSyCC0AauR1j71K-HT4GWkzYwQ8QS7lf5AME",
//   "authDomain": "studio-7067243677-96462.firebaseapp.com",
//   "measurementId": "",
//   "messagingSenderId": "754343511691"
// };

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

