import http.server
import socketserver
import threading
import webbrowser
import os

def launch_server(data_file_path):
    PORT = 8000
    handler = http.server.SimpleHTTPRequestHandler
    os.environ["DATA_FILE"] = data_file_path

    def open_browser():
        webbrowser.open(f'http://localhost:{PORT}/static/index.html')

    thread = threading.Thread(target=open_browser)
    thread.start()

    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        httpd.serve_forever()
