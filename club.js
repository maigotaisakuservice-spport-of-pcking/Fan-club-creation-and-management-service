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
const goodsSection = document.querySelector('[data-block-id="goods"]');
const goodsLink = document.getElementById('goods-link');
const goodsMessage = document.getElementById('goods-message');

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

            // BAN状態を確認
            const checkBanned = (ban) => {
                if (!ban || !ban.isBanned) return false;
                const expiry = (ban.expires && ban.expires.toDate) ? ban.expires.toDate() : new Date(ban.expires);
                return { isBanned: expiry >= new Date(), expiry: expiry };
            };

            const banStatus = checkBanned(clubData.ban);
            if (banStatus.isBanned) {
                showBanMessage(clubData.ban.reason, banStatus.expiry.toLocaleString());
                return; // ここで処理を中断
            }

            clubNameElement.textContent = `ようこそ！ ${clubData.name} のファンクラブへ`;
            applyCustomStyles(clubData.styles);
            applyCustomLayout(clubData.layout);
            updateGoodsSection(clubData.goods);
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

// グッズ販売セクションの更新
function updateGoodsSection(goodsData) {
    if (!goodsData || !goodsSection) return;

    switch (goodsData.displayMode) {
        case 'hide':
            goodsSection.style.display = 'none';
            break;
        case 'message':
            goodsSection.style.display = 'block';
            goodsLink.style.display = 'none';
            goodsMessage.style.display = 'block';
            goodsMessage.textContent = goodsData.message || 'グッズは現在準備中です。';
            break;
        case 'link':
        default:
            goodsSection.style.display = 'block';
            goodsMessage.style.display = 'none';
            if (goodsData.url) {
                goodsLink.style.display = 'block';
                goodsLink.href = goodsData.url;
            } else {
                goodsLink.style.display = 'none'; // URLが空ならリンクも非表示
            }
            break;
    }
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

        // メンバー限定情報の取得を試みる（当選者のみ可能）
        try {
            const privateDocSnap = await getDoc(doc(db, `fanclubs/${clubId}/private`, "content"));
            if (privateDocSnap.exists()) {
                actionButton.textContent = '会員限定エリアへ進む';
                actionButton.onclick = () => showMemberArea(true);
                return;
            }
        } catch (error) {
            // 権限がない場合は当選者ではないと判断
            console.log("Not a winner or private content not found");
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
        // メンバー限定情報を取得
        try {
            const privateDocSnap = await getDoc(doc(db, `fanclubs/${clubId}/private`, "content"));
            const privateData = privateDocSnap.exists() ? privateDocSnap.data() : {};
            videoContainer.innerHTML = privateData.videoUrl ? `<iframe width="100%" height="315" src="${privateData.videoUrl}" frameborder="0" allowfullscreen></iframe>` : '<p>限定動画はありません。</p>';
        } catch (error) {
            videoContainer.innerHTML = '<p>限定コンテンツの取得に失敗しました。</p>';
        }

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

// BANメッセージ表示
function showBanMessage(reason, expires) {
    document.querySelector('main').innerHTML = `
        <section style="text-align: center; color: red;">
            <h2>このファンクラブは利用が制限されています</h2>
            <p><strong>理由:</strong> ${reason}</p>
            <p><strong>期限:</strong> ${expires}</p>
        </section>
    `;
}

// イベントリスナー
showPublicAreaButton.addEventListener('click', () => showMemberArea(false));
