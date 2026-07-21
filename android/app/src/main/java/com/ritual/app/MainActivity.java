package com.ritual.app;

import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        disableWebViewScrollbars();
        hideSystemUI();
        new Handler(Looper.getMainLooper()).postDelayed(this::hideSystemUI, 600);
        new Handler(Looper.getMainLooper()).postDelayed(this::hideSystemUI, 1500);
    }

    private void disableWebViewScrollbars() {
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemUI();
    }

    private void hideSystemUI() {
        Window window = getWindow();
        if (window == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // API 30+
            WindowInsetsController ctrl = window.getInsetsController();
            if (ctrl != null) {
                ctrl.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                ctrl.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            // Fallback for API < 30
            window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }

        // Make status bar and nav bar fully transparent
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(0x00000000);
        window.setNavigationBarColor(0x00000000);
    }
}
