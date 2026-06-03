use std::fs;
use std::path::Path;
use std::process::Command;

const OPENFOAM_REPO: &str = "https://github.com/OpenFOAM/OpenFOAM-13.git";
const THIRDPARTY_REPO: &str = "https://github.com/OpenFOAM/ThirdParty-13.git";

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

pub fn install_source_json(root: &Path) -> String {
    let install_root = root.join(".tarangini").join("openfoam");
    let openfoam_dir = install_root.join("OpenFOAM-13");
    let thirdparty_dir = install_root.join("ThirdParty-13");
    let activation_script = install_root.join("activate-openfoam.sh");

    if let Err(error) = fs::create_dir_all(&install_root) {
        return install_error_json(&format!("Could not create install directory: {error}"));
    }

    let openfoam_result = clone_or_update_repo(OPENFOAM_REPO, &openfoam_dir);
    if !openfoam_result.success {
        return install_result_json(
            "failed",
            &openfoam_result.detail,
            &install_root,
            &activation_script,
        );
    }

    let thirdparty_result = clone_or_update_repo(THIRDPARTY_REPO, &thirdparty_dir);
    if !thirdparty_result.success {
        return install_result_json(
            "failed",
            &thirdparty_result.detail,
            &install_root,
            &activation_script,
        );
    }

    let script = format!(
        "#!/usr/bin/env sh\n# Tarangini-managed OpenFOAM source activation.\n# Source this after compiling OpenFOAM-13.\nexport WM_PROJECT_INST_DIR=\"{}\"\nif [ -f \"$WM_PROJECT_INST_DIR/OpenFOAM-13/etc/bashrc\" ]; then\n  . \"$WM_PROJECT_INST_DIR/OpenFOAM-13/etc/bashrc\"\nfi\n",
        escape_json(&install_root.display().to_string())
    );

    if let Err(error) = fs::write(&activation_script, script) {
        return install_error_json(&format!("Could not write activation script: {error}"));
    }

    install_result_json(
        "source-ready",
        "Official OpenFOAM-13 and ThirdParty-13 source repositories are present. Compilation is still required before solver commands are available.",
        &install_root,
        &activation_script,
    )
}

pub fn install_denied_json(detail: &str) -> String {
    format!(
        "{{\"status\":\"denied\",\"detail\":\"{}\",\"installRoot\":null,\"activationScript\":null}}",
        escape_json(detail)
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

struct InstallStep {
    success: bool,
    detail: String,
}

fn clone_or_update_repo(repo_url: &str, target: &Path) -> InstallStep {
    if target.join(".git").exists() {
        run_git(
            &["-C", &target.display().to_string(), "pull", "--ff-only"],
            &format!("Updated {}", target.display()),
        )
    } else {
        run_git(
            &[
                "clone",
                "--depth",
                "1",
                repo_url,
                &target.display().to_string(),
            ],
            &format!("Cloned {repo_url}"),
        )
    }
}

fn run_git(args: &[&str], success_detail: &str) -> InstallStep {
    let output = Command::new("git").args(args).output();

    match output {
        Ok(output) if output.status.success() => InstallStep {
            success: true,
            detail: success_detail.to_string(),
        },
        Ok(output) => InstallStep {
            success: false,
            detail: format!(
                "git {} failed: {}{}",
                args.join(" "),
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr)
            ),
        },
        Err(error) => InstallStep {
            success: false,
            detail: format!("Could not run git: {error}"),
        },
    }
}

fn install_result_json(
    status: &str,
    detail: &str,
    install_root: &Path,
    activation_script: &Path,
) -> String {
    format!(
        "{{\"status\":\"{}\",\"detail\":\"{}\",\"installRoot\":\"{}\",\"activationScript\":\"{}\",\"repositories\":[{{\"name\":\"OpenFOAM-13\",\"url\":\"{}\"}},{{\"name\":\"ThirdParty-13\",\"url\":\"{}\"}}]}}",
        escape_json(status),
        escape_json(detail),
        escape_json(&install_root.display().to_string()),
        escape_json(&activation_script.display().to_string()),
        escape_json(OPENFOAM_REPO),
        escape_json(THIRDPARTY_REPO)
    )
}

fn install_error_json(detail: &str) -> String {
    format!(
        "{{\"status\":\"failed\",\"detail\":\"{}\",\"installRoot\":null,\"activationScript\":null}}",
        escape_json(detail)
    )
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
