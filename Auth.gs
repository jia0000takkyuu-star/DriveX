/**
 * ==========================================================
 * DriveX - Auth.gs
 * 認証・セッション管理
 * Version : 1.0.1
 * ==========================================================
 */

/**
 * ログイン
 */
function login(
  userId,
  password
) {

  userId =
    toText(userId);

  password =
    toText(password);

  if (
    isEmpty(userId) ||
    isEmpty(password)
  ) {

    return failure(
      "IDまたはパスワードが入力されていません。"
    );

  }

  const user =
    getUser(
      userId
    );

  if (
    !user
  ) {

    return failure(
      DRIVEX.MESSAGE.LOGIN_FAILED
    );

  }

  if (
    user.password !== password
  ) {

    return failure(
      DRIVEX.MESSAGE.LOGIN_FAILED
    );

  }

  if (
    user.status !==
    DRIVEX.USER.STATUS.ACTIVE
  ) {

    return failure(
      "このユーザーは無効です。"
    );

  }

  const session =
    createSession(
      user
    );

  // ★ ログイン成功時にユーザー用フォルダを自動作成（DriveX/Users 配下）
  try {
    ensureUserFolder(user.userId);
  } catch (e) {
    Logger.log("フォルダ自動作成エラー: " + e.message);
  }

  return success(
    DRIVEX.MESSAGE.LOGIN_SUCCESS,
    session
  );

}

/**
 * セッション作成
 */
function createSession(
  user
) {

  const session = {

    sessionId:

      generateId(
        "SESSION"
      ),

    userId:

      user.userId,

    role:

      user.role,

    loginTime:

      getNow()

  };

  PropertiesService
    .getUserProperties()
    .setProperty(
      DRIVEX.SESSION.KEY,
      toJson(session)
    );

  return session;

}

/**
 * 現在ログインユーザー取得
 */
function getCurrentUser() {

  const data =
    PropertiesService
      .getUserProperties()
      .getProperty(
        DRIVEX.SESSION.KEY
      );

  if (
    !data
  ) {

    return null;

  }

  return fromJson(
    data
  );

}
/**
 * ログアウト
 */
function logout() {

  PropertiesService
    .getUserProperties()
    .deleteProperty(
      DRIVEX.SESSION.KEY
    );

  return success(
    "ログアウトしました。"
  );

}

/**
 * ログイン状態確認
 */
function isLoggedIn() {

  const user =
    getCurrentUser();

  return user !== null;

}

/**
 * 権限取得
 */
function getCurrentRole() {

  const user =
    getCurrentUser();

  if (
    !user
  ) {

    return null;

  }

  return user.role;

}

/**
 * 管理者確認
 */
function requireAdmin() {

  const role =
    getCurrentRole();

  if (
    role !==
    DRIVEX.USER.ROLES.ADMIN
  ) {

    return false;

  }

  return true;

}

/**
 * ログインユーザー情報取得
 */
function getLoginUserInfo() {

  const session =
    getCurrentUser();

  if (
    !session
  ) {

    return failure(
      "ログインしていません。"
    );

  }

  const user =
    getUser(
      session.userId
    );

  if (
    !user
  ) {

    return failure(
      "ユーザー情報がありません。"
    );

  }

  return success(
    "取得しました。",
    {

      userId:
        user.userId,

      role:
        user.role,

      status:
        user.status

    }
  );

}

/**
 * DriveX/Users 配下にユーザー用フォルダが存在するか確認し、無ければ作成する
 */
function ensureUserFolder(userId) {

  if (!userId) return;

  try {

    var drivexFolders =
      DriveApp.getFoldersByName("DriveX");

    if (!drivexFolders.hasNext()) return;

    var drivexFolder =
      drivexFolders.next();

    var usersFolders =
      drivexFolder.getFoldersByName("Users");

    if (!usersFolders.hasNext()) return;

    var usersFolder =
      usersFolders.next();

    var targetUserFolders =
      usersFolder.getFoldersByName(userId);

    if (!targetUserFolders.hasNext()) {

      usersFolder.createFolder(userId);

      Logger.log(
        "Users内にユーザーフォルダを作成しました: " + userId
      );

    }

  } catch (error) {

    Logger.log(
      "ensureUserFolder エラー: " + error.message
    );

  }

}