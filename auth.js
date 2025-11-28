// auth.js
import { auth, db } from './firebase-init.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');

// 新規登録フォームの処理
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            email: user.email,
            role: role,
            createdAt: new Date()
        });

        alert('新規登録が完了しました！');
        // 登録後は役割に応じたページへリダイレクト
        window.location.href = (role === 'creator') ? 'management.html' : 'index.html';

    } catch (error) {
        alert('新規登録に失敗しました: ' + error.message);
    }
});

// ログインフォームの処理
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Firestoreからユーザーの役割情報を取得
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            alert('ログインしました！');
            // 役割に応じてリダイレクト先を変更
            if (userData.role === 'creator') {
                window.location.href = 'management.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            // Firestoreにドキュメントがない（古いユーザーなど）場合のフォールバック
            alert('ログインしました！ユーザー情報が見つかりませんでした。');
            window.location.href = 'index.html';
        }

    } catch (error) {
        alert('ログインに失敗しました: ' + error.message);
    }
});
