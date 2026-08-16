// Milestone 42 spike -- NOT part of the app, temporary and throwaway.
// Proves the Gemini Live WebSocket wire protocol works from Rust before
// building any real pipeline around it: connect, send `setup`, wait for
// `setupComplete`. Nothing else -- no audio, no wake word, no AEC.
//
// Reads the real API key from the same config.json the Python voice
// scripts already use (~/Documents/Obsidian Vault/System/voice/config.json)
// rather than hardcoding it, matching this project's "never commit
// credentials" rule even in a throwaway spike.
//
// Run with: cargo run --bin gemini_live_spike

use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::time::Duration;
use tokio_tungstenite::tungstenite::Message;

fn read_api_key() -> String {
    let home = std::env::var("HOME").expect("HOME not set");
    let config_path =
        std::path::PathBuf::from(home).join("Documents/Obsidian Vault/System/voice/config.json");
    let raw = std::fs::read_to_string(&config_path)
        .unwrap_or_else(|e| panic!("failed to read {config_path:?}: {e}"));
    let parsed: serde_json::Value = serde_json::from_str(&raw).expect("config.json is not valid JSON");
    parsed["gemini_api_key"]
        .as_str()
        .expect("config.json has no gemini_api_key")
        .to_string()
}

#[tokio::main]
async fn main() {
    // rustls 0.23 requires explicitly picking a crypto backend at process
    // start rather than assuming one -- real error hit on first run:
    // "Could not automatically determine the process-level CryptoProvider".
    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("failed to install rustls crypto provider");

    let api_key = read_api_key();
    let url = format!(
        "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={api_key}"
    );

    println!("Connecting...");
    let (mut ws, response) = tokio_tungstenite::connect_async(&url)
        .await
        .expect("failed to connect");
    println!("Connected, HTTP status: {}", response.status());

    let setup = json!({
        "setup": {
            "model": "models/gemini-3.1-flash-live-preview",
            "generationConfig": { "responseModalities": ["AUDIO"] }
        }
    });
    println!("Sending setup: {setup}");
    ws.send(Message::Text(setup.to_string().into()))
        .await
        .expect("failed to send setup");

    println!("Waiting for setupComplete (10s timeout)...");
    let result = tokio::time::timeout(Duration::from_secs(10), async {
        loop {
            match ws.next().await {
                Some(Ok(Message::Text(text))) => {
                    println!("Received text: {text}");
                    let parsed: serde_json::Value =
                        serde_json::from_str(&text).unwrap_or(serde_json::Value::Null);
                    if parsed.get("setupComplete").is_some() {
                        return true;
                    }
                }
                Some(Ok(Message::Binary(data))) => {
                    // Real finding, first run: Gemini Live sends JSON as
                    // binary WebSocket frames, not text frames -- the
                    // payload is UTF-8 JSON bytes, just not tagged as a
                    // text frame the way tungstenite's Message::Text is.
                    let text = String::from_utf8_lossy(&data);
                    println!("Received binary ({} bytes) as text: {text}", data.len());
                    let parsed: serde_json::Value =
                        serde_json::from_str(&text).unwrap_or(serde_json::Value::Null);
                    if parsed.get("setupComplete").is_some() {
                        return true;
                    }
                }
                Some(Ok(other)) => {
                    println!("Received other frame: {other:?}");
                }
                Some(Err(e)) => {
                    println!("WebSocket error: {e}");
                    return false;
                }
                None => {
                    println!("Stream ended");
                    return false;
                }
            }
        }
    })
    .await;

    match result {
        Ok(true) => println!("\n✅ SUCCESS: received setupComplete."),
        Ok(false) => println!("\n❌ FAILED: stream ended or errored before setupComplete."),
        Err(_) => println!("\n❌ FAILED: timed out waiting for setupComplete."),
    }
}
