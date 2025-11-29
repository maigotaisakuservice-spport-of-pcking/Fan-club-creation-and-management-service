// admin.js
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const adminPage = document.getElementById('admin-page');
const loadingOrError = document.getElementById('loading-or-error');
const userListTbody = document.getElementById('user-list-tbody');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().level === 'admin') {
                // 権限あり
                loadingOrError.style.display = 'none';
                adminPage.style.display = 'block';
                await loadAllUsers();
            } else {
                // 権限なし
                showError("このページへのアクセス権限がありません。");
            }
        } catch (error) {
            console.error("Error checking admin status:", error);
            showError("権限の確認中にエラーが発生しました。");
        }
    } else {
        // 未ログイン
        showError("管理者としてログインしてください。");
    }
});

async function loadAllUsers() {
    try {
        const usersCollectionRef = collection(db, "users");
        const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        userListTbody.innerHTML = ''; // テーブルをクリア

        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            const row = `<tr>
                            <td>${userData.email}</td>
                            <td>${userData.role}</td>
                            <td>${doc.id}</td>
                        </tr>`;
            userListTbody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error loading users:", error);
        userListTbody.innerHTML = '<tr><td colspan="3">ユーザーの読み込みに失敗しました。</td></tr>';
    }
}

function showError(message) {
    loadingOrError.innerHTML = `<p style="color: red;">${message}</p><a href="index.html">トップページに戻る</a>`;
    setTimeout(() => {
        // ログインページへのリダイレクトを遅延させることで、ユーザーがメッセージを読む時間を確保
         window.location.href = 'index.html';
    }, 3000); // 3秒後にリダイレクト
}
