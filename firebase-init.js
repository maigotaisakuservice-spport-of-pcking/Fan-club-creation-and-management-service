// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

let app, auth, db;

try {
    // firebase-config.jsから設定を動的にインポート
    const { firebaseConfig } = await import('./firebase-config.js');

    // Firebaseアプリを初期化
    app = initializeApp(firebaseConfig);

    // サービスを初期化
    auth = getAuth(app);
    db = getFirestore(app);

} catch (error) {
    console.error("Firebaseの初期化に失敗しました。firebase-config.jsが存在し、正しく設定されているか確認してください。", error);
    // ユーザーに設定ファイルが必要であることを通知する
    if (document.body) {
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <h1>設定エラー</h1>
                <p>Firebaseの初期化に失敗しました。</p>
                <p><code>firebase-config.js.example</code>をコピーして<code>firebase-config.js</code>を作成し、あなたのFirebaseプロジェクトの設定情報を入力してください。</p>
            </div>
        `;
    }
}

// 他のファイルで使用するためにエクスポート
export { app, auth, db };
