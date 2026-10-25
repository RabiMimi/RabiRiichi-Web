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
    private static final String KEY_DEVELOPMENT = "development";

    private SharedPreferences preferences() {
        return getPreferences(MODE_PRIVATE);
    }

    /** The chooser is a one-time setup; later starts reuse it and the web UI switches clients. */
    @Override
    protected boolean shouldLaunchImmediately() {
        return getIntent().getData() != null || preferences().contains(KEY_DEVELOPMENT);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (isFinishing() || shouldLaunchImmediately()) return;

        setContentView(R.layout.launcher);
        RadioGroup environments = findViewById(R.id.environments);
        environments.check(R.id.production);
        findViewById(R.id.play).setOnClickListener(view -> {
            view.setEnabled(false);
            boolean development = environments.getCheckedRadioButtonId() == R.id.development;
            preferences().edit().putBoolean(KEY_DEVELOPMENT, development).apply();
            launchTwa();
        });
    }

    @Override
    protected Uri getLaunchingUrl() {
        // The helper validates incoming App Links against the declared trusted origins.
        if (getIntent().getData() != null || !preferences().contains(KEY_DEVELOPMENT)) {
            return super.getLaunchingUrl();
        }
        return Uri.parse(getString(preferences().getBoolean(KEY_DEVELOPMENT, false)
                ? R.string.development_url : R.string.production_url));
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
