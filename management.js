// management.js
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    doc, getDoc, setDoc, updateDoc, serverTimestamp,
    collection, getDocs, writeBatch, addDoc, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM要素の取得
const createClubSection = document.getElementById('create-club-section');
const manageClubSection = document.getElementById('manage-club-section');
const createClubForm = document.getElementById('create-club-form');
const logoutButton = document.getElementById('logout-button');
const runLotteryButton = document.getElementById('run-lottery-button');
const applicantCountSpan = document.getElementById('applicant-count');
const winnerListUl = document.getElementById('winner-list-display');
const videoForm = document.getElementById('video-form');
const videoUrlInput = document.getElementById('video-url-input');
const postForm = document.getElementById('post-form');
const postContentTextarea = document.getElementById('post-content-textarea');
const postsListUl = document.getElementById('posts-list');
const styleEditorForm = document.getElementById('style-editor-form');
const publicLayoutEditor = document.getElementById('public-layout-editor');
const memberLayoutEditor = document.getElementById('member-layout-editor');
const saveLayoutButton = document.getElementById('save-layout-button');
const embedCodeTextarea = document.getElementById('embed-code-textarea');
const embedTypeRadios = document.querySelectorAll('input[name="embed-type"]');

let clubUrl = '';
let publicSortable, memberSortable;

// 埋め込みコード生成
function generateEmbedCode() {
    if (!clubUrl) return;
    const selectedType = document.querySelector('input[name="embed-type"]:checked').value;
    let code = (selectedType === 'link')
        ? `<a href="${clubUrl}" target="_blank">ファンクラブに参加！</a>`
        : `<a href="${clubUrl}" target="_blank" style="display: inline-block; background-color: #e67e22; color: #ffffff; padding: 12px 20px; text-decoration: none; font-family: sans-serif; border-radius: 5px; font-weight: bold;">ファンクラブに参加！</a>`;
    embedCodeTextarea.value = code;
}

// 管理パネルの情報更新
async function updateManagementPanel(uid) {
    const clubDocRef = doc(db, "fanclubs", uid);
    const clubDocSnap = await getDoc(clubDocRef);
    if (!clubDocSnap.exists()) return;
    const clubData = clubDocSnap.data();

    // 応募者数
    const applicantsSnapshot = await getDocs(collection(db, `fanclubs/${uid}/applicants`));
    applicantCountSpan.textContent = applicantsSnapshot.size;

    // 当選者リスト
    winnerListUl.innerHTML = '';
    if (clubData.winners && clubData.winners.length > 0) {
        for (const winnerId of clubData.winners) {
            const userDocSnap = await getDoc(doc(db, "users", winnerId));
            if(userDocSnap.exists()) winnerListUl.innerHTML += `<li>${userDocSnap.data().email}</li>`;
        }
    } else {
        winnerListUl.innerHTML = '<li>まだ当選者はいません。</li>';
    }

    // コンテンツ情報
    videoUrlInput.value = clubData.videoUrl || '';
    const postsSnapshot = await getDocs(query(collection(db, `fanclubs/${uid}/posts`), orderBy("createdAt", "desc"), limit(5)));
    postsListUl.innerHTML = '';
    postsSnapshot.forEach(doc => { postsListUl.innerHTML += `<li>${new Date(doc.data().createdAt.seconds * 1000).toLocaleString()}: ${doc.data().content.substring(0, 50)}...</li>`; });

    // デザイン設定
    if (clubData.styles) {
        const { public: publicStyles, member: memberStyles } = clubData.styles;
        if (publicStyles) {
            document.getElementById('public-bg-color').value = publicStyles.bgColor || '#FFFFFF';
            document.getElementById('public-text-color').value = publicStyles.textColor || '#333333';
            document.getElementById('public-bg-image').value = publicStyles.bgImage || '';
        }
        if (memberStyles) {
            document.getElementById('member-bg-color').value = memberStyles.bgColor || '#F0F0F0';
            document.getElementById('member-text-color').value = memberStyles.textColor || '#333333';
            document.getElementById('member-bg-image').value = memberStyles.bgImage || '';
        }
    }

    // レイアウト設定
    if (clubData.layout) {
        const reorder = (container, order) => order.forEach(id => container.appendChild(container.querySelector(`[data-block-id="${id}"]`)));
        if (clubData.layout.public) reorder(publicLayoutEditor, clubData.layout.public);
        if (clubData.layout.member) reorder(memberLayoutEditor, clubData.layout.member);
    }
}

// 管理パネル表示
function showManagementPanel(uid) {
    createClubSection.style.display = 'none';
    manageClubSection.style.display = 'block';
    clubUrl = `${window.location.origin}/club.html?id=${uid}`;
    generateEmbedCode();
    updateManagementPanel(uid);
    if (!publicSortable) publicSortable = new Sortable(publicLayoutEditor, { animation: 150 });
    if (!memberSortable) memberSortable = new Sortable(memberLayoutEditor, { animation: 150 });
}

// ログイン状態監視
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (userDocSnap.exists() && userDocSnap.data().role === 'creator') {
            const clubDocSnap = await getDoc(doc(db, "fanclubs", user.uid));
            if (clubDocSnap.exists()) showManagementPanel(user.uid);
            else createClubSection.style.display = 'block';
        } else {
            // TODO: alertをより良いUI（例: ページ全体にエラー表示）に置き換える
            alert("アクセス権限がありません。"); window.location.href = 'index.html';
        }
    } else {
        // TODO: alertをより良いUI（例: ページ全体にエラー表示）に置き換える
        alert("ログインしてください。"); window.location.href = 'login.html';
    }
});

// イベントリスナー群
createClubForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clubName = document.getElementById('club-name-input').value;
    const user = auth.currentUser;
    if (!clubName || !user) return;
    try {
        await setDoc(doc(db, "fanclubs", user.uid), { name: clubName, ownerId: user.uid, createdAt: serverTimestamp(), winners: [] });
        // TODO: alertをより良いUI（例: 通知メッセージ）に置き換える
        alert(`ファンクラブ「${clubName}」を作成しました！`);
        showManagementPanel(user.uid);
    } catch (error) {
        // TODO: alertをより良いUI（例: フォーム内のエラーメッセージ）に置き換える
        alert("作成に失敗しました。");
    }
});

runLotteryButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    // TODO: promptをより良いUI（例: モーダルウィンドウ）に置き換える
    const numStr = prompt("何名の当選者を選びますか？", "10");
    const num = parseInt(numStr, 10);
    if (!user || isNaN(num) || num <= 0) {
        // TODO: alertをより良いUI（例: フォーム内のエラーメッセージ）に置き換える
        return alert("有効な数値を入力してください。");
    }
    const applicantsColRef = collection(db, `fanclubs/${user.uid}/applicants`);
    const applicantsSnapshot = await getDocs(applicantsColRef);
    const applicants = applicantsSnapshot.docs.map(d => d.id);
    if (applicants.length === 0) {
        // TODO: alertをより良いUI（例: 通知メッセージ）に置き換える
        return alert("応募者がいません。");
    }
    const winners = applicants.sort(() => 0.5 - Math.random()).slice(0, num);
    try {
        await updateDoc(doc(db, "fanclubs", user.uid), { winners: winners });
        const batch = writeBatch(db);
        applicantsSnapshot.forEach(d => batch.delete(d.ref));
        await batch.commit();
        // TODO: alertをより良いUI（例: 通知メッセージ）に置き換える
        alert("抽選が完了しました！");
        updateManagementPanel(user.uid);
    } catch (error) {
        // TODO: alertをより良いUI（例: 通知メッセージ）に置き換える
        alert("抽選処理に失敗しました。");
    }
});

videoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    try {
        await updateDoc(doc(db, "fanclubs", user.uid), { videoUrl: videoUrlInput.value });
        // TODO: alertをより良いUI（例: 通知メッセージ）に置き換える
        alert('動画URLを保存しました。');
    } catch (error) {
        // TODO: alertをより良いUI（例: フォーム内のエラーメッセージ）に置き換える
        alert('保存に失敗しました。');
    }
});

postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const content = postContentTextarea.value.trim();
    if (!user || !content) return;
    try {
        await addDoc(collection(db, `fanclubs/${user.uid}/posts`), { content, createdAt: serverTimestamp() });
        // TODO: alertをより良いUI（例: 通知メッセージ）に置き換える
        alert('投稿しました。');
        postContentTextarea.value = '';
        updateManagementPanel(user.uid);
    } catch (error) {
        // TODO: alertをより良いUI（例: フォーム内のエラーメッセージ）に置き換える
        alert('投稿に失敗しました。');
    }
});

styleEditorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const styles = {
        public: { bgColor: document.getElementById('public-bg-color').value, textColor: document.getElementById('public-text-color').value, bgImage: document.getElementById('public-bg-image').value },
        member: { bgColor: document.getElementById('member-bg-color').value, textColor: document.getElementById('member-text-color').value, bgImage: document.getElementById('member-bg-image').value }
    };
    try {
        await updateDoc(doc(db, "fanclubs", user.uid), { styles });
        // TODO: alertをより良いUI（例: 通知メッセージ）に置き換える
        alert('デザインを保存しました。');
    } catch (error) {
        // TODO: alertをより良いUI（例: フォーム内のエラーメッセージ）に置き換える
        alert('保存に失敗しました。');
    }
});

saveLayoutButton.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    const getOrder = c => [...c.children].map(i => i.dataset.blockId);
    const layout = { public: getOrder(publicLayoutEditor), member: getOrder(memberLayoutEditor) };
    try {
        await updateDoc(doc(db, "fanclubs", user.uid), { layout });
        // TODO: alertをより良いUI（例: 通知メッセージ）に置き換える
        alert('レイアウトを保存しました。');
    } catch (error) {
        // TODO: alertをより良いUI（例: フォーム内のエラーメッセージ）に置き換える
        alert('保存に失敗しました。');
    }
});

embedTypeRadios.forEach(radio => radio.addEventListener('change', generateEmbedCode));
logoutButton.addEventListener('click', () => { signOut(auth); });
