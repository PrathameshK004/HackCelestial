package com.hackcelestial.grouptrip;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native Android UPI Callback Bridge Plugin
 * Executes UPI Intent via startActivityForResult and captures exact real-time
 * SUCCESS / CANCELLED status directly from PhonePe, Google Pay, and Paytm.
 */
@CapacitorPlugin(name = "UpiPayment")
public class UpiPlugin extends Plugin {

    @PluginMethod
    public void startPayment(PluginCall call) {
        String uriString = call.getString("url");
        if (uriString == null || uriString.isEmpty()) {
            call.reject("Payment URL is required");
            return;
        }

        try {
            // 1. Convert any Chrome intent:// format into standard Android upi:// scheme
            String upiUriString = uriString;
            String targetPackage = call.getString("packageName");

            if (uriString.startsWith("intent://")) {
                if (targetPackage == null || targetPackage.isEmpty()) {
                    int pkgIdx = uriString.indexOf("package=");
                    if (pkgIdx != -1) {
                        int endIdx = uriString.indexOf(";", pkgIdx);
                        if (endIdx != -1) {
                            targetPackage = uriString.substring(pkgIdx + 8, endIdx);
                        } else {
                            targetPackage = uriString.substring(pkgIdx + 8);
                        }
                    }
                }
                // Convert intent://pay?...#Intent;... to upi://pay?...
                upiUriString = uriString.replaceFirst("^intent://", "upi://").replaceAll("#Intent;.*$", "");
            }

            Uri uri = Uri.parse(upiUriString);
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);

            if (targetPackage != null && !targetPackage.trim().isEmpty()) {
                intent.setPackage(targetPackage.trim());
            }

            android.content.pm.PackageManager pm = getContext().getPackageManager();

            // 2. If the target app (e.g. Google Pay) is installed, launch it directly
            if (intent.resolveActivity(pm) != null) {
                startActivityForResult(call, intent, "paymentResult");
                return;
            }

            // 3. Fallback: If requested app is not installed, open any installed UPI app via Android chooser
            Intent genericIntent = new Intent(Intent.ACTION_VIEW, uri);
            if (genericIntent.resolveActivity(pm) != null) {
                Intent chooser = Intent.createChooser(genericIntent, "Pay with UPI");
                startActivityForResult(call, chooser, "paymentResult");
                return;
            }

            call.reject("No UPI app (PhonePe, Google Pay, or Paytm) was found on this device.");
        } catch (Exception e) {
            call.reject("Failed to launch UPI App: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void paymentResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        JSObject ret = new JSObject();
        int resultCode = result.getResultCode();
        Intent data = result.getData();

        if (resultCode == Activity.RESULT_OK && data != null) {
            String response = data.getStringExtra("response");
            if (response == null) {
                response = data.getDataString();
            }

            ret.put("rawResponse", response != null ? response : "");

            // Parse NPCI response string:
            // Status=SUCCESS&txnId=...&responseCode=00&ApprovalRefNo=428190382910
            if (response != null && (response.toLowerCase().contains("success") || response.contains("Status=SUCCESS"))) {
                ret.put("status", "SUCCESS");
                String utr = extractUtr(response);
                ret.put("utr", utr);
            } else if (response != null && (response.toLowerCase().contains("fail") || response.contains("Status=FAILURE"))) {
                ret.put("status", "FAILURE");
                ret.put("message", "Payment failed or rejected by bank");
            } else {
                ret.put("status", "SUBMITTED");
                ret.put("message", "Payment in processing / pending state");
            }
        } else if (resultCode == Activity.RESULT_CANCELED) {
            ret.put("status", "CANCELLED");
            ret.put("message", "User canceled payment in UPI app");
        } else {
            ret.put("status", "CANCELLED");
            ret.put("message", "Payment not completed");
        }

        call.resolve(ret);
    }

    private String extractUtr(String response) {
        if (response == null) return "";
        try {
            for (String param : response.split("&")) {
                String[] pair = param.split("=");
                if (pair.length == 2) {
                    String key = pair[0].trim();
                    String val = pair[1].trim();
                    if (key.equalsIgnoreCase("ApprovalRefNo") || key.equalsIgnoreCase("txnRef") || key.equalsIgnoreCase("BankRRN")) {
                        return val;
                    }
                }
            }
        } catch (Exception ignored) {}
        return "";
    }
}
