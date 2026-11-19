package studio.patchforge;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
public class Studio extends Activity {
 private ValueCallback<Uri[]> picker;
 @Override public void onCreate(Bundle state){super.onCreate(state);WebView web=new WebView(this);setContentView(web);
 web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);
 web.setWebViewClient(new WebViewClient(){public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();if(!"https".equals(u.getScheme()))return true;if(Uri.parse(BuildConfig.URL).getAuthority().equals(u.getAuthority()))return false;startActivity(new Intent(Intent.ACTION_VIEW,u));return true;}});
 web.setWebChromeClient(new WebChromeClient(){public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams p){if(picker!=null)picker.onReceiveValue(null);picker=cb;startActivityForResult(p.createIntent(),2);return true;}});
 web.setDownloadListener((url,ua,cd,mime,len)->{if(url.startsWith("https://"))startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));});web.loadUrl(BuildConfig.URL);}
 @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(req==2&&picker!=null){picker.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data));picker=null;}}
}
