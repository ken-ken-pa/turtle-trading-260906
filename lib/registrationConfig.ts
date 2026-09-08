// 新規ユーザー登録の許可・不許可を判定する設定モジュール
//
// 環境変数 ALLOW_NEW_USER_REGISTRATION でON/OFFを切り替える。
// 未設定の場合はデフォルトで「許可」（既存の挙動を維持）。
// 'false' / '0' / 'no' / 'off'（大文字小文字問わず）のいずれかを設定すると新規登録を停止する。
//
// .env（デプロイ環境の環境変数）を変更するだけでコードの変更・再デプロイ無しに切り替え可能。
// サーバーサイド専用の環境変数のためNEXT_PUBLIC_プレフィックスは付けず、クライアント側へは
// 都度 GET /api/register を介して現在の状態を渡す（ビルド時に値が固定化されるのを防ぐため）。

/**
 * 新規ユーザー登録が現在許可されているかどうかを返す
 */
export function isNewUserRegistrationAllowed(): boolean {
  // 環境変数を取得（未設定時は許可扱いのデフォルト文字列を使用）
  const raw = (process.env.ALLOW_NEW_USER_REGISTRATION ?? 'true').trim().toLowerCase();
  // 明示的に無効を示す値の場合のみ不許可とする
  const disabledValues = ['false', '0', 'no', 'off'];
  return !disabledValues.includes(raw);
}

// 新規登録停止時にユーザーへ表示する共通メッセージ
export const NEW_USER_REGISTRATION_DISABLED_MESSAGE = '現在、新規ユーザー登録は停止しています。';
