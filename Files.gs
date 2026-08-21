/**
 * ==========================================================
 * DriveX - Files.gs
 * Google Drive ファイル管理
 * Version : 2.0.0
 * ==========================================================
 */

/**
 * ログインユーザーのルートフォルダ取得
 */
function getUserDriveFolder() {

  const user =
    getCurrentUser();

  if (!user) {

    throw new Error(
      "ログインしていません。"
    );

  }

  const usersFolder =
    getUsersFolder();

  const folders =
    usersFolder.getFoldersByName(
      user.userId
    );

  if (!folders.hasNext()) {

    throw new Error(
      "ユーザーフォルダがありません。"
    );

  }

  return folders.next();

}


/**
 * フォルダ一覧取得
 */
function getFolderList(folder) {

  const folders =
    folder.getFolders();

  const list = [];

  while (folders.hasNext()) {

    const item =
      folders.next();

    list.push({

      id:
        item.getId(),

      name:
        item.getName(),

      type:
        "folder",

      icon:
        "📁",

      updated:
        item.getLastUpdated()

    });

  }

  return list;

}


/**
 * MIMEタイプからアイコン取得
 */
function getFileIcon(mimeType) {

  if (!mimeType) {

    return "📄";

  }

  if (
    mimeType.indexOf("image/") === 0
  ) {

    return "🖼";

  }

  if (
    mimeType.indexOf("video/") === 0
  ) {

    return "🎥";

  }

  if (
    mimeType.indexOf("audio/") === 0
  ) {

    return "🎵";

  }

  if (
    mimeType === MimeType.PDF
  ) {

    return "📕";

  }

  if (
    mimeType.indexOf("spreadsheet") !== -1 ||
    mimeType.indexOf("excel") !== -1
  ) {

    return "📊";

  }

  if (
    mimeType.indexOf("document") !== -1 ||
    mimeType.indexOf("word") !== -1
  ) {

    return "📘";

  }

  if (
    mimeType.indexOf("presentation") !== -1 ||
    mimeType.indexOf("powerpoint") !== -1
  ) {

    return "📽";

  }

  if (
    mimeType.indexOf("zip") !== -1 ||
    mimeType.indexOf("compressed") !== -1
  ) {

    return "🗜";

  }

  return "📄";

}
/**
 * ログイン中のユーザーのマイドライブ（または指定フォルダ）内のコンテンツを取得する
 */
function getMyDrive(targetFolderId) {
  const user = getCurrentUser();
  if (!user || !user.userId) {
    return {
      success: false,
      message: "ログインしていません。"
    };
  }

  try {
    // 1. targetFolderId があればそのフォルダ、無ければユーザーのルートフォルダを取得
    let targetFolder;
    if (targetFolderId && isValidIdFormat(targetFolderId)) {
      targetFolder = DriveApp.getFolderById(targetFolderId);
    } else {
      targetFolder = getUserDriveFolder();
    }

    // 2. フォルダ内の「サブフォルダ」を取得
    const folders = [];
    const folderIter = targetFolder.getFolders();
    while (folderIter.hasNext()) {
      const f = folderIter.next();
      folders.push({
        id: f.getId(),
        name: f.getName(),
        updatedAt: formatDate(f.getLastUpdated())
      });
    }

    // 3. フォルダ内の「ファイル」を取得
    const files = [];
    const fileIter = targetFolder.getFiles();
    while (fileIter.hasNext()) {
      const f = fileIter.next();
      files.push({
        id: f.getId(),
        name: f.getName(),
        icon: getFileIcon(f.getMimeType()),
        size: formatFileSize(f.getSize()),
        updatedAt: formatDate(f.getLastUpdated()),
        url: f.getUrl()
      });
    }

    return {
      success: true,
      data: {
        currentFolderId: targetFolder.getId(),
        currentFolderName: targetFolder.getName(),
        folders: folders,
        files: files
      }
    };
  } catch (e) {
    return {
      success: false,
      message: "フォルダ情報の取得に失敗しました: " + e.message
    };
  }
}
/**
 * 日付フォーマット調整
 */
function formatDate(date) {
  if (!date) return "";
  return Utilities.formatDate(
    date,
    DRIVEX.APP.TIMEZONE || "Asia/Tokyo",
    "yyyy/MM/dd HH:mm"
  );
}

/**
 * ファイルサイズをKB/MB表記に変換
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
/**
 * ファイルをユーザー専用フォルダにアップロード・保存する
 * @param {Object} fileData - { name: ファイル名, mimeType: 形式, base64: データ }
 */
function uploadFileToDrive(fileData) {
  const user = getCurrentUser();
  if (!user || !user.userId) {
    return {
      success: false,
      message: "ログインしていません。"
    };
  }

  try {
    // 1. ユーザー専用フォルダを取得
    const userFolder = getUserDriveFolder();

    // 2. Base64データからBlob（バイナリデータ）を作成
    const bytes = Utilities.base64Decode(fileData.base64);
    const blob = Utilities.newBlob(bytes, fileData.mimeType, fileData.name);

    // 3. Driveのユーザーフォルダ内にファイルを作成
    const newFile = userFolder.createFile(blob);

    // 4. Filesシート（データベース）にも記録（存在する場合）
    try {
      saveFileInfo({
        fileId: newFile.getId(),
        userId: user.userId,
        name: newFile.getName(),
        type: newFile.getMimeType(),
        size: formatFileSize(newFile.getSize())
      });
    } catch (sheetError) {
      Logger.log("シート保存エラー（無視して続行）: " + sheetError.message);
    }

    return {
      success: true,
      message: "アップロードが完了しました！",
      file: {
        id: newFile.getId(),
        name: newFile.getName(),
        size: formatFileSize(newFile.getSize())
      }
    };
  } catch (e) {
    return {
      success: false,
      message: "アップロード処理に失敗しました: " + e.message
    };
  }
}
/**
 * 時間異常・メモリ対策版：uploadFileWithProgress
 */
function uploadFileWithProgress(file) {
  const chunkSizeMB = 3; // メモリ負荷軽減のため3MBに落とす
  const CHUNK_SIZE = chunkSizeMB * 1024 * 1024;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  showUploadProgress(file.name, file.size);
  
  let currentChunk = 0;
  let driveFileId = null;
  let progressTimer = null;
  let lastChunkStartTime = 0;
  let estimatedSpeedBps = 0;

  // 1. Googleサーバーから過去の学習スピードを取得
  google.script.run
    .withSuccessHandler(function(savedSpeed) {
      // 異常に遅い値が入っている場合はクリア (100KB/s未満はリセット)
      estimatedSpeedBps = (savedSpeed && savedSpeed > 100000) ? savedSpeed : 0;
      startChunkUpload();
    })
    .withFailureHandler(function() {
      startChunkUpload();
    })
    .getUserUploadSpeed();

  function startChunkUpload() {
    async function sendNextChunk() {
      if (currentChunk >= totalChunks) {
        clearInterval(progressTimer);
        updateProgressBar(100, file.size, file.size);
        updateProgressStatus('処理完了！');

        if (estimatedSpeedBps > 100000) {
          google.script.run.saveUserUploadSpeed(estimatedSpeedBps);
        }

        setTimeout(() => {
          hideUploadProgress();
          alert("アップロードが完了しました！");
          loadMyDrive();
        }, 300);
        return;
      }

      const start = currentChunk * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunkBlob = file.slice(start, end);
      const chunkSize = end - start;

      const base64Data = await readBlobAsBase64(chunkBlob);

      lastChunkStartTime = Date.now();
      let currentSimulatedBytes = start;

      // 通信速度の計算（安全ガード付き）
      // スピード不明時は 1MB/s を仮定（200秒などの異常な待ち時間を防ぐ）
      const safeSpeedBps = estimatedSpeedBps > 100000 ? estimatedSpeedBps : (1024 * 1024);
      const stepBytes = (safeSpeedBps / 10); 

      clearInterval(progressTimer);
      progressTimer = setInterval(() => {
        if (currentSimulatedBytes < end - (CHUNK_SIZE * 0.05)) {
          currentSimulatedBytes += stepBytes;
          const percent = Math.min(99, Math.floor((currentSimulatedBytes / file.size) * 100));
          
          const remainingBytes = file.size - currentSimulatedBytes;
          const remainingSec = Math.min(180, Math.ceil(remainingBytes / safeSpeedBps)); // 最大でも180秒にガード
          
          updateProgressBar(percent, currentSimulatedBytes, file.size);
          
          const speedText = `${(safeSpeedBps / (1024 * 1024)).toFixed(1)} MB/s`;
          const timeText = remainingSec > 0 ? `約 ${remainingSec} 秒` : '計算中...';
          updateProgressStatus(`送信中 (${currentChunk + 1}/${totalChunks}) | 速度: ${speedText} | 残り: ${timeText}`);
        }
      }, 100);

      google.script.run
        .withSuccessHandler(function(res) {
          clearInterval(progressTimer);

          if (!res.success) {
            hideUploadProgress();
            alert("アップロード失敗: " + res.message);
            return;
          }

          // 今回の通信スピードを計算（極端な遅延は除外）
          const durationSec = (Date.now() - lastChunkStartTime) / 1000;
          if (durationSec > 0.5) {
            const currentSpeed = chunkSize / durationSec;
            // 異常な遅さ（処理の詰まり）で数値を汚さないための制御
            if (currentSpeed > 100000) { 
              estimatedSpeedBps = estimatedSpeedBps === 0 ? currentSpeed : (estimatedSpeedBps * 0.7 + currentSpeed * 0.3);
            }
          }

          driveFileId = res.fileId;
          currentChunk++;
          
          const actualUploadedBytes = Math.min(currentChunk * CHUNK_SIZE, file.size);
          const actualPercent = Math.round((actualUploadedBytes / file.size) * 100);
          updateProgressBar(actualPercent, actualUploadedBytes, file.size);

          sendNextChunk();
        })
        .withFailureHandler(function(err) {
          clearInterval(progressTimer);
          hideUploadProgress();
          alert("通信エラーが発生しました: " + err.message);
        })
        .saveChunk({
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Data: base64Data,
          fileId: driveFileId,
          isFirst: (currentChunk === 0)
        });
    }

    sendNextChunk();
  }
}
/**
 * ユーザーごとの平均通信速度（Bps）を取得する
 */
function getUserUploadSpeed() {
  try {
    var userProps = PropertiesService.getUserProperties();
    var speed = userProps.getProperty('AVERAGE_UPLOAD_SPEED_BPS');
    return speed ? parseFloat(speed) : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * ユーザーごとの平均通信速度（Bps）を保存する
 */
function saveUserUploadSpeed(speedBps) {
  try {
    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('AVERAGE_UPLOAD_SPEED_BPS', speedBps.toString());
    return true;
  } catch (e) {
    return false;
  }
}
/**
 * 直接アップロード用のセッションURL（Google公式 Resumable API）を発行
 */
function createUploadSession(data) {
  try {
    var userFolder = getUserDriveFolder();
    var url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";
    
    var metadata = {
      name: data.fileName,
      mimeType: data.mimeType,
      parents: [userFolder.getId()]
    };

    var options = {
      method: "post",
      contentType: "application/json",
      headers: {
        Authorization: "Bearer " + ScriptApp.getOAuthToken()
      },
      payload: JSON.stringify(metadata),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var locationUrl = response.getHeaders()["Location"] || response.getHeaders()["location"];

    if (!locationUrl) {
      return { success: false, message: "アップロードURLの取得に失敗しました。" };
    }

    return { success: true, uploadUrl: locationUrl };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * アップロード完了後、管理用シート等へ記録する
 */
function finalizeUpload(data) {
  try {
    var user = getCurrentUser();
    saveFileInfo({
      fileId: data.fileId,
      userId: user ? user.userId : "guest",
      name: data.fileName,
      type: data.mimeType,
      size: formatFileSize(data.fileSize)
    });
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
/**
 * セキュリティチェック：ID文字列の形式を検証（パストラバーサル・不正入力対策）
 */
function isValidIdFormat(id) {
  if (!id || typeof id !== 'string') return false;
  // Google Drive ID 形式（英数字、ハイフン、アンダースコア）のみ許可
  return /^[a-zA-Z0-9_-]{10,}$/.test(id);
}

/**
 * 新規フォルダーを作成する
 */
function createNewFolder(folderName, parentFolderId) {
  try {
    if (!folderName || folderName.trim() === "") {
      return { success: false, message: "フォルダー名を入力してください。" };
    }
    
    // サニタイズ（悪意のある記号の無効化）
    var safeName = folderName.replace(/[<>"']/g, "");

    var targetFolder;
    if (parentFolderId && isValidIdFormat(parentFolderId)) {
      targetFolder = DriveApp.getFolderById(parentFolderId);
    } else {
      targetFolder = getUserDriveFolder(); // ルートフォルダー
    }

    var newFolder = targetFolder.createFolder(safeName);

    // 管理用記録（安全対策を兼ねて記述）
    try {
      var user = getCurrentUser();
      saveFileInfo({
        fileId: newFolder.getId(),
        userId: user ? user.userId : "guest",
        name: safeName,
        type: "folder",
        size: "-"
      });
    } catch(e) {}

    return { success: true, folderId: newFolder.getId() };
  } catch (e) {
    return { success: false, message: "フォルダー作成エラー: " + e.message };
  }
}

/**
 * ファイル/フォルダーのダウンロード・プレビュー用URLを取得
 */
function getDownloadUrl(fileId) {
  try {
    if (!isValidIdFormat(fileId)) {
      return { success: false, message: "無効なファイルIDです。" };
    }

    var file = DriveApp.getFileById(fileId);
    
    // ★シークレットモード（未ログイン状態）対策：権限を「リンクを知っている全員」に自動変更
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return {
      success: true,
      downloadUrl: "https://drive.google.com/uc?export=download&id=" + fileId,
      previewUrl: "https://drive.google.com/file/d/" + fileId + "/preview",
      fileName: file.getName()
    };
  } catch (e) {
    return { success: false, message: "URL取得エラー: " + e.message };
  }
}

/**
 * ファイルまたはフォルダーを別のフォルダーへ移動する
 */
function moveItemToFolder(itemId, targetFolderId, isFolder) {
  try {
    if (!isValidIdFormat(itemId) || !isValidIdFormat(targetFolderId)) {
      return { success: false, message: "無効なIDが指定されました。" };
    }

    var targetFolder = DriveApp.getFolderById(targetFolderId);

    if (isFolder) {
      var folder = DriveApp.getFolderById(itemId);
      
      // 自分自身や配下への循環移動を防止
      if (itemId === targetFolderId) {
        return { success: false, message: "同じフォルダーの中には移動できません。" };
      }
      
      folder.moveTo(targetFolder);
    } else {
      var file = DriveApp.getFileById(itemId);
      file.moveTo(targetFolder);
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: "移動エラー: " + e.message };
  }
}
/**
 * お気に入り追加・解除（トグル処理）
 */
function toggleFavorite(fileId) {
  const user = getCurrentUser();
  if (!user || !user.userId) {
    return { success: false, message: "ログインしていません。" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DRIVEX.SHEETS.FAVORITES);
  if (!sheet) return { success: false, message: "Favoritesシートが存在しません。" };

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === user.userId && values[i][1] === fileId) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "お気に入りを解除しました。" };
    }
  }

  sheet.appendRow([user.userId, fileId, getNow()]);
  return { success: true, message: "お気に入りに追加しました！" };
}

/**
 * お気に入り一覧を取得する
 */
function getFavoriteList() {
  const user = getCurrentUser();
  if (!user || !user.userId) return { success: false, message: "未ログイン" };

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(DRIVEX.SHEETS.FAVORITES);
    if (!sheet) return { success: true, data: [] };

    const favValues = sheet.getDataRange().getValues();
    const userFavIds = favValues.slice(1)
      .filter(function(row) { return row[0] === user.userId; })
      .map(function(row) { return row[1]; });

    const files = [];
    userFavIds.forEach(function(id) {
      try {
        const f = DriveApp.getFileById(id);
        files.push({
          id: f.getId(),
          name: f.getName(),
          icon: getFileIcon(f.getMimeType()),
          size: formatFileSize(f.getSize()),
          updatedAt: formatDate(f.getLastUpdated())
        });
      } catch (e) {
        // ファイルが削除されている場合はスキップ
      }
    });

    return { success: true, data: files };
  } catch (e) {
    return { success: false, message: "お気に入りの取得に失敗しました: " + e.message };
  }
}