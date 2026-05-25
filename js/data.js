import { state } from './state.js';
import { getCurrentMonthKey } from './utils.js';

/**
 * localStorageからバックアップデータを読み込む。
 * Firebase接続前に前回のデータを表示するためのフォールバックとして使う。
 */
export function loadFromLocalStorage() {
    const saved = localStorage.getItem('club-fee-data-monthly');
    if (saved) state.allData = JSON.parse(saved);
}

/**
 * 指定した月のデータを state.items / state.expenses にセットする。
 * データがない月（新規）は直前月の項目構造を引き継ぎ、名前だけリセットする。
 * @param {string} monthKey - "YYYY-MM" 形式
 */
export function loadMonthData(monthKey) {
    state.currentMonth = monthKey;

    if (state.allData[monthKey]) {
        const monthData = state.allData[monthKey];
        if (monthData.items) {
            state.items = monthData.items;
            state.expenses = monthData.expenses || [];
        } else {
            // リファクタリング前の旧データ形式（items/expensesの階層がない）との互換性維持
            state.items = monthData;
            state.expenses = [];
        }
        return;
    }

    // 新しい月：直前月の項目名・金額を引き継ぐことで毎月の初期設定を省力化する
    const keys = Object.keys(state.allData).sort().reverse();
    const lastMonthKey = keys[0];

    if (lastMonthKey) {
        const lastMonthData = state.allData[lastMonthKey];
        const sourceItems = lastMonthData.items || lastMonthData;
        // 参照ではなくディープコピーすることで前月データへの意図しない書き換えを防ぐ
        state.items = JSON.parse(JSON.stringify(sourceItems)).map(item => ({ ...item, names: '' }));
        state.expenses = [];
    } else {
        // アプリ初回起動時のサンプルデータ
        state.items = [
            { id: Date.now(),     label: '項目 1', price: '500',  names: '' },
            { id: Date.now() - 1, label: '項目 2', price: '800',  names: '' },
            { id: Date.now() - 2, label: '項目 3', price: '1000', names: '' },
        ];
        state.expenses = [];
    }

    state.allData[monthKey] = { items: state.items, expenses: state.expenses };
}

/**
 * 月セレクターに表示する月の一覧を返す。
 * 今月のデータがまだ存在しない場合でも選択肢の先頭に追加する。
 * @returns {string[]} "YYYY-MM" 形式の配列（降順）
 */
export function getAvailableMonths() {
    const keys = Object.keys(state.allData).sort().reverse();
    const thisMonth = getCurrentMonthKey();
    if (!keys.includes(thisMonth)) keys.unshift(thisMonth);
    return keys;
}

/**
 * 現在表示中の月の収入・支出の集計を計算する。
 * @returns {{ stats: Array, totalAmount: number, totalExpenses: number }}
 */
export function calculateStats() {
    let totalAmount = 0;

    const stats = state.items.map(item => {
        const price = parseFloat(item.price) || 0;
        const count = item.names.split('\n').filter(n => n.trim() !== '').length;
        const subtotal = price * count;
        totalAmount += subtotal;
        return { price, count, subtotal };
    });

    const totalExpenses = state.expenses.reduce(
        (sum, e) => sum + (parseFloat(e.amount) || 0), 0
    );

    return { stats, totalAmount, totalExpenses };
}
