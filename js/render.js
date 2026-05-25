import { state } from './state.js';
import { escapeHtml, getNameList, getCurrentMonthKey } from './utils.js';
import { calculateStats, getAvailableMonths } from './data.js';

/**
 * 現在の月が編集可能かどうかを返す。
 * 今月は常に編集可能。過去の月は isEditingPast が true の時のみ編集可能。
 * @returns {boolean}
 */
function isEditable() {
    return state.currentMonth === getCurrentMonthKey() || state.isEditingPast;
}

/**
 * ローディング画面をフェードアウトさせてアプリを表示する。
 */
export function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        app.style.display = 'block';
    }, 500);
}

/**
 * 月セレクターの選択肢を再描画する。
 * 月の切り替えやFirebaseからのデータ受信後に呼ぶ。
 */
export function renderMonthSelector() {
    const selector = document.getElementById('month-selector');
    selector.innerHTML = getAvailableMonths().map(key => `
        <option value="${key}" ${key === state.currentMonth ? 'selected' : ''}>${key}</option>
    `).join('');
}

/**
 * 「過去の記録を編集」ボタンの表示状態とスタイルを更新する。
 * 今月を表示中は非表示、過去月を表示中はモードに応じて色とテキストを切り替える。
 */
export function updateEditButton() {
    const btn = document.getElementById('edit-mode-button');
    const isThisMonth = state.currentMonth === getCurrentMonthKey();

    if (isThisMonth) {
        btn.classList.add('hidden');
        return;
    }

    btn.classList.remove('hidden');
    if (state.isEditingPast) {
        btn.textContent = '編集を完了';
        btn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
        btn.classList.add('bg-green-500', 'hover:bg-green-600');
    } else {
        btn.textContent = '過去の記録を編集';
        btn.classList.remove('bg-green-500', 'hover:bg-green-600');
        btn.classList.add('bg-yellow-500', 'hover:bg-yellow-600');
    }
}

/**
 * 各収入カードの人数・小計と、画面下部の合計セクションを再計算して更新する。
 * renderCards() を呼ばず数値だけ更新したい場合（金額入力中など）に単体で使う。
 */
export function updateStats() {
    const { stats, totalAmount, totalExpenses } = calculateStats();

    state.items.forEach((item, i) => {
        const countEl = document.getElementById(`count-${item.id}`);
        const subtotalEl = document.getElementById(`subtotal-${item.id}`);
        if (countEl) countEl.textContent = `${stats[i].count}人`;
        if (subtotalEl) subtotalEl.textContent = `${stats[i].subtotal.toLocaleString()}円`;
    });

    document.getElementById('stats-list').innerHTML = state.items.map((item, i) => `
        <div class="flex justify-between items-center py-2 border-b border-gray-200">
            <span class="text-gray-700">${escapeHtml(item.label || '未設定')} (${item.price || 0}円):</span>
            <span class="font-bold text-indigo-700">${stats[i].count}人</span>
        </div>
    `).join('');

    document.getElementById('total-income').textContent = `${totalAmount.toLocaleString()}円`;
    document.getElementById('total-expenses').textContent = `-${totalExpenses.toLocaleString()}円`;
}

/**
 * 収入カード一覧を再描画する。
 * ボタンには data-action / data-id 属性を付与し、main.js のイベント委譲で処理する。
 * 末尾で updateStats() を呼び、カード内の人数・小計を即時反映する。
 */
export function renderCards() {
    const container = document.getElementById('items-container');
    const editable = isEditable();

    if (!state.items || state.items.length === 0) {
        container.innerHTML = `
            <div class="col-span-1 md:col-span-3 text-center text-gray-500 py-8">
                データがありません。「項目を追加」ボタンから最初の項目を作成してください。
            </div>`;
        updateStats();
        document.getElementById('add-item-button-container').classList.toggle('hidden', !editable);
        return;
    }

    container.innerHTML = state.items.map(item => {
        const nameList = getNameList(item.names);
        return `
            <div class="bg-white rounded-lg shadow-lg p-6 relative">
                <div class="absolute top-2 right-2 ${!editable ? 'hidden' : ''}">
                    <button data-action="toggleMenu" data-id="${item.id}"
                        class="text-gray-500 hover:text-indigo-700 p-2 rounded-full focus:outline-none">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                        </svg>
                    </button>
                    <div id="menu-${item.id}" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden">
                        <button data-action="renameItem" data-id="${item.id}"
                            class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50">
                            項目名を変更
                        </button>
                        <button data-action="deleteItem" data-id="${item.id}"
                            class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                            項目を削除
                        </button>
                    </div>
                </div>

                <div class="mb-4">
                    <h2 class="font-bold text-xl text-indigo-900 mb-3 pr-8">${escapeHtml(item.label)}</h2>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">金額</label>
                    <div class="flex items-center gap-2">
                        <input type="number" value="${item.price}"
                            data-action="updatePrice" data-id="${item.id}"
                            placeholder="金額"
                            class="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500"
                            ${!editable ? 'disabled' : ''} />
                        <span class="text-gray-700 font-medium">円</span>
                    </div>
                </div>

                <div class="mb-4">
                    <label class="block text-sm font-semibold text-gray-700 mb-2">支払った人を追加</label>
                    <div class="flex gap-2 mb-3">
                        <input type="text" id="input-${item.id}" placeholder="名前を入力"
                            data-action="addPersonOnEnter" data-id="${item.id}"
                            class="flex-1 min-w-0 px-4 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500"
                            ${!editable ? 'disabled' : ''} />
                        <button data-action="addPerson" data-id="${item.id}"
                            class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition transform active:scale-95 ${!editable ? 'opacity-50 cursor-not-allowed' : ''}"
                            ${!editable ? 'disabled' : ''}>
                            追加
                        </button>
                    </div>

                    <label class="block text-sm font-semibold text-gray-700 mb-2">支払済みリスト</label>
                    <div class="bg-indigo-50 rounded-lg p-3 border-2 border-indigo-100 min-h-[100px] max-h-[200px] overflow-y-auto">
                        <div class="space-y-1">
                            ${nameList.length > 0
                                ? nameList.map((name, idx) => `
                                    <div class="flex justify-between items-center bg-white px-3 py-1 rounded shadow-sm">
                                        <span class="text-indigo-900">${escapeHtml(name)}</span>
                                        ${editable ? `
                                            <button data-action="removePerson" data-id="${item.id}" data-idx="${idx}"
                                                class="text-red-400 hover:text-red-600 p-1">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        ` : ''}
                                    </div>
                                `).join('')
                                : '<p class="text-gray-400 text-sm text-center py-4">まだ誰も追加されていません</p>'
                            }
                        </div>
                    </div>
                </div>

                <div class="mt-4 pt-4 border-t-2 border-indigo-100">
                    <p class="text-sm text-gray-600">人数: <span class="font-bold text-indigo-700" id="count-${item.id}">0人</span></p>
                    <p class="text-sm text-gray-600">小計: <span class="font-bold text-indigo-700" id="subtotal-${item.id}">0円</span></p>
                </div>
            </div>
        `;
    }).join('');

    updateStats();
    document.getElementById('add-item-button-container').classList.toggle('hidden', !editable);
}

/**
 * 支出リストを再描画する。
 * 編集不可の場合は入力欄を disabled にし、追加ボタンも非表示にする。
 */
export function renderExpenses() {
    const list = document.getElementById('expenses-list');
    const editable = isEditable();

    if (state.expenses.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-500 py-4">支出項目がありません</p>';
    } else {
        list.innerHTML = state.expenses.map(expense => `
            <div class="flex items-center gap-2 bg-white p-1 rounded-lg">
                <input type="text" value="${escapeHtml(expense.title)}"
                    data-action="updateExpenseTitle" data-id="${expense.id}"
                    placeholder="項目名"
                    class="flex-1 px-3 py-2 text-sm border-2 border-red-200 rounded-lg focus:outline-none focus:border-red-400 min-w-0"
                    ${!editable ? 'disabled' : ''} />
                <input type="number" value="${expense.amount}"
                    data-action="updateExpenseAmount" data-id="${expense.id}"
                    placeholder="金額"
                    class="w-20 px-3 py-2 text-sm border-2 border-red-200 rounded-lg focus:outline-none focus:border-red-400"
                    ${!editable ? 'disabled' : ''} />
                <span class="text-gray-700 text-sm font-medium">円</span>
                ${editable ? `
                    <button data-action="deleteExpense" data-id="${expense.id}"
                        class="text-red-500 hover:text-red-700 transition p-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                ` : ''}
            </div>
        `).join('');
    }

    const addBtn = document.getElementById('add-expense-button-container');
    if (addBtn) addBtn.style.display = editable ? 'block' : 'none';
}
