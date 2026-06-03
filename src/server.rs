use crate::{http, openfoam};
use std::fs;
use std::io::{self, BufRead, BufReader};
use std::net::{TcpListener, TcpStream};
use std::path::Path;

const HOST: &str = "127.0.0.1";
const PORT: u16 = 5173;

pub fn run() -> io::Result<()> {
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
    let headers = read_headers(&mut reader)?;

    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default();
    let target = parts.next().unwrap_or("/");
    let is_head = method == "HEAD";

    if method != "GET" && !is_head && method != "POST" {
        return http::respond(
            &mut stream,
            405,
            "Method Not Allowed",
            "text/plain; charset=utf-8",
            b"Only GET, HEAD, and selected POST routes are supported by the MVP server.",
            false,
        );
    }

    if method == "POST" {
        if target == "/api/openfoam/install" {
            let has_permission = headers.iter().any(|header| {
                header
                    .to_ascii_lowercase()
                    .starts_with("x-tarangini-install: openfoam-source")
            });
            let (status, body) = if has_permission {
                (200, openfoam::install_source_json(root))
            } else {
                (
                    403,
                    openfoam::install_denied_json(
                        "OpenFOAM installation requires an explicit user permission header.",
                    ),
                )
            };
            return http::respond(
                &mut stream,
                status,
                if status == 200 { "OK" } else { "Forbidden" },
                "application/json; charset=utf-8",
                body.as_bytes(),
                false,
            );
        }

        return http::respond(
            &mut stream,
            404,
            "Not Found",
            "text/plain; charset=utf-8",
            b"Unknown POST route.",
            false,
        );
    }

    if target == "/api/health" {
        return http::respond(
            &mut stream,
            200,
            "OK",
            "application/json; charset=utf-8",
            br#"{"status":"ok","runtime":"rust","app":"tarangini-mvp"}"#,
            is_head,
        );
    }

    if target == "/api/openfoam" {
        let body = openfoam::status_json();
        return http::respond(
            &mut stream,
            200,
            "OK",
            "application/json; charset=utf-8",
            body.as_bytes(),
            is_head,
        );
    }

    let path = match http::requested_path(root, target) {
        Some(path) => path,
        None => {
            return http::respond(
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
        Ok(bytes) => http::respond(
            &mut stream,
            200,
            "OK",
            http::content_type(&path),
            &bytes,
            is_head,
        ),
        Err(error) if error.kind() == io::ErrorKind::NotFound => http::respond(
            &mut stream,
            404,
            "Not Found",
            "text/plain; charset=utf-8",
            b"Not found.",
            is_head,
        ),
        Err(error) => {
            eprintln!("failed reading {}: {error}", path.display());
            http::respond(
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

fn read_headers(reader: &mut BufReader<TcpStream>) -> io::Result<Vec<String>> {
    let mut headers = Vec::new();

    loop {
        let mut line = String::new();
        let bytes = reader.read_line(&mut line)?;
        if bytes == 0 || line == "\r\n" || line == "\n" {
            break;
        }
        headers.push(line.trim_end().to_string());
    }

    Ok(headers)
}
