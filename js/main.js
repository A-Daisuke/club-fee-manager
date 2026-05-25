import { state } from './state.js';
import { getCurrentMonthKey, getNameList } from './utils.js';
import {
    initFirebase, isInitialized,
    onAuthStateChanged, signInAnonymously,
    setupFirebaseListener, saveData,
} from './firebase.js';
import { loadFromLocalStorage, loadMonthData } from './data.js';
import {
    hideLoadingScreen, renderMonthSelector, updateEditButton,
    renderCards, renderExpenses, updateStats,
} from './render.js';

// =============================================================================
// 収入項目の操作
// =============================================================================

function addItem() {
    state.items.push({
        id: Date.now(),
        label: `項目 ${state.items.length + 1}`,
        price: '',
        names: '',
    });
    saveData();
    renderCards();
}

function renameItem(itemId) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    closeAllMenus();
    const newLabel = prompt('新しい項目名を入力してください:', item.label);
    if (newLabel?.trim()) {
        item.label = newLabel.trim();
        saveData();
        renderCards();
    }
}

function deleteItem(itemId) {
    closeAllMenus();
    if (!confirm('この項目を削除してもよろしいですか？（名簿も削除されます）')) return;
    state.items = state.items.filter(i => i.id !== itemId);
    saveData();
    renderCards();
}

function updatePrice(itemId, value) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    item.price = value;
    saveData();
    // renderCards は重いので、金額入力中は合計欄だけを更新する
    updateStats();
}

function addPerson(itemId) {
    const input = document.getElementById(`input-${itemId}`);
    const name = input?.value.trim();
    if (!name) return;
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    const nameList = getNameList(item.names);
    nameList.push(name);
    item.names = nameList.join('\n');
    input.value = '';
    saveData();
    renderCards();
}

function removePerson(itemId, nameIdx) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    const nameList = getNameList(item.names);
    nameList.splice(nameIdx, 1);
    item.names = nameList.join('\n');
    saveData();
    renderCards();
}

// =============================================================================
// 支出の操作
// =============================================================================

function addExpense() {
    state.expenses.push({ id: Date.now(), title: '', amount: '' });
    saveData();
    renderExpenses();
}

function updateExpenseTitle(expenseId, value) {
    const expense = state.expenses.find(e => e.id === expenseId);
    if (!expense) return;
    expense.title = value;
    saveData();
}

function updateExpenseAmount(expenseId, value) {
    const expense = state.expenses.find(e => e.id === expenseId);
    if (!expense) return;
    expense.amount = value;
    saveData();
    updateStats();
}

function deleteExpense(expenseId) {
    if (!confirm('この支出を削除してもよろしいですか？')) return;
    state.expenses = state.expenses.filter(e => e.id !== expenseId);
    saveData();
    renderExpenses();
    updateStats();
}

// =============================================================================
// 月の切り替え・編集モード
// =============================================================================

function changeMonth(monthKey) {
    // 月を切り替えたら編集モードは必ずリセットする
    state.isEditingPast = false;
    loadMonthData(monthKey);
    renderMonthSelector();
    renderCards();
    renderExpenses();
    updateEditButton();
}

function toggleEditMode() {
    state.isEditingPast = !state.isEditingPast;
    renderCards();
    renderExpenses();
    updateEditButton();
}

// =============================================================================
// ドロップダウンメニュー
// =============================================================================

function closeAllMenus() {
    document.querySelectorAll('div[id^="menu-"]:not(.hidden)').forEach(m => m.classList.add('hidden'));
}

/**
 * 指定カードの「...」メニューを開閉する。
 * 一度全メニューを閉じてから対象メニューを開くことで、複数メニューが同時に開くのを防ぐ。
 */
function toggleMenu(itemId) {
    const menu = document.getElementById(`menu-${itemId}`);
    if (!menu) return;
    const wasHidden = menu.classList.contains('hidden');
    closeAllMenus();
    if (wasHidden) menu.classList.remove('hidden');
}

// =============================================================================
// イベントリスナーの設定
// =============================================================================

/**
 * 各UIコンポーネントにイベントリスナーを登録する。
 * 動的に生成される収入カード・支出リスト内のボタンは、親要素への委譲で処理する。
 * ボタンの種別は data-action 属性で、対象データのIDは data-id 属性で受け渡す。
 */
function setupEventListeners() {
    document.getElementById('month-selector')
        .addEventListener('change', e => changeMonth(e.target.value));

    document.getElementById('edit-mode-button')
        .addEventListener('click', toggleEditMode);

    document.getElementById('add-item-button-container')
        .addEventListener('click', addItem);

    document.getElementById('add-expense-button-container')
        .addEventListener('click', addExpense);

    // 収入カードコンテナへの委譲（クリック）
    document.getElementById('items-container').addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) { closeAllMenus(); return; }
        const id = parseInt(btn.dataset.id);
        const idx = parseInt(btn.dataset.idx);
        switch (btn.dataset.action) {
            case 'toggleMenu':   toggleMenu(id); break;
            case 'renameItem':   renameItem(id); break;
            case 'deleteItem':   deleteItem(id); break;
            case 'addPerson':    addPerson(id);  break;
            case 'removePerson': removePerson(id, idx); break;
        }
    });

    // 収入カードコンテナへの委譲（入力）
    document.getElementById('items-container').addEventListener('input', e => {
        const el = e.target.closest('[data-action="updatePrice"]');
        if (el) updatePrice(parseInt(el.dataset.id), el.value);
    });

    // Enterキーで名前を追加
    document.getElementById('items-container').addEventListener('keypress', e => {
        const el = e.target.closest('[data-action="addPersonOnEnter"]');
        if (el && e.key === 'Enter') addPerson(parseInt(el.dataset.id));
    });

    // 支出コンテナへの委譲（クリック）
    document.getElementById('expenses-container').addEventListener('click', e => {
        const btn = e.target.closest('[data-action="deleteExpense"]');
        if (btn) deleteExpense(parseInt(btn.dataset.id));
    });

    // 支出コンテナへの委譲（入力）
    document.getElementById('expenses-container').addEventListener('input', e => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        const id = parseInt(el.dataset.id);
        if (el.dataset.action === 'updateExpenseTitle')  updateExpenseTitle(id, el.value);
        if (el.dataset.action === 'updateExpenseAmount') updateExpenseAmount(id, el.value);
    });

    // メニュー外クリックで全メニューを閉じる
    document.addEventListener('click', e => {
        if (!e.target.closest('[data-action="toggleMenu"]')) closeAllMenus();
    });
}

// =============================================================================
// 初期化
// =============================================================================

function initialize() {
    loadFromLocalStorage();
    state.currentMonth = getCurrentMonthKey();
    renderMonthSelector();
    setupEventListeners();
    updateEditButton();

    if (isInitialized) {
        setupFirebaseListener(
            () => {
                if (!state.initialLoadComplete) {
                    // 初回受信：ローディングを隠してアプリを表示する
                    state.initialLoadComplete = true;
                    loadMonthData(state.currentMonth);
                    renderMonthSelector();
                    renderCards();
                    renderExpenses();
                    hideLoadingScreen();
                } else if (!state.isUpdating) {
                    // 他のユーザーによる更新：自分の書き込みによる受信は isUpdating で除外する
                    loadMonthData(state.currentMonth);
                    renderMonthSelector();
                    renderCards();
                    renderExpenses();
                }
            },
            (error) => {
                console.error('Firebase read error:', error);
                hideLoadingScreen();
                alert('データの読み込みに失敗しました。ローカルデータで起動します。');
            }
        );
    } else {
        loadMonthData(state.currentMonth);
        renderCards();
        renderExpenses();
        hideLoadingScreen();
    }
}

// =============================================================================
// 起動
// =============================================================================

/**
 * onAuthStateChanged は複数回発火する可能性があるため、
 * initialize() が重複して呼ばれないようにフラグで制御する。
 */
let appStarted = false;

initFirebase();

onAuthStateChanged((user) => {
    if (user && !appStarted) {
        appStarted = true;
        initialize();
    } else if (!user) {
        // 未認証の場合は匿名ログインを試みる。
        // 失敗してもローカルモードで起動することでオフライン時でも使えるようにする。
        signInAnonymously().catch((error) => {
            console.error('匿名ログイン失敗:', error);
            if (!appStarted) {
                appStarted = true;
                initialize();
            }
        });
    }
});
