"""A static server for the QA scripts that answers like nginx.conf does: a file, a directory's index.html, or
<path>.html, and a missing path gets dist/404.html with status 404 (`python3 -m http.server` sends its own error
page instead, so the site's 404 page could not be audited).
Usage: python3 scripts/qa/serve.py dist 4321"""
import http.server, os, sys

ROOT, PORT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist'), int(sys.argv[2] if len(sys.argv) > 2 else 4321)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a): pass

    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) and os.path.exists(path.rstrip('/') + '.html'):  # try_files $uri.html
            self.path = self.path.split('?')[0].rstrip('/') + '.html'
        return super().send_head()

    def send_error(self, code, message=None, explain=None):
        page = os.path.join(ROOT, '404.html')
        if code != 404 or not os.path.exists(page): return super().send_error(code, message, explain)
        body = open(page, 'rb').read()
        self.send_response(404); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(body))); self.end_headers()
        if self.command != 'HEAD': self.wfile.write(body)


http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
