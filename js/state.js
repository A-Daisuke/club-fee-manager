/**
 * アプリ全体で共有する状態オブジェクト。
 * ES モジュールのライブバインディングにより、どのモジュールから変更しても他のモジュールに即時反映される。
 */
export const state = {
    /** Firebaseから取得した全月のデータ。キーは "YYYY-MM" 形式。 */
    allData: {},
    /** 現在表示中の月の収入項目リスト。 */
    items: [],
    /** 現在表示中の月の支出リスト。 */
    expenses: [],
    /** 現在表示中の月のキー（例: "2025-11"）。 */
    currentMonth: '',
    /** 過去の月を編集モードで開いているかどうか。 */
    isEditingPast: false,
    /**
     * 自分がFirebaseへの書き込み中かどうかを示すフラグ。
     * 自分の書き込みをFirebaseリスナーで受信して画面が再描画されるのを防ぐために使う。
     */
    isUpdating: false,
    /** saveData のデバウンス用タイマーID。 */
    saveTimeout: null,
    /** Firebaseからの初回データ読み込みが完了したかどうか。 */
    initialLoadComplete: false,
};
