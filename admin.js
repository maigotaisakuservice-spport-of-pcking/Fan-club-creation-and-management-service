// admin.js
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    doc, getDoc, collection, getDocs, query, orderBy,
    updateDoc, writeBatch, deleteDoc, deleteField
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const adminPage = document.getElementById('admin-page');
const loadingOrError = document.getElementById('loading-or-error');
const userListTbody = document.getElementById('user-list-tbody');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists() && userDocSnap.data().level === 'admin') {
                loadingOrError.style.display = 'none';
                adminPage.style.display = 'block';
                await loadAllUsers();
            } else {
                showError("このページへのアクセス権限がありません。");
            }
        } catch (error) {
            console.error("Error checking admin status:", error);
            showError("権限の確認中にエラーが発生しました。");
        }
    } else {
        showError("管理者としてログインしてください。");
    }
});

async function loadAllUsers() {
    try {
        const usersCollectionRef = collection(db, "users");
        const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        userListTbody.innerHTML = '';

        for (const userDoc of querySnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;

            const isUserBanned = userData.ban && userData.ban.isBanned && new Date(userData.ban.expires) >= new Date();
            let rowClass = isUserBanned ? 'banned' : '';

            let userBanBtn = isUserBanned
                ? `<button class="unban-user-btn" data-uid="${userId}">Unban User</button>`
                : `<button class="ban-user-btn" data-uid="${userId}">Ban User</button>`;

            let actionsHtml = userBanBtn;

            if (userData.role === 'creator') {
                const clubDocRef = doc(db, "fanclubs", userId);
                const clubDocSnap = await getDoc(clubDocRef);
                let clubBanBtn = '';

                if (clubDocSnap.exists()) {
                    const clubData = clubDocSnap.data();
                    const isClubBanned = clubData.ban && clubData.ban.isBanned && new Date(clubData.ban.expires) >= new Date();
                    if(isClubBanned) rowClass = 'banned'; // クラブがBANされていても行をハイライト

                    clubBanBtn = isClubBanned
                        ? `<button class="unban-club-btn" data-uid="${userId}">Unban Club</button>`
                        : `<button class="ban-club-btn" data-uid="${userId}">Ban Club</button>`;
                }

                actionsHtml += clubBanBtn;
                actionsHtml += `<button class="delete-club-btn" data-uid="${userId}">Delete Club</button>`;
            }

            const row = `<tr class="${rowClass}">
                            <td>${userData.email}</td>
                            <td>${userData.role}</td>
                            <td>${userId}</td>
                            <td>${actionsHtml}</td>
                        </tr>`;
            userListTbody.innerHTML += row;
        }
    } catch (error) {
        console.error("Error loading users:", error);
        userListTbody.innerHTML = '<tr><td colspan="4">ユーザーの読み込みに失敗しました。</td></tr>';
    }
}

function showError(message) {
    loadingOrError.innerHTML = `<p style="color: red;">${message}</p><a href="index.html">トップページに戻る</a>`;
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 3000);
}

// --- Admin Actions ---

async function handleBan(userId, type) {
    const reason = prompt(`この${type}をBANする理由を入力してください:`);
    if (!reason) return alert("理由が入力されなかったため、処理をキャンセルしました。");

    const expires = prompt("BANの期限を YYYY-MM-DD 形式で入力してください:", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    if (!expires || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return alert("日付の形式が正しくないため、処理をキャンセルしました。");

    const banData = {
        isBanned: true,
        reason: reason,
        expires: expires,
        bannedAt: new Date()
    };

    const docRef = (type === 'user') ? doc(db, "users", userId) : doc(db, "fanclubs", userId);

    try {
        await updateDoc(docRef, { ban: banData });
        alert(`${type}をBANしました。`);
        loadAllUsers();
    } catch (error) {
        alert("BAN処理中にエラーが発生しました。");
        console.error(`Error banning ${type}:`, error);
    }
}

async function handleUnban(userId, type) {
    if (!confirm(`本当にこの${type}のBANを解除しますか？`)) return;

    const docRef = (type === 'user') ? doc(db, "users", userId) : doc(db, "fanclubs", userId);

    try {
        await updateDoc(docRef, { ban: deleteField() });
        alert(`${type}のBANを解除しました。`);
        loadAllUsers();
    } catch (error) {
        alert("BAN解除処理中にエラーが発生しました。");
        console.error(`Error unbanning ${type}:`, error);
    }
}

async function handleDeleteClub(creatorId) {
    if (!confirm("本当にこのファンクラブを削除しますか？\n関連するすべてのデータ（投稿、応募者など）が完全に削除され、元に戻すことはできません。")) return;

    try {
        const clubDocRef = doc(db, "fanclubs", creatorId);

        const subcollections = ['posts', 'applicants'];
        for (const sc of subcollections) {
            const scRef = collection(db, `fanclubs/${creatorId}/${sc}`);
            const scSnapshot = await getDocs(scRef);
            const batch = writeBatch(db);
            scSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        await deleteDoc(clubDocRef);

        alert("ファンクラブを完全に削除しました。");
        loadAllUsers();
    } catch (error) {
        alert("削除処理中にエラーが発生しました。");
        console.error("Error deleting club:", error);
    }
}

userListTbody.addEventListener('click', (e) => {
    const target = e.target;
    const userId = target.dataset.uid;
    if (!userId) return;

    if (target.classList.contains('ban-user-btn')) {
        handleBan(userId, 'user');
    } else if (target.classList.contains('unban-user-btn')) {
        handleUnban(userId, 'user');
    } else if (target.classList.contains('ban-club-btn')) {
        handleBan(userId, 'fanclub');
    } else if (target.classList.contains('unban-club-btn')) {
        handleUnban(userId, 'fanclub');
    } else if (target.classList.contains('delete-club-btn')) {
        handleDeleteClub(userId);
    }
});
