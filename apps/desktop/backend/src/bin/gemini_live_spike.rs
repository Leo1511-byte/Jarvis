// Milestone 42 spike -- NOT part of the app, temporary and throwaway.
//
// Phase 1: prove the Gemini Live WebSocket wire protocol works from Rust
// (connect, send `setup`, wait for `setupComplete`).
//
// Phase 2 (2026-08-15, real architecture decision): prove the "obedient
// relay" assumption the whole M42 redesign depends on -- that Gemini Live
// can be instructed, via system_instruction, to speak text back verbatim
// instead of freely conversing. Sends a fixed line of text via
// send_client_content-equivalent (raw `clientContent`) and checks the
// server's own output_transcription against what was actually asked for,
// entirely in text -- no audio hardware needed to verify this.
//
// Reads the real API key from the same config.json the Python voice
// scripts already use (~/Documents/Obsidian Vault/System/voice/config.json)
// rather than hardcoding it, matching this project's "never commit
// credentials" rule even in a throwaway spike.
//
// Run with: cargo run --bin gemini_live_spike

use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::time::Duration;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::MaybeTlsStream;
use tokio::net::TcpStream;

type Ws = WebSocketStream<MaybeTlsStream<TcpStream>>;

fn read_api_key() -> String {
    let home = std::env::var("HOME").expect("HOME not set");
    let config_path =
        std::path::PathBuf::from(home).join("Documents/Obsidian Vault/System/voice/config.json");
    let raw = std::fs::read_to_string(&config_path)
        .unwrap_or_else(|e| panic!("failed to read {config_path:?}: {e}"));
    let parsed: Value = serde_json::from_str(&raw).expect("config.json is not valid JSON");
    parsed["gemini_api_key"]
        .as_str()
        .expect("config.json has no gemini_api_key")
        .to_string()
}

/// Reads one message, whether it arrives as a Text or Binary frame (Gemini
/// Live uses Binary -- see the module comment / TASKS.md's real finding),
/// and returns it parsed as JSON. None on stream end or a non-data frame.
async fn recv_json(ws: &mut Ws) -> Option<Value> {
    loop {
        match ws.next().await? {
            Ok(Message::Text(text)) => return serde_json::from_str(&text).ok(),
            Ok(Message::Binary(data)) => {
                let text = String::from_utf8_lossy(&data);
                return serde_json::from_str(&text).ok();
            }
            Ok(_) => continue, // ping/pong/close -- not a data frame, keep reading
            Err(e) => {
                println!("WebSocket error: {e}");
                return None;
            }
        }
    }
}

async fn send_json(ws: &mut Ws, value: &Value) {
    ws.send(Message::Text(value.to_string().into()))
        .await
        .expect("failed to send");
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

    println!("=== Phase 1: connect + setup ===");
    println!("Connecting...");
    let (mut ws, response) = tokio_tungstenite::connect_async(&url)
        .await
        .expect("failed to connect");
    println!("Connected, HTTP status: {}", response.status());

    // 2026-08-15: the "obedient relay" system instruction the whole M42
    // redesign depends on -- Gemini should never decide what to say, only
    // relay text Claude Code (the real decision-maker) hands it. Strict
    // and repetitive on purpose: this is the one assumption this whole
    // spike exists to test, not something to under-specify.
    let system_instruction =
        "You are a text-to-speech relay, not a conversational assistant. You will be given a \
         line of text. Speak it back exactly as given, word for word, verbatim. Do not add any \
         commentary, do not rephrase it, do not answer questions, do not have a conversation. \
         Only read the given text aloud exactly as provided, then stop.";

    let setup = json!({
        "setup": {
            "model": "models/gemini-3.1-flash-live-preview",
            "generationConfig": { "responseModalities": ["AUDIO"] },
            "systemInstruction": { "parts": [{ "text": system_instruction }] },
            "outputAudioTranscription": {}
        }
    });
    println!("Sending setup: {setup}");
    send_json(&mut ws, &setup).await;

    println!("Waiting for setupComplete (10s timeout)...");
    let setup_ok = tokio::time::timeout(Duration::from_secs(10), async {
        loop {
            match recv_json(&mut ws).await {
                Some(parsed) => {
                    println!("Received: {parsed}");
                    if parsed.get("setupComplete").is_some() {
                        return true;
                    }
                }
                None => return false,
            }
        }
    })
    .await
    .unwrap_or(false);

    if !setup_ok {
        println!("\n❌ FAILED at phase 1: never got setupComplete.");
        return;
    }
    println!("✅ Phase 1 OK: setupComplete received.\n");

    println!("=== Phase 2: obedient relay test ===");
    let expected_text =
        "Three new clients this week. Copper and Ry came off the outbound campaign.";
    let client_content = json!({
        "clientContent": {
            "turns": [{ "role": "user", "parts": [{ "text": expected_text }] }],
            "turnComplete": true
        }
    });
    println!("Sending text to relay: {expected_text:?}");
    send_json(&mut ws, &client_content).await;

    println!("Waiting for the spoken-back transcript (turnComplete, 20s timeout)...");
    let mut spoken_text = String::new();
    let relay_result = tokio::time::timeout(Duration::from_secs(20), async {
        loop {
            let parsed = match recv_json(&mut ws).await {
                Some(p) => p,
                None => return false,
            };
            if let Some(content) = parsed.get("serverContent") {
                if let Some(t) = content
                    .get("outputTranscription")
                    .and_then(|o| o.get("text"))
                    .and_then(|t| t.as_str())
                {
                    print!("{t}");
                    spoken_text.push_str(t);
                }
                if content.get("turnComplete").and_then(|v| v.as_bool()) == Some(true) {
                    println!();
                    return true;
                }
            }
        }
    })
    .await
    .unwrap_or(false);

    if !relay_result {
        println!("\n❌ FAILED at phase 2: never got a completed turn back.");
        return;
    }

    println!("\nExpected: {expected_text:?}");
    println!("Actually spoken (per output_transcription): {spoken_text:?}");

    let normalize = |s: &str| s.to_lowercase().chars().filter(|c| c.is_alphanumeric()).collect::<String>();
    if normalize(&spoken_text) == normalize(expected_text) {
        println!("\n✅ SUCCESS: Gemini spoke the text verbatim, not conversationally.");
    } else {
        println!(
            "\n⚠️  MISMATCH: Gemini did not repeat the text verbatim -- it may have treated \
             this as conversation instead of a relay instruction. The 'obedient relay' \
             assumption needs more prompt engineering (or the two-API-call design) before M42 \
             builds on top of it."
        );
    }
}
