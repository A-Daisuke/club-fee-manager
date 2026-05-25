import { state } from './state.js';

/**
 * Firebase クライアント設定。
 * apiKey はクライアントサイドに公開することが Firebase の設計上の前提であり、
 * セキュリティはAPIキーではなく Realtime Database のセキュリティルールで担保する。
 */
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDyTS3N8CBac4E9iMOVL6YBOWNK8M02p6U",
    authDomain: "club-fee-manager.firebaseapp.com",
    databaseURL: "https://club-fee-manager-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "club-fee-manager",
    storageBucket: "club-fee-manager.firebasestorage.app",
    messagingSenderId: "122953605460",
    appId: "1:122953605460:web:0f7c8153367720276da8c1",
};

let dataRef;
export let isInitialized = false;

/**
 * Firebase を初期化し、データベースの参照を取得する。
 * @returns {boolean} 初期化に成功したかどうか
 */
export function initFirebase() {
    try {
        firebase.initializeApp(FIREBASE_CONFIG);
        dataRef = firebase.database().ref('clubFeeDataMonthly');
        isInitialized = true;
    } catch (error) {
        console.error('Firebase initialization failed:', error);
    }
    return isInitialized;
}

/**
 * Firebase Auth の認証状態変化を監視する。
 * signInAnonymously().then() より確実にauth状態がSDK全体に伝播してからコールバックが呼ばれる。
 * @param {function} callback
 */
export function onAuthStateChanged(callback) {
    firebase.auth().onAuthStateChanged(callback);
}

/**
 * 匿名ログインを試みる。
 * ユーザー操作は不要で、Firebaseがセッション単位のIDを自動発行する。
 * セキュリティルールの "auth != null" を満たし、アプリ外からの直接アクセスを防ぐ。
 * @returns {Promise}
 */
export function signInAnonymously() {
    return firebase.auth().signInAnonymously();
}

/**
 * Firebaseのデータ変更をリアルタイムで監視する。
 * 自分の書き込みも受信するため、isUpdating フラグで自己更新ループを防いでいる（main.js 参照）。
 * @param {function} onData  データ受信時のコールバック
 * @param {function} onError エラー時のコールバック
 */
export function setupFirebaseListener(onData, onError) {
    dataRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) state.allData = data;
        onData();
    }, onError);
}

/**
 * state.allData の内容をFirebaseとlocalStorageに保存する。
 * localStorageはFirebase接続失敗時のフォールバックとして機能する。
 */
export async function saveAllData() {
    if (!isInitialized) {
        localStorage.setItem('club-fee-data-monthly', JSON.stringify(state.allData));
        return;
    }
    try {
        state.isUpdating = true;
        await dataRef.set(state.allData);
        localStorage.setItem('club-fee-data-monthly', JSON.stringify(state.allData));
        // Firebaseリスナーへの反映には若干の遅延があるため、300ms後にフラグを下ろす
        setTimeout(() => { state.isUpdating = false; }, 300);
    } catch (error) {
        console.error('Failed to save data:', error);
        state.isUpdating = false;
        localStorage.setItem('club-fee-data-monthly', JSON.stringify(state.allData));
    }
}

/**
 * 現在の月のデータを state.allData に反映し、1秒後に保存する（デバウンス）。
 * 連続入力中に毎回Firebaseへ書き込まないよう遅延させている。
 */
export function saveData() {
    state.allData[state.currentMonth] = {
        items: state.items,
        expenses: state.expenses,
    };
    clearTimeout(state.saveTimeout);
    state.saveTimeout = setTimeout(saveAllData, 1000);
}
