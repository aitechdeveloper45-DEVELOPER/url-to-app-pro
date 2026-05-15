package com.aabforge.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private SwipeRefreshLayout swipe;
    private BillingBridge billingBridge;
    private PlayBillingPlugin playBillingPlugin;
    private NativeBridge nativeBridge;
    private boolean isOffline = false;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        // Force dark mode if requested
        if (BuildConfig.DARK_MODE_FORCE) {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
        }
        super.onCreate(savedInstanceState);

        // Switch from splash theme to main theme
        setTheme(R.style.Theme_AABForge);

        // Display flags
        applyWindowFeatureFlags();
        if (BuildConfig.KEEP_SCREEN_ON) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
        if (BuildConfig.FULLSCREEN_MODE) {
            getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            );
        }
        if (BuildConfig.HIDE_STATUS_BAR) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN);
        }
        // Apply theme color to status bar
        try {
            int themeColor = Color.parseColor(BuildConfig.THEME_COLOR);
            getWindow().setStatusBarColor(themeColor);
        } catch (Throwable ignored) {}
        try {
            int navColor = Color.parseColor(BuildConfig.NAV_COLOR);
            getWindow().setNavigationBarColor(navColor);
        } catch (Throwable ignored) {}

        // Build view hierarchy: SwipeRefreshLayout > WebView (if pull-to-refresh enabled)
        webView = new FeatureLockedWebView(this);
        // Hardware-accelerated layer = smoother scroll & animations
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        if (BuildConfig.ENABLE_PULL_TO_REFRESH) {
            swipe = new SwipeRefreshLayout(this);
            swipe.addView(webView);
            swipe.setOnRefreshListener(() -> {
                if (webView != null) webView.reload();
            });
            // Critical: only enable pull-to-refresh when WebView is scrolled to the top.
            // Otherwise every downward swipe inside the page intercepts touch and feels laggy.
            webView.getViewTreeObserver().addOnScrollChangedListener(() ->
                swipe.setEnabled(webView.getScrollY() == 0)
            );
            setContentView(swipe);
        } else {
            setContentView(webView);
        }

        configureWebView();
        wireBridges();
        wireDownloadListener();
        wireBackPressed();

        // Request runtime permissions for enabled features (Android 6+)
        requestEnabledPermissions();

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            loadInitialUrl();
        }
    }

    private void configureWebView() {
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(false);
        s.setLoadsImagesAutomatically(true);
        // Performance: GPU pipeline. Wide-viewport is only safe when zoom is allowed —
        // when zoom is off we want the page to size to the device width without giving
        // the user any way to scale it.
        s.setUseWideViewPort(BuildConfig.ALLOW_ZOOM);
        s.setLoadWithOverviewMode(BuildConfig.ALLOW_ZOOM);
        s.setMixedContentMode(BuildConfig.ALLOW_CLEARTEXT
            ? WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            : WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // Pinch-to-zoom: setSupportZoom(false) is the authoritative WebView switch.
        // We additionally inject a <meta viewport user-scalable=no> after page load to
        // override pages that explicitly enable zoom.
        s.setBuiltInZoomControls(BuildConfig.ALLOW_ZOOM);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(BuildConfig.ALLOW_ZOOM);
        webView.setInitialScale(100);

        injectDocumentStartFeatureLocks();

        s.setGeolocationEnabled(BuildConfig.ENABLE_GEOLOCATION);

        s.setCacheMode(BuildConfig.CACHE_ENABLED
            ? WebSettings.LOAD_DEFAULT
            : WebSettings.LOAD_NO_CACHE);

        if (BuildConfig.USER_AGENT_OVERRIDE != null && !BuildConfig.USER_AGENT_OVERRIDE.isEmpty()) {
            s.setUserAgentString(BuildConfig.USER_AGENT_OVERRIDE);
        }

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                isOffline = false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (swipe != null) swipe.setRefreshing(false);
                if (!isOffline) injectCustomCode(view);
            }

            @Override
            public void onScaleChanged(WebView view, float oldScale, float newScale) {
                super.onScaleChanged(view, oldScale, newScale);
                if (!BuildConfig.ALLOW_ZOOM && newScale != 1.0f) {
                    view.post(() -> view.setInitialScale(100));
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                // Same-origin / web URLs stay in WebView
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    if (!BuildConfig.ALLOW_EXTERNAL_LINKS) return false;
                    String appUrl = BuildConfig.APP_URL;
                    try {
                        Uri target = Uri.parse(url);
                        Uri base = Uri.parse(appUrl);
                        if (target.getHost() != null && base.getHost() != null
                            && target.getHost().equalsIgnoreCase(base.getHost())) {
                            return false;
                        }
                        // External link → open in system browser
                        startActivity(new Intent(Intent.ACTION_VIEW, target));
                        return true;
                    } catch (ActivityNotFoundException e) {
                        return false;
                    }
                }
                // tel:, mailto:, sms:, intent:, etc.
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                    return true;
                } catch (Throwable ignored) { return false; }
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                if (BuildConfig.ENABLE_OFFLINE_PAGE && !isNetworkAvailable()) {
                    showOfflinePage();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // Auto-grant permissions the app declared support for
                runOnUiThread(() -> {
                    List<String> granted = new ArrayList<>();
                    for (String r : request.getResources()) {
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && BuildConfig.ENABLE_CAMERA) granted.add(r);
                        else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && BuildConfig.ENABLE_MICROPHONE) granted.add(r);
                        else if (PermissionRequest.RESOURCE_MIDI_SYSEX.equals(r)) granted.add(r);
                        else if (PermissionRequest.RESOURCE_PROTECTED_MEDIA_ID.equals(r)) granted.add(r);
                    }
                    if (granted.isEmpty()) request.deny();
                    else request.grant(granted.toArray(new String[0]));
                });
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                callback.invoke(origin, BuildConfig.ENABLE_GEOLOCATION, false);
            }
        });
    }

    private void applyWindowFeatureFlags() {
        if (BuildConfig.BLOCK_SCREENSHOTS) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }
    }

    private void injectDocumentStartFeatureLocks() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return;
        StringBuilder script = new StringBuilder("(function(){try{");
        if (!BuildConfig.ALLOW_ZOOM) script.append(zoomLockScript());
        if (!BuildConfig.ENABLE_CLIPBOARD) script.append(clipboardLockScript());
        script.append("}catch(e){}})();");
        WebViewCompat.addDocumentStartJavaScript(webView, script.toString(), Collections.singleton("*"));

        // Inject user-provided custom CSS / JS as early as possible so badge / tag
        // removers run before the target elements are painted, and re-run on every
        // navigation (including SPA route changes that never trigger onPageFinished).
        final String css = readAsset("custom_css.txt");
        final String js  = readAsset("custom_js.txt");

        if (!css.isEmpty()) {
            String b64 = Base64.encodeToString(css.getBytes(), Base64.NO_WRAP);
            String cssBoot =
                "(function(){try{" +
                "var apply=function(){" +
                  "var id='aabforge-custom-css';" +
                  "var prev=document.getElementById(id);if(prev)prev.remove();" +
                  "var s=document.createElement('style');s.id=id;" +
                  "s.textContent=atob('" + b64 + "');" +
                  "(document.head||document.documentElement).appendChild(s);" +
                "};" +
                "apply();" +
                "if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',apply,{once:true});}" +
                "try{new MutationObserver(function(){if(!document.getElementById('aabforge-custom-css'))apply();}).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}" +
                "}catch(e){}})();";
            WebViewCompat.addDocumentStartJavaScript(webView, cssBoot, Collections.singleton("*"));
        }

        if (!js.isEmpty()) {
            String b64 = Base64.encodeToString(js.getBytes(), Base64.NO_WRAP);
            String jsBoot =
                "(function(){try{" +
                "var b64='" + b64 + "';" +
                "var decode=function(s){try{return decodeURIComponent(escape(atob(s)));}catch(e){return atob(s);}};" +
                "var raw=decode(b64).replace(/^\\s*<script[^>]*>/i,'').replace(/<\\/script>\\s*$/i,'');" +
                "var run=function(){try{" +
                  "var s=document.createElement('script');s.type='text/javascript';s.setAttribute('data-aabforge-custom-js','1');s.text=raw;" +
                  "(document.head||document.documentElement).appendChild(s);" +
                "}catch(e){console.error('AABforge custom JS error',e);}};" +
                "run();" +
                "if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',run,{once:true});}" +
                "window.addEventListener('load',run,{once:true});" +
                // Re-run on SPA route changes so badges added after navigation are also handled.
                "try{var _ps=history.pushState;history.pushState=function(){var r=_ps.apply(this,arguments);setTimeout(run,50);return r;};" +
                "var _rs=history.replaceState;history.replaceState=function(){var r=_rs.apply(this,arguments);setTimeout(run,50);return r;};" +
                "window.addEventListener('popstate',function(){setTimeout(run,50);});}catch(e){}" +
                "}catch(e){console.error('AABforge custom JS bootstrap error',e);}})();";
            WebViewCompat.addDocumentStartJavaScript(webView, jsBoot, Collections.singleton("*"));
        }
    }

    private void wireBridges() {
        // Always-on native bridge for clipboard / share / vibrate / toast etc.
        nativeBridge = new NativeBridge(this, webView);
        webView.addJavascriptInterface(nativeBridge, "AndroidNative");

        if (BuildConfig.ENABLE_BILLING) {
            billingBridge = new BillingBridge(this, webView);
            webView.addJavascriptInterface(billingBridge, "AndroidBilling");

            // Canonical Play Billing v6 plugin (window.PlayBilling.*)
            playBillingPlugin = new PlayBillingPlugin(this, webView);
            webView.addJavascriptInterface(playBillingPlugin, "PlayBillingNative");
        }
    }

    private void wireDownloadListener() {
        if (!BuildConfig.ENABLE_FILE_DOWNLOAD) return;
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimetype, long contentLength) {
                try {
                    DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                    req.setMimeType(mimetype);
                    req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                    req.allowScanningByMediaScanner();
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    dm.enqueue(req);
                    Toast.makeText(getApplicationContext(), "Downloading " + filename, Toast.LENGTH_SHORT).show();
                } catch (Throwable t) {
                    Toast.makeText(getApplicationContext(), "Download failed", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void wireBackPressed() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (BuildConfig.SWIPE_BACK_NAVIGATION && webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            }
        });
    }

    private void loadInitialUrl() {
        if (BuildConfig.ENABLE_OFFLINE_PAGE && !isNetworkAvailable()) {
            showOfflinePage();
        } else {
            webView.loadUrl(BuildConfig.APP_URL);
        }
    }

    private void showOfflinePage() {
        isOffline = true;
        webView.loadUrl("file:///android_asset/offline.html");
        // Inject the real app URL so the "Try again" button knows where to go
        webView.postDelayed(() ->
            webView.evaluateJavascript(
                "window.__APP_URL__='" + BuildConfig.APP_URL.replace("'", "\\'") + "';", null
            ), 100);
    }

    private boolean isNetworkAvailable() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo ni = cm.getActiveNetworkInfo();
            return ni != null && ni.isConnected();
        } catch (Throwable t) { return true; }
    }

    private void requestEnabledPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        List<String> needed = new ArrayList<>();
        if (BuildConfig.ENABLE_CAMERA)            add(needed, Manifest.permission.CAMERA);
        if (BuildConfig.ENABLE_MICROPHONE)        add(needed, Manifest.permission.RECORD_AUDIO);
        if (BuildConfig.ENABLE_LOCATION)          add(needed, Manifest.permission.ACCESS_FINE_LOCATION);
        if (BuildConfig.ENABLE_SMS)               add(needed, Manifest.permission.SEND_SMS);
        if (BuildConfig.ENABLE_CONTACTS)          add(needed, Manifest.permission.READ_CONTACTS);
        if (BuildConfig.ENABLE_PHONE_STATE)       add(needed, Manifest.permission.READ_PHONE_STATE);
        if (BuildConfig.ENABLE_CALENDAR)          add(needed, Manifest.permission.READ_CALENDAR);
        if (BuildConfig.ENABLE_PUSH_NOTIFICATIONS && Build.VERSION.SDK_INT >= 33) {
            add(needed, "android.permission.POST_NOTIFICATIONS");
        }
        if (BuildConfig.ENABLE_STORAGE) {
            if (Build.VERSION.SDK_INT >= 33) add(needed, "android.permission.READ_MEDIA_IMAGES");
            else                              add(needed, Manifest.permission.READ_EXTERNAL_STORAGE);
        }
        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), 1001);
        }
    }

    private void add(List<String> list, String perm) {
        if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
            list.add(perm);
        }
    }

    private String readAsset(String name) {
        try (InputStream is = getAssets().open(name)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } catch (Throwable t) {
            return "";
        }
    }

    /** Wraps source in a base64 atob() shim so we never have to escape user content. */
    private void evalJsSafe(WebView view, String source) {
        if (source == null || source.isEmpty()) return;
        try {
            String b64 = Base64.encodeToString(source.getBytes("UTF-8"), Base64.NO_WRAP);
            // Strategy:
            //  - Decode as UTF-8 (atob alone is Latin-1 and breaks unicode/curly quotes/emoji).
            //  - Strip wrapping <script>...</script> tags so users can paste either raw JS
            //    or a full <script> block (matches behaviour of other app builders).
            //  - Inject as a <script> element so the code runs in page scope just like
            //    a <script> tag in the original HTML — works with const/let/class and
            //    avoids strict-mode quirks of eval().
            //  - Re-run on SPA route changes by hooking history + a one-shot
            //    DOMContentLoaded fallback so DOM queries find their targets.
            String wrapper =
                "(function(){try{" +
                "var b64='" + b64 + "';" +
                "var decode=function(s){try{return decodeURIComponent(escape(atob(s)));}catch(e){return atob(s);}};" +
                "var raw=decode(b64);" +
                "raw=raw.replace(/^\\s*<script[^>]*>/i,'').replace(/<\\/script>\\s*$/i,'');" +
                "var run=function(){try{" +
                  "var s=document.createElement('script');s.type='text/javascript';s.text=raw;" +
                  "(document.head||document.documentElement).appendChild(s);" +
                "}catch(e){console.error('AABforge custom JS error',e);}};" +
                "if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',run,{once:true});}else{run();}" +
                "}catch(e){console.error('AABforge custom JS bootstrap error',e);}})();";
            view.evaluateJavascript(wrapper, null);
        } catch (Throwable ignored) {}
    }

    private void injectCustomCode(WebView view) {
        // Expose feature flags first so injected JS can read them
        StringBuilder flags = new StringBuilder("(function(){");
        flags.append("window.__ANDROID_NATIVE__=true;");
        if (BuildConfig.ENABLE_BILLING)   flags.append("window.__BILLING_ENABLED__=true;");
        if (BuildConfig.ENABLE_CAPACITOR) flags.append("window.__CAPACITOR_NATIVE__=true;");
        flags.append("window.__APP_URL__='" + BuildConfig.APP_URL.replace("'", "\\'") + "';");

        // Re-apply feature locks after page load for devices that do not support
        // AndroidX document-start injection.
        if (!BuildConfig.ALLOW_ZOOM) flags.append(zoomLockScript());

        // Enforce "Clipboard" toggle: when OFF, neuter both the AndroidNative bridge AND
        // the standard navigator.clipboard / document.execCommand('copy') so the web app
        // genuinely cannot copy/paste.
        if (!BuildConfig.ENABLE_CLIPBOARD) flags.append(clipboardLockScript());

        // PlayBilling promise shim — wraps the sync PlayBillingNative bridge
        if (BuildConfig.ENABLE_BILLING) {
            flags.append(
              "if(window.PlayBillingNative && !window.PlayBilling){" +
                "var P={__cb:{},__listeners:{}};" +
                "P.__resolve=function(id,v){var f=P.__cb[id];if(f){delete P.__cb[id];f(v);}};" +
                "P.__emit=function(name,p){(P.__listeners[name]||[]).forEach(function(fn){try{fn(p);}catch(e){}});};" +
                "P.on=function(name,fn){(P.__listeners[name]=P.__listeners[name]||[]).push(fn);};" +
                "function call(method,args){return new Promise(function(res){var id='cb_'+Date.now()+'_'+Math.random();P.__cb[id]=res;args=args||[];args.push(id);window.PlayBillingNative[method].apply(window.PlayBillingNative,args);});}" +
                "P.isAvailable=function(){return window.PlayBillingNative.isAvailable();};" +
                "P.connect=function(){return call('connect',[]);};" +
                "P.querySubscriptions=function(ids){return call('querySubscriptions',[JSON.stringify(ids||[])]);};" +
                "P.queryProducts=function(ids){return call('queryProducts',[JSON.stringify(ids||[])]);};" +
                "P.launchPurchase=function(id){return call('launchPurchase',[id]);};" +
                "P.acknowledgePurchase=function(t){return call('acknowledgePurchase',[t]);};" +
                "P.consumePurchase=function(t){return call('consumePurchase',[t]);};" +
                "P.queryPurchases=function(type){return call('queryPurchases',[type||'inapp']);};" +
                "window.PlayBilling=P;" +
              "}"
            );
        }
        flags.append("})();");
        view.evaluateJavascript(flags.toString(), null);

        // Read custom code from assets at runtime — safe for any content (multiline,
        // quotes, $, backticks, unicode, etc.)
        final String css  = readAsset("custom_css.txt");
        final String html = readAsset("custom_html.txt");
        final String js   = readAsset("custom_js.txt");

        if (!css.isEmpty()) {
            // Build JS that base64-decodes the CSS into a <style> tag — never inlined directly.
            // Dedupe: replace any previous injection so SPA navigations don't pile up <style> tags.
            String b64 = Base64.encodeToString(css.getBytes(), Base64.NO_WRAP);
            view.evaluateJavascript(
                "(function(){var id='aabforge-custom-css';" +
                "var prev=document.getElementById(id);if(prev)prev.remove();" +
                "var s=document.createElement('style');s.id=id;" +
                "s.textContent=atob('" + b64 + "');" +
                "(document.head||document.documentElement).appendChild(s);})();", null);
        }
        if (!html.isEmpty()) {
            String b64 = Base64.encodeToString(html.getBytes(), Base64.NO_WRAP);
            view.evaluateJavascript(
                "(function(){" +
                "var old=document.querySelector('[data-aabforge-custom-html]');if(old)old.remove();" +
                "var d=document.createElement('div');" +
                "d.setAttribute('data-aabforge-custom-html','true');" +
                "d.innerHTML=atob('" + b64 + "');" +
                "document.body.appendChild(d);" +
                "var scripts=d.querySelectorAll('script');" +
                "for(var i=0;i<scripts.length;i++){" +
                  "var old=scripts[i],s=document.createElement('script');" +
                  "for(var j=0;j<old.attributes.length;j++){var a=old.attributes[j];s.setAttribute(a.name,a.value);}" +
                  "s.text=old.text||old.textContent||old.innerHTML||'';" +
                  "old.parentNode.replaceChild(s,old);" +
                "}" +
                "})();", null);
        }
        if (!js.isEmpty()) {
            evalJsSafe(view, js);
        }
    }

    private String zoomLockScript() {
        return "(function(){" +
            "var apply=function(){" +
              "var c='width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no';" +
              "var h=document.head||document.getElementsByTagName('head')[0]||document.documentElement;" +
              "var m=document.querySelector('meta[name=viewport]');" +
              "if(!m){m=document.createElement('meta');m.name='viewport';h.appendChild(m);}" +
              "m.setAttribute('content',c);" +
              "if(!document.getElementById('aabforge-zoom-lock')){var s=document.createElement('style');s.id='aabforge-zoom-lock';s.textContent='html,body{touch-action:pan-x pan-y!important;-ms-touch-action:pan-x pan-y!important;}';h.appendChild(s);}" +
            "};" +
            "apply();" +
            "document.addEventListener('DOMContentLoaded',apply,{once:true});" +
            "try{new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}" +
          "})();";
    }

    private String clipboardLockScript() {
        return "(function(){" +
            "var block=function(){return Promise.reject(new Error('Clipboard disabled by app'));};" +
            "var api={writeText:block,readText:block,write:block,read:block};" +
            "try{Object.defineProperty(navigator,'clipboard',{configurable:true,get:function(){return api;}});}catch(e){}" +
            "try{var ex=document.execCommand&&document.execCommand.bind(document);if(ex&&!document.__aabforgeExecLocked){document.__aabforgeExecLocked=true;document.execCommand=function(c){c=String(c||'').toLowerCase();if(c==='copy'||c==='cut'||c==='paste')return false;return ex.apply(document,arguments);};}}catch(e){}" +
            "try{window.AndroidNative=undefined;}catch(e){}" +
          "})();";
    }

    @Override
    protected void onResume() {
        super.onResume();
        applyWindowFeatureFlags();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (billingBridge != null) billingBridge.destroy();
        if (playBillingPlugin != null) playBillingPlugin.destroy();
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    private static class FeatureLockedWebView extends WebView {
        FeatureLockedWebView(Context context) {
            super(context);
        }

        @Override
        public boolean dispatchTouchEvent(MotionEvent event) {
            if (!BuildConfig.ALLOW_ZOOM && event != null && event.getPointerCount() > 1) {
                return true;
            }
            return super.dispatchTouchEvent(event);
        }

        @Override
        public boolean onTouchEvent(MotionEvent event) {
            if (!BuildConfig.ALLOW_ZOOM && event != null && event.getPointerCount() > 1) {
                return true;
            }
            return super.onTouchEvent(event);
        }
    }
}
