// NextAuthおよび認証オプション型をインポート
import NextAuth, { AuthOptions } from 'next-auth';
// Credentials（メール・パスワード）プロバイダーをインポート
import CredentialsProvider from 'next-auth/providers/credentials';
// Google OAuthプロバイダーをインポート
import GoogleProvider from 'next-auth/providers/google';
// Prismaアダプターをインポート
import { PrismaAdapter } from '@auth/prisma-adapter';
// PrismaClientインスタンスをインポート
import { prisma } from '@/lib/prisma';
// パスワード比較用ライブラリbcryptjsをインポート
import bcrypt from 'bcryptjs';
// 新規登録の許可・不許可判定ロジックをインポート（Googleサインインにも適用するため）
import { isNewUserRegistrationAllowed } from '@/lib/registrationConfig';

// NextAuth設定オプションを定義してエクスポート
export const authOptions: AuthOptions = {
  // Prismaデータベースアダプターを指定（型調整）
  adapter: PrismaAdapter(prisma) as any,
  // 認証プロバイダー一覧を設定
  providers: [
    // メールアドレス・パスワード認証プロバイダー
    CredentialsProvider({
      // プロバイダー名
      name: 'Credentials',
      // 入力資格情報の定義
      credentials: {
        // メールアドレス項目
        email: { label: 'メールアドレス', type: 'email' },
        // パスワード項目
        password: { label: 'パスワード', type: 'password' },
      },
      // 認証処理ハンドラー関数
      async authorize(credentials) {
        // 資格情報の存在チェック
        if (!credentials?.email || !credentials?.password) {
          // 入力不十分の場合はエラーを投げる
          throw new Error('メールアドレスとパスワードを入力してください');
        }

        // 該当メールアドレスのユーザーをDB検索
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        // ユーザー未存在またはパスワード未設定（OAuth専用アカウント）の場合
        if (!user || !user.password) {
          // 認証失敗エラーを投げる
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }

        // 入力パスワードとDBのハッシュ化パスワードを照合
        const isValid = await bcrypt.compare(credentials.password, user.password);

        // パスワード不一致の場合
        if (!isValid) {
          // 認証失敗エラーを投げる
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }

        // 認証成功時はユーザーオブジェクトを返却
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    // Google OAuth認証プロバイダー
    GoogleProvider({
      // クライアントID（環境変数より取得）
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      // クライアントシークレット（環境変数より取得）
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  // セッション戦略（JWTを使用）
  session: {
    strategy: 'jwt',
  },
  // カスタムページ設定
  pages: {
    // ログインページURL
    signIn: '/login',
  },
  // コールバック関数群
  callbacks: {
    // サインイン実行直前に呼ばれる許可判定コールバック
    // Googleプロバイダー経由で「新規ユーザーが作られようとしている」場合のみ
    // ALLOW_NEW_USER_REGISTRATION を参照して許可・拒否を判定する。
    // （Credentials認証の新規登録は /api/register 側で判定済みのため、ここでは対象外）
    async signIn({ user, account }) {
      // Googleプロバイダー経由のサインインかどうかを判定
      if (account?.provider === 'google') {
        // メールアドレスが取得できない場合は安全側に倒して拒否
        if (!user.email) {
          return false;
        }

        // 同じメールアドレスの既存ユーザーがDBに存在するか確認
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        });

        // 既存ユーザーが存在しない場合＝これは新規登録（サインアップ）にあたる
        if (!existingUser) {
          // 新規登録が停止中の場合はサインインを拒否する
          // （false を返すと NextAuth が signIn ページへ ?error=AccessDenied 付きでリダイレクトする）
          if (!isNewUserRegistrationAllowed()) {
            return false;
          }
        }
      }

      // 上記以外（Credentials認証、または既存ユーザーのGoogle再ログイン）は許可
      return true;
    },
    // JWTトークン作成・更新時コールバック
    async jwt({ token, user }) {
      // ユーザー情報が存在する場合はIDをトークンに付与
      if (user) {
        token.id = user.id;
      }
      // トークンを返却
      return token;
    },
    // セッション取得時コールバック
    async session({ session, token }) {
      // セッションのユーザーオブジェクトが存在する場合
      if (session.user) {
        // セッションユーザーIDにトークンIDを設定
        (session.user as any).id = token.id;
      }
      // セッションを返却
      return session;
    },
  },
  // 開発環境時のデバッグ設定
  debug: process.env.NODE_ENV === 'development',
  // セッション用シークレットキー
  secret: process.env.NEXTAUTH_SECRET || 'turtle-trading-secret-key-260809',
};

// NextAuthハンドラーを作成
const handler = NextAuth(authOptions);

// GETリクエストをエクスポート
export { handler as GET, handler as POST };
