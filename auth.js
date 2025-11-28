// auth.js
import { auth, db } from './firebase-init.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');
const passwordResetForm = document.getElementById('password-reset-form');

// 新規登録フォームの処理 (signup.htmlにのみ存在する)
if (signupForm) {
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
            window.location.href = (role === 'creator') ? 'management.html' : 'index.html';

        } catch (error) {
            alert('新規登録に失敗しました: ' + error.message);
        }
    });
}

// パスワードリセットフォームの処理 (password-reset.htmlにのみ存在する)
if (passwordResetForm) {
    passwordResetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('reset-email').value;

        try {
            await sendPasswordResetEmail(auth, email);
            alert('パスワードリセット用のメールを送信しました。受信トレイをご確認ください。');
            window.location.href = 'login.html';
        } catch (error) {
            alert('メールの送信に失敗しました: ' + error.message);
        }
    });
}

// ログインフォームの処理 (login.htmlにのみ存在する)
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                alert('ログインしました！');
                if (userData.role === 'creator') {
                    window.location.href = 'management.html';
                } else {
                    window.location.href = 'index.html';
                }
            } else {
                alert('ログインしました！ユーザー情報が見つかりませんでした。');
                window.location.href = 'index.html';
            }

        } catch (error) {
            alert('ログインに失敗しました: ' + error.message);
        }
    });
}
