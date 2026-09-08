// Next.jsレスポンスヘルパーをインポート
import { NextResponse } from 'next/server';
// PrismaClientインスタンスをインポート
import { prisma } from '@/lib/prisma';
// bcryptjsハッシュ化ライブラリをインポート
import bcrypt from 'bcryptjs';
// 新規登録の許可・不許可判定ロジックをインポート
import { isNewUserRegistrationAllowed, NEW_USER_REGISTRATION_DISABLED_MESSAGE } from '@/lib/registrationConfig';

// GET: 新規ユーザー登録が現在許可されているかどうかをクライアントへ返却
// （ログイン画面・登録画面がボタン/フォームの表示可否を判定するために使用する）
export async function GET() {
  return NextResponse.json({ allowed: isNewUserRegistrationAllowed() });
}

// POST: 新規ユーザー作成APIハンドラー
export async function POST(request: Request) {
  // 例外処理ブロックを開始
  try {
    // 新規登録が停止されている場合は403エラーを返却（フォーム直叩き等への対策）
    if (!isNewUserRegistrationAllowed()) {
      return NextResponse.json({ error: NEW_USER_REGISTRATION_DISABLED_MESSAGE }, { status: 403 });
    }

    // リクエストボディをJSONパース
    const body = await request.json();
    // 名前・メール・パスワードを取得
    const { name, email, password } = body;

    // メールアドレスとパスワードの必須入力を検証
    if (!email || !password) {
      // 400エラーレスポンスを返却
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      );
    }

    // パスワードの最低文字数（6文字）を検証
    if (password.length < 6) {
      // 400エラーレスポンスを返却
      return NextResponse.json(
        { error: 'パスワードは6文字以上で設定してください' },
        { status: 400 }
      );
    }

    // 小文字化されたメールアドレスで既存ユーザーを検索
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // ユーザーが既に存在する場合
    if (existingUser) {
      // 400エラーレスポンスを返却
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // パスワードをbcryptでハッシュ化（ソルト10）
    const hashedPassword = await bcrypt.hash(password, 10);

    // データベースに新規ユーザーレコードおよび初期設定を作成
    const user = await prisma.user.create({
      // ユーザー登録データ
      data: {
        name: name || '',
        email: email.toLowerCase(),
        password: hashedPassword,
        // デフォルトのユーザー表示設定を同時作成
        userSetting: {
          create: {
            splitCount: 1,
            symbolCount: 1,
            period: '6mo',
            interval: '1d',
            symbols: ['8035.T'],
          },
        },
      },
    });

    // 成功レスポンス（パスワードを除外）を返却
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  // 例外捕捉ブロック
  } catch (error: any) {
    // ログ出力
    console.error('Registration error:', error);
    // 500エラーレスポンスを返却
    return NextResponse.json(
      { error: 'アカウントの作成に失敗しました' },
      { status: 500 }
    );
  }
}
