"""Servidor local de archivos estáticos. No requiere instalar paquetes."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Iniciar PocketStore en localhost')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
    with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
        print(f'PocketStore: http://localhost:{args.port} (Ctrl+C para detener)', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
