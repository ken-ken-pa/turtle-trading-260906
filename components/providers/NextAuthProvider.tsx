// クライアントコンポーネントとして指定
'use client';

// NextAuthからSessionProviderをインポート
import { SessionProvider } from 'next-auth/react';
// ReactからReactNode型をインポート
import { ReactNode } from 'react';

// プロバイダーのProps型定義
interface Props {
  // 子要素（コンポーネントツリー）を受け取る
  children: ReactNode;
}

// NextAuthセッションプロバイダーコンポーネントを定義してエクスポート
export default function NextAuthProvider({ children }: Props) {
  // 子要素をSessionProviderでラップして返却
  return <SessionProvider>{children}</SessionProvider>;
}
