use super::{Screenshot, ScreenshotError};
use tauri::{Runtime, WebviewWindow};

/// iOS-specific screenshot implementation using WKWebView's takeSnapshot
///
/// This implementation captures only the visible viewport, not the full document.
/// Similar to macOS but works with UIImage instead of NSImage.
pub fn capture_viewport<R: Runtime>(
    window: &WebviewWindow<R>,
) -> Result<Screenshot, ScreenshotError> {
    #[cfg(target_os = "ios")]
    {
        use block2::RcBlock;
        use objc2_foundation::NSError;
        use objc2_ui_kit::UIImage;
        use objc2_web_kit::{WKSnapshotConfiguration, WKWebView};
        use std::sync::mpsc;
        use std::sync::{Arc, Mutex};

        let (tx, rx) = mpsc::channel::<Result<Screenshot, ScreenshotError>>();
        let tx = Arc::new(Mutex::new(Some(tx)));

        // Use Tauri's with_webview to access the platform-specific webview
        window
            .with_webview(move |webview| {
                unsafe {
                    // Get the WKWebView from Tauri's webview handle
                    let wkwebview: &WKWebView = &*(webview.inner() as *const _ as *const WKWebView);

                    // Create snapshot configuration (nil means capture visible viewport)
                    let config = WKSnapshotConfiguration::new();

                    // Create completion handler block
                    let tx_clone = tx.clone();
                    let handler = RcBlock::new(move |image: *mut UIImage, error: *mut NSError| {
                        if let Some(tx) = tx_clone.lock().unwrap().take() {
                            if !error.is_null() {
                                let err = &*error;
                                let desc = err.localizedDescription();
                                let error_string = desc.to_string();
                                let _ = tx.send(Err(ScreenshotError::CaptureFailed(error_string)));
                            } else if !image.is_null() {
                                let img = &*image;
                                // Convert UIImage to PNG data
                                match convert_uiimage_to_png(img) {
                                    Ok(data) => {
                                        let _ = tx.send(Ok(Screenshot { data }));
                                    }
                                    Err(e) => {
                                        let _ = tx.send(Err(e));
                                    }
                                }
                            } else {
                                let _ = tx.send(Err(ScreenshotError::CaptureFailed(
                                    "No image returned from snapshot".to_string(),
                                )));
                            }
                        }
                    });

                    // Take snapshot
                    wkwebview
                        .takeSnapshotWithConfiguration_completionHandler(Some(&config), &handler);
                }
            })
            .map_err(|e| {
                ScreenshotError::CaptureFailed(format!("Failed to access webview: {}", e))
            })?;

        // Wait for result
        match rx.recv_timeout(std::time::Duration::from_secs(10)) {
            Ok(result) => result,
            Err(_) => Err(ScreenshotError::Timeout),
        }
    }

    #[cfg(not(target_os = "ios"))]
    {
        Err(ScreenshotError::PlatformUnsupported)
    }
}

#[cfg(target_os = "ios")]
unsafe fn convert_uiimage_to_png(
    image: &objc2_ui_kit::UIImage,
) -> Result<Vec<u8>, ScreenshotError> {
    use objc2::msg_send;
    use objc2::runtime::{AnyClass, Sel};
    use objc2_foundation::NSData;

    // UIImagePNGRepresentation is a C function, call it via runtime
    // Alternatively, use pngData() method on UIImage (iOS 11+)
    let png_data: *mut NSData = msg_send![image, pngData];

    if png_data.is_null() {
        return Err(ScreenshotError::EncodeFailed(
            "Failed to create PNG data".to_string(),
        ));
    }

    let data = &*png_data;
    let length = data.len();
    let bytes = data.bytes();
    let buffer = std::slice::from_raw_parts(bytes.as_ptr(), length).to_vec();

    Ok(buffer)
}
