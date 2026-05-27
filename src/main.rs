mod http;
mod openfoam;
mod server;

use std::io;

fn main() -> io::Result<()> {
    server::run()
}
