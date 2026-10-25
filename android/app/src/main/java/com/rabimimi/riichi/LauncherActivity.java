package com.rabimimi.riichi;

import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RadioGroup;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

/** Keeps browser rendering and PWA updates intact; no native bridge is exposed to web content. */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    private Uri selectedUrl;

    @Override
    protected boolean shouldLaunchImmediately() {
        return getIntent().getData() != null;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (isFinishing() || getIntent().getData() != null) return;

        setContentView(R.layout.launcher);
        SharedPreferences preferences = getPreferences(MODE_PRIVATE);
        RadioGroup environments = findViewById(R.id.environments);
        environments.check(preferences.getBoolean("development", false)
                ? R.id.development : R.id.production);
        findViewById(R.id.play).setOnClickListener(view -> {
            view.setEnabled(false);
            boolean development = environments.getCheckedRadioButtonId() == R.id.development;
            preferences.edit().putBoolean("development", development).apply();
            selectedUrl = Uri.parse(getString(development
                    ? R.string.development_url : R.string.production_url));
            launchTwa();
        });
    }

    @Override
    protected Uri getLaunchingUrl() {
        // The helper validates incoming App Links against the declared trusted origins.
        return selectedUrl != null ? selectedUrl : super.getLaunchingUrl();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                    getWindow(), getWindow().getDecorView());
            controller.setSystemBarsBehavior(
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
    }
}
