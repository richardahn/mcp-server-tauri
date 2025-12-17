use tauri::{Runtime, WebviewWindow};

// Platform-specific modules
#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "ios")]
mod ios;

#[cfg(target_os = "android")]
mod android;

/// Screenshot result containing the image data
#[derive(Debug)]
pub struct Screenshot {
    /// The raw PNG bytes
    pub data: Vec<u8>,
}

/// Screenshot error types
#[derive(Debug, thiserror::Error)]
pub enum ScreenshotError {
    #[error("Platform not supported")]
    PlatformUnsupported,

    #[error("Webview capture failed: {0}")]
    CaptureFailed(String),

    #[error("Encoding failed: {0}")]
    EncodeFailed(String),

    #[error("Timeout exceeded")]
    Timeout,
}

/// Platform-specific screenshot implementation trait
pub trait PlatformScreenshot {
    /// Capture a screenshot of the current viewport
    fn capture_viewport(
        window: &WebviewWindow<impl Runtime>,
    ) -> Result<Screenshot, ScreenshotError>;
}

/// Capture a screenshot of the current viewport using platform-specific APIs
pub async fn capture_viewport_screenshot<R: Runtime>(
    window: &WebviewWindow<R>,
    format: &str,
    quality: u8,
) -> Result<String, ScreenshotError> {
    // Dispatch to platform-specific implementation
    #[cfg(target_os = "macos")]
    let screenshot = macos::capture_viewport(window)?;

    #[cfg(target_os = "windows")]
    let screenshot = windows::capture_viewport(window)?;

    #[cfg(target_os = "linux")]
    let screenshot = linux::capture_viewport(window)?;

    #[cfg(target_os = "ios")]
    let screenshot = ios::capture_viewport(window)?;

    #[cfg(target_os = "android")]
    let screenshot = android::capture_viewport(window)?;

    #[cfg(not(any(
        target_os = "macos",
        target_os = "windows",
        target_os = "linux",
        target_os = "ios",
        target_os = "android"
    )))]
    return Err(ScreenshotError::PlatformUnsupported);

    // Platform APIs return PNG data. Convert to requested format if needed.
    let (final_data, mime_type) = if format == "jpeg" {
        // Convert PNG to JPEG using image crate
        match convert_png_to_jpeg(&screenshot.data, quality) {
            Ok(jpeg_data) => (jpeg_data, "image/jpeg"),
            Err(_) => {
                // Fallback to PNG if conversion fails
                (screenshot.data, "image/png")
            }
        }
    } else {
        // Return PNG as-is
        (screenshot.data, "image/png")
    };

    use base64::Engine as _;
    let base64_data = base64::engine::general_purpose::STANDARD.encode(&final_data);
    let data_url = format!("data:{mime_type};base64,{base64_data}");

    Ok(data_url)
}

/// Convert PNG bytes to JPEG with specified quality
fn convert_png_to_jpeg(png_data: &[u8], quality: u8) -> Result<Vec<u8>, ScreenshotError> {
    use image::ImageFormat;
    use std::io::Cursor;

    // Decode PNG
    let img = image::load_from_memory_with_format(png_data, ImageFormat::Png)
        .map_err(|e| ScreenshotError::EncodeFailed(format!("Failed to decode PNG: {}", e)))?;

    // Encode as JPEG
    let mut jpeg_buffer = Cursor::new(Vec::new());
    let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut jpeg_buffer, quality);
    img.write_with_encoder(encoder)
        .map_err(|e| ScreenshotError::EncodeFailed(format!("Failed to encode JPEG: {}", e)))?;

    Ok(jpeg_buffer.into_inner())
}