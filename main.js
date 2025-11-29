import { auth } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// DOMContentLoadedイベントリスナー
document.addEventListener('DOMContentLoaded', () => {
    // ハンバーガーメニューの処理
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // 認証状態の監視とUI更新
    const navLogin = document.getElementById('nav-login');
    const navSignup = document.getElementById('nav-signup');
    const navAuth = document.getElementById('nav-auth'); // club.html用
    const userMenu = document.getElementById('user-menu');
    const userIcon = document.getElementById('user-icon');
    const logoutButton = document.getElementById('logout-button');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // ログインしている場合
            if (navLogin) navLogin.style.display = 'none';
            if (navSignup) navSignup.style.display = 'none';
            if (navAuth) navAuth.style.display = 'none';

            if (userMenu) userMenu.style.display = 'flex';
            if (userIcon) userIcon.textContent = user.email.charAt(0).toUpperCase();

        } else {
            // ログアウトしている場合
            if (navLogin) navLogin.style.display = 'list-item';
            if (navSignup) navSignup.style.display = 'list-item';
            if (navAuth) navAuth.style.display = 'list-item';

            if (userMenu) userMenu.style.display = 'none';
        }
    });

    // ログアウトボタンの処理
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                // ログアウト成功後、ホームページにリダイレクト
                window.location.href = '/index.html';
            }).catch((error) => {
                console.error('ログアウトエラー', error);
            });
        });
    }
});
