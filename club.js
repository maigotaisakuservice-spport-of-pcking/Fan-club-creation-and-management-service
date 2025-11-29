// club.js
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    doc, getDoc, setDoc, serverTimestamp,
    collection, query, orderBy, getDocs
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM要素の取得
const clubNameElement = document.getElementById('club-name');
const publicArea = document.getElementById('public-area');
const memberArea = document.getElementById('member-area');
const errorSection = document.getElementById('error-section');
const actionButton = document.getElementById('action-button');
const showPublicAreaButton = document.getElementById('show-public-area-button');
const videoContainer = document.getElementById('video-container');
const postsContainer = document.getElementById('posts-container');
const publicContentsContainer = document.getElementById('public-contents-container');
const memberContentsContainer = document.getElementById('member-contents-container');

// URLからクラブIDを取得
const params = new URLSearchParams(window.location.search);
const clubId = params.get('id');
let clubData = null;

// メイン処理
document.addEventListener('DOMContentLoaded', async () => {
    if (!clubId) { showError('ファンクラブIDが指定されていません。'); return; }
    try {
        const clubDocRef = doc(db, "fanclubs", clubId);
        const clubDocSnap = await getDoc(clubDocRef);
        if (clubDocSnap.exists()) {
            clubData = clubDocSnap.data();
            clubNameElement.textContent = `ようこそ！ ${clubData.name} のファンクラブへ`;
            applyCustomStyles(clubData.styles);
            applyCustomLayout(clubData.layout);
            onAuthStateChanged(auth, updateUser);
        } else {
            showError('指定されたファンクラブは存在しません。');
        }
    } catch (error) { console.error(error); showError('情報の取得中にエラーが発生しました。'); }
});

// カスタムスタイル適用
function applyCustomStyles(styles) {
    if (!styles) return;
    const apply = (element, s) => {
        if (!s) return;
        element.style.backgroundColor = s.bgColor || '';
        element.style.color = s.textColor || '';
        element.querySelectorAll('h2, h3, p, a').forEach(el => { el.style.color = s.textColor || ''; });
        if (s.bgImage) {
            element.style.backgroundImage = `url('${s.bgImage}')`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
            element.style.boxShadow = 'inset 0 0 0 1000px rgba(0,0,0,0.2)';
        }
    };
    apply(publicArea, styles.public);
    apply(memberArea, styles.member);
}

// カスタムレイアウト適用
function applyCustomLayout(layout) {
    if (!layout) return;
    const reorder = (c, o) => o.forEach(id => c.appendChild(c.querySelector(`[data-block-id="${id}"]`)));
    if (layout.public) reorder(publicContentsContainer, layout.public);
    if (layout.member) reorder(memberContentsContainer, layout.member);
}

// ユーザー状態に応じたページ更新
async function updateUser(user) {
    actionButton.disabled = false;
    actionButton.style.display = 'block';
    if (user) {
        if (user.uid === clubId) {
            actionButton.textContent = '管理ページへ';
            actionButton.onclick = () => window.location.href = `management.html`;
            return;
        }
        const clubDocSnap = await getDoc(doc(db, "fanclubs", clubId));
        const currentData = clubDocSnap.data();
        const isWinner = currentData.winners && currentData.winners.includes(user.uid);
        if (isWinner) {
            actionButton.textContent = '会員限定エリアへ進む';
            actionButton.onclick = () => showMemberArea(true);
            return;
        }
        const applicantDocSnap = await getDoc(doc(db, `fanclubs/${clubId}/applicants`, user.uid));
        if (applicantDocSnap.exists()) {
            actionButton.textContent = '抽選申し込み済み';
            actionButton.disabled = true;
        } else {
            actionButton.textContent = 'このファンクラブの抽選に申し込む';
            actionButton.onclick = applyForLottery;
        }
    } else {
        actionButton.textContent = '抽選に参加するにはログインしてください';
        actionButton.onclick = () => window.location.href = 'login.html';
    }
}

// 会員限定エリア表示とコンテンツ読み込み
async function showMemberArea(show) {
    if (show) {
        const clubDocSnap = await getDoc(doc(db, "fanclubs", clubId)); // 最新の情報を再取得
        const latestClubData = clubDocSnap.data();
        videoContainer.innerHTML = latestClubData.videoUrl ? `<iframe width="100%" height="315" src="${latestClubData.videoUrl}" frameborder="0" allowfullscreen></iframe>` : '<p>限定動画はありません。</p>';
        const postsSnapshot = await getDocs(query(collection(db, `fanclubs/${clubId}/posts`), orderBy("createdAt", "desc")));
        postsContainer.innerHTML = '';
        postsSnapshot.forEach(doc => {
            const post = doc.data();
            postsContainer.innerHTML += `<div class="post"><p>${post.content.replace(/\n/g, '<br>')}</p><span>${new Date(post.createdAt.seconds * 1000).toLocaleString()}</span></div>`;
        });
    }
    publicArea.style.display = show ? 'none' : 'block';
    memberArea.style.display = show ? 'block' : 'none';
}

// 抽選申し込み
async function applyForLottery() {
    const user = auth.currentUser;
    if (!user || !clubId) return;
    try {
        await setDoc(doc(db, `fanclubs/${clubId}/applicants`, user.uid), { email: user.email, appliedAt: serverTimestamp() });
        alert('申し込みが完了しました！');
        actionButton.textContent = '抽選申し込み済み';
        actionButton.disabled = true;
    } catch (error) { alert('申し込みに失敗しました。'); }
}

// エラー表示
function showError(message) {
    publicArea.style.display = 'none';
    memberArea.style.display = 'none';
    actionButton.style.display = 'none';
    errorSection.textContent = message;
    errorSection.style.display = 'block';
}

// イベントリスナー
showPublicAreaButton.addEventListener('click', () => showMemberArea(false));
