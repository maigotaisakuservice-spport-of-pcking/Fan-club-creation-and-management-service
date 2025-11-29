// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// firebase-config.js からインポートした設定情報を使ってFirebaseを初期化
const app = initializeApp(firebaseConfig);

// 他のファイルで使えるように、認証とデータベースのインスタンスをエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);
