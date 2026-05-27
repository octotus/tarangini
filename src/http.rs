use std::io::{self, Write};
use std::net::TcpStream;
use std::path::{Component, Path, PathBuf};

pub fn requested_path(root: &Path, target: &str) -> Option<PathBuf> {
    let route = target.split('?').next().unwrap_or("/");
    let route = if route == "/" { "/index.html" } else { route };
    let relative = route.strip_prefix('/')?;
    let mut clean = PathBuf::new();

    for component in Path::new(relative).components() {
        match component {
            Component::Normal(part) => clean.push(part),
            Component::CurDir => {}
            _ => return None,
        }
    }

    Some(root.join(clean))
}

pub fn content_type(path: &Path) -> &'static str {
    match path.extension().and_then(|extension| extension.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        Some("json") => "application/json; charset=utf-8",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        _ => "application/octet-stream",
    }
}

pub fn respond(
    stream: &mut TcpStream,
    status_code: u16,
    reason: &str,
    content_type: &str,
    body: &[u8],
    headers_only: bool,
) -> io::Result<()> {
    write!(
        stream,
        "HTTP/1.1 {status_code} {reason}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    )?;

    if headers_only {
        Ok(())
    } else {
        stream.write_all(body)
    }
}
