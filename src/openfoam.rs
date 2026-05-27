use std::process::Command;

pub fn status_json() -> String {
    let commands = [
        command_path("openfoam"),
        command_path("simpleFoam"),
        command_path("blockMesh"),
        command_path("surfaceFeatureExtract"),
    ];
    let found: Vec<(&str, String)> = commands
        .iter()
        .filter_map(|result| result.as_ref().map(|(name, path)| (*name, path.clone())))
        .collect();
    let status = if found.is_empty() {
        "missing"
    } else {
        "available"
    };
    let version = if found.is_empty() {
        None
    } else {
        openfoam_version()
    };
    let detail = if found.is_empty() {
        "No OpenFOAM commands were found on PATH."
    } else {
        "OpenFOAM command-line tools were found on PATH."
    };
    let commands_json = found
        .iter()
        .map(|(name, path)| {
            format!(
                "{{\"name\":\"{}\",\"path\":\"{}\"}}",
                escape_json(name),
                escape_json(path)
            )
        })
        .collect::<Vec<_>>()
        .join(",");

    format!(
        "{{\"status\":\"{}\",\"detail\":\"{}\",\"version\":\"{}\",\"commands\":[{}]}}",
        status,
        escape_json(detail),
        escape_json(version.as_deref().unwrap_or("unknown")),
        commands_json
    )
}

fn command_path(command: &'static str) -> Option<(&'static str, String)> {
    let output = Command::new("sh")
        .arg("-lc")
        .arg(format!("command -v {command}"))
        .output()
        .ok()?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if path.is_empty() {
            None
        } else {
            Some((command, path))
        }
    } else {
        None
    }
}

fn openfoam_version() -> Option<String> {
    let probes = [
        "command -v openfoam >/dev/null && timeout 2 openfoam --version 2>/dev/null",
        "command -v simpleFoam >/dev/null && timeout 2 simpleFoam -help 2>&1 | head -n 1",
    ];

    for probe in probes {
        let output = Command::new("sh").arg("-lc").arg(probe).output().ok()?;
        if output.status.success() || !output.stdout.is_empty() || !output.stderr.is_empty() {
            let combined = format!(
                "{}{}",
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            );
            let first_line = combined
                .lines()
                .map(str::trim)
                .find(|line| !line.is_empty())?;
            return Some(first_line.to_string());
        }
    }

    None
}

fn escape_json(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
}
