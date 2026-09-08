// クライアントサイドコンポーネントとして宣言
'use client';

// 新規登録フォームコンポーネントをインポート
import RegisterForm from '@/components/auth/RegisterForm';

/******************************************************************
 新規ユーザー登録ページコンポーネント
 RegisterFormコンポーネントを配置してアカウント作成画面を提供します
 ******************************************************************/
export default function RegisterPage() {
  // 新規登録フォームをレンダリングして返却
  return <RegisterForm />;
}
