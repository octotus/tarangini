use std::fs;
use std::io::{self, BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Component, Path, PathBuf};

const HOST: &str = "127.0.0.1";
const PORT: u16 = 5173;

fn main() -> io::Result<()> {
    let root = std::env::current_dir()?;
    let listener = TcpListener::bind((HOST, PORT))?;

    println!("Tarangini MVP running at http://{HOST}:{PORT}");
    println!("Serving files from {}", root.display());

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                if let Err(error) = handle_connection(stream, &root) {
                    eprintln!("request failed: {error}");
                }
            }
            Err(error) => eprintln!("connection failed: {error}"),
        }
    }

    Ok(())
}

fn handle_connection(mut stream: TcpStream, root: &Path) -> io::Result<()> {
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut request_line = String::new();
    reader.read_line(&mut request_line)?;

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default();
    let target = parts.next().unwrap_or("/");

    let is_head = method == "HEAD";

    if method != "GET" && !is_head {
        return respond(
            &mut stream,
            405,
            "Method Not Allowed",
            "text/plain; charset=utf-8",
            b"Only GET and HEAD are supported by the MVP server.",
            false,
        );
    }

    if target == "/api/health" {
        return respond(
            &mut stream,
            200,
            "OK",
            "application/json; charset=utf-8",
            br#"{"status":"ok","runtime":"rust","app":"tarangini-mvp"}"#,
            is_head,
        );
    }

    let path = match requested_path(root, target) {
        Some(path) => path,
        None => {
            return respond(
                &mut stream,
                400,
                "Bad Request",
                "text/plain; charset=utf-8",
                b"Invalid path.",
                is_head,
            );
        }
    };

    match fs::read(&path) {
        Ok(bytes) => respond(&mut stream, 200, "OK", content_type(&path), &bytes, is_head),
        Err(error) if error.kind() == io::ErrorKind::NotFound => respond(
            &mut stream,
            404,
            "Not Found",
            "text/plain; charset=utf-8",
            b"Not found.",
            is_head,
        ),
        Err(error) => {
            eprintln!("failed reading {}: {error}", path.display());
            respond(
                &mut stream,
                500,
                "Internal Server Error",
                "text/plain; charset=utf-8",
                b"Unable to read requested file.",
                is_head,
            )
        }
    }
}

fn requested_path(root: &Path, target: &str) -> Option<PathBuf> {
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

fn content_type(path: &Path) -> &'static str {
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

fn respond(
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
