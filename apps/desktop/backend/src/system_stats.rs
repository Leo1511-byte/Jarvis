use serde::Serialize;
use sysinfo::{Disks, System};

/// Milestone 37 (System/Settings real performance stats) — real CPU/
/// memory/disk numbers for `SystemView.tsx`'s Performance panel, per
/// `PROJECT_OBJECTIVE.md`'s rule that every number shown must be real,
/// not decorative. No network figure (kept deliberately narrow — CPU/
/// memory/disk cover the same ground the reference image's Performance
/// Monitor panel showed, without sysinfo's more platform-variable
/// network API).
#[derive(Serialize)]
pub struct SystemStats {
    pub cpu_percent: f32,
    pub memory_used_gb: f64,
    pub memory_total_gb: f64,
    pub disk_used_gb: f64,
    pub disk_total_gb: f64,
}

const BYTES_PER_GB: f64 = 1_073_741_824.0;

/// Written from memory against a commonly-stable slice of the `sysinfo`
/// API (System::new_all/refresh_cpu_usage/refresh_memory,
/// Disks::new_with_refreshed_list) -- NOT verified against whatever
/// version `cargo add sysinfo` actually resolves, since this session has
/// no `cargo`. Higher risk than most of this repo's other Rust additions
/// (see docs/DESKTOP_LAUNCHER.md-style handoffs): those reused Tauri's
/// own already-present APIs, this pulls in a brand-new dependency this
/// session has never compiled. If method names have moved between
/// sysinfo versions, fix against the actual installed version's docs
/// rather than guessing further.
///
/// CPU usage needs two refreshes with a real delay between them to be
/// accurate (sysinfo's own documented requirement, not a workaround) --
/// that's the `sleep` below. Runs on Tauri's blocking-command thread
/// pool (this is a sync `fn`, not `async`), so the ~200ms sleep doesn't
/// block the UI thread, but don't call this in a tight polling loop.
#[tauri::command]
pub fn get_system_stats() -> SystemStats {
    let mut sys = System::new_all();
    sys.refresh_cpu_usage();
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cpu_percent = sys.global_cpu_usage();
    let memory_used_gb = sys.used_memory() as f64 / BYTES_PER_GB;
    let memory_total_gb = sys.total_memory() as f64 / BYTES_PER_GB;

    let disks = Disks::new_with_refreshed_list();
    let (disk_used_gb, disk_total_gb) = disks
        .list()
        .iter()
        .find(|d| d.mount_point().to_str() == Some("/"))
        .map(|d| {
            let total = d.total_space() as f64 / BYTES_PER_GB;
            let available = d.available_space() as f64 / BYTES_PER_GB;
            (total - available, total)
        })
        .unwrap_or((0.0, 0.0));

    SystemStats {
        cpu_percent,
        memory_used_gb,
        memory_total_gb,
        disk_used_gb,
        disk_total_gb,
    }
}
