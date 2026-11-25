package com.lovelytalk.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private static final int MAX_REDIRECTS = 6;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        try {
            Context ctx = getContext();
            PackageManager pm = ctx.getPackageManager();
            PackageInfo pkgInfo = pm.getPackageInfo(ctx.getPackageName(), 0);
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? pkgInfo.getLongVersionCode()
                : pkgInfo.versionCode;

            JSObject ret = new JSObject();
            ret.put("versionName", pkgInfo.versionName != null ? pkgInfo.versionName : "1.0.0");
            ret.put("versionCode", versionCode);
            ret.put("packageName", ctx.getPackageName());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("앱 버전 정보를 읽을 수 없습니다: " + e.getMessage());
        }
    }

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasInstallPermission());
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("권한 설정 화면을 열 수 없습니다: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstallApk(PluginCall call) {
        final String downloadUrl = call.getString("url", "");
        final String expectedSha256 = call.getString("sha256", "").trim().toLowerCase(Locale.US);
        final String version = call.getString("version", "latest").replaceAll("[^0-9A-Za-z._-]", "");

        if (downloadUrl == null || !downloadUrl.startsWith("https://")) {
            call.reject("보안상 HTTPS APK 다운로드 주소만 허용됩니다.");
            return;
        }
        if (expectedSha256.length() != 64) {
            call.reject("APK 무결성 검증을 위한 SHA-256 해시가 올바르지 않습니다.");
            return;
        }

        executor.execute(() -> {
            File targetFile = null;
            HttpURLConnection conn = null;
            try {
                File dir = getUpdatesDirectory();
                if (!dir.exists() && !dir.mkdirs()) {
                    throw new IllegalStateException("업데이트 저장 폴더를 생성할 수 없습니다.");
                }

                // Clean up older cached APKs in private directory
                File[] existing = dir.listFiles();
                if (existing != null) {
                    for (File old : existing) {
                        if (old.isFile() && old.getName().endsWith(".apk")) {
                            //noinspection ResultOfMethodCallIgnored
                            old.delete();
                        }
                    }
                }

                targetFile = new File(dir, "LovelyTalk-" + version + ".apk");
                conn = openFollowingRedirects(downloadUrl);

                int status = conn.getResponseCode();
                if (status != HttpURLConnection.HTTP_OK) {
                    throw new IllegalStateException("APK 다운로드 실패 (HTTP " + status + ")");
                }

                long totalBytes = conn.getContentLengthLong();
                MessageDigest digest = MessageDigest.getInstance("SHA-256");

                try (InputStream in = new BufferedInputStream(conn.getInputStream());
                     FileOutputStream out = new FileOutputStream(targetFile)) {

                    byte[] buffer = new byte[16384];
                    long downloaded = 0;
                    int lastPercent = -1;
                    int bytesRead;

                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                        digest.update(buffer, 0, bytesRead);
                        downloaded += bytesRead;

                        int percent = totalBytes > 0
                            ? (int) Math.min(99, (downloaded * 100L) / totalBytes)
                            : 0;
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            JSObject progress = new JSObject();
                            progress.put("percent", percent);
                            progress.put("downloadedBytes", downloaded);
                            progress.put("totalBytes", Math.max(totalBytes, 0));
                            notifyListeners("downloadProgress", progress);
                        }
                    }
                    out.flush();
                }

                String actualSha256 = toHex(digest.digest());
                if (!actualSha256.equals(expectedSha256)) {
                    // Delete tampered or corrupted download immediately
                    //noinspection ResultOfMethodCallIgnored
                    targetFile.delete();
                    call.reject("APK 무결성(SHA-256) 검증에 실패하여 설치를 중단했습니다. 다시 시도해 주세요.");
                    return;
                }

                JSObject doneProgress = new JSObject();
                doneProgress.put("percent", 100);
                doneProgress.put("downloadedBytes", targetFile.length());
                doneProgress.put("totalBytes", targetFile.length());
                notifyListeners("downloadProgress", doneProgress);

                JSObject result = new JSObject();
                result.put("filePath", targetFile.getAbsolutePath());

                if (!hasInstallPermission()) {
                    result.put("status", "permission_required");
                    call.resolve(result);
                    return;
                }

                launchSystemInstaller(targetFile);
                result.put("status", "installer_launched");
                call.resolve(result);
            } catch (Exception e) {
                if (targetFile != null && targetFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    targetFile.delete();
                }
                call.reject("APK 다운로드 중 오류가 발생했습니다: " + e.getMessage());
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    @PluginMethod
    public void installDownloadedApk(PluginCall call) {
        String filePath = call.getString("filePath", "");
        if (filePath == null || filePath.isEmpty()) {
            call.reject("설치할 APK 파일 경로가 없습니다.");
            return;
        }
        try {
            File updatesDir = getUpdatesDirectory().getCanonicalFile();
            File apkFile = new File(filePath).getCanonicalFile();
            if (!apkFile.getPath().startsWith(updatesDir.getPath() + File.separator) || !apkFile.exists()) {
                call.reject("다운로드된 APK 파일을 찾을 수 없습니다. 다시 다운로드해 주세요.");
                return;
            }

            JSObject ret = new JSObject();
            if (!hasInstallPermission()) {
                ret.put("status", "permission_required");
                call.resolve(ret);
                return;
            }

            launchSystemInstaller(apkFile);
            ret.put("status", "installer_launched");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("시스템 설치 화면을 실행할 수 없습니다: " + e.getMessage());
        }
    }

    private File getUpdatesDirectory() {
        File extDownloads = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (extDownloads != null) {
            return extDownloads;
        }
        return new File(getContext().getFilesDir(), "updates");
    }

    private boolean hasInstallPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return getContext().getPackageManager().canRequestPackageInstalls();
        }
        return true;
    }

    private void launchSystemInstaller(File apkFile) {
        Context ctx = getContext();
        Uri contentUri = FileProvider.getUriForFile(
            ctx,
            ctx.getPackageName() + ".fileprovider",
            apkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(contentUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(intent);
    }

    private HttpURLConnection openFollowingRedirects(String initialUrl) throws Exception {
        String currentUrl = initialUrl;
        for (int i = 0; i < MAX_REDIRECTS; i++) {
            URL url = new URL(currentUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setRequestProperty("User-Agent", "LovelyTalk-Android-Updater");

            int code = conn.getResponseCode();
            if (code == HttpURLConnection.HTTP_MOVED_PERM
                || code == HttpURLConnection.HTTP_MOVED_TEMP
                || code == HttpURLConnection.HTTP_SEE_OTHER
                || code == 307
                || code == 308) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null || !location.startsWith("https://")) {
                    throw new SecurityException("안전하지 않은 리다이렉트 주소입니다.");
                }
                currentUrl = location;
                continue;
            }
            return conn;
        }
        throw new IllegalStateException("다운로드 리다이렉트 횟수를 초과했습니다.");
    }

    private String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format(Locale.US, "%02x", b));
        }
        return sb.toString();
    }
}
