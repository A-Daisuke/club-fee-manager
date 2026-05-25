/**
 * HTML特殊文字をエスケープする。
 * Firebaseのデータは全員で共有されるため、悪意ある入力によるXSSを防ぐために使用する。
 * @param {*} str
 * @returns {string}
 */
export function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * 改行区切りの名前文字列を配列に変換する。
 * names フィールドは "\n" 区切りで複数の名前を1つの文字列として保存している。
 * @param {string} names
 * @returns {string[]}
 */
export function getNameList(names) {
    return names.split('\n').filter(name => name.trim() !== '');
}

/**
 * 現在の月のキー文字列（例: "2025-11"）を返す。
 * padStart で桁を揃えることで、文字列ソートが日付順と一致するようにしている。
 * @returns {string}
 */
export function getCurrentMonthKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}
