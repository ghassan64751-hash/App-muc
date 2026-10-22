# pip install flask flask-cors yt-dlp   (and install ffmpeg)
# run: python server.py
import os, shutil, tempfile, urllib.parse
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app, expose_headers=["X-Title"])
MAX_SECONDS = 2 * 60 * 60  # reject videos longer than 2 hours

@app.get("/api/audio")
def audio():
    url = request.args.get("url", "")
    if "youtube.com/" not in url and "youtu.be/" not in url:
        return jsonify(error="الرابط مو رابط يوتيوب"), 400
    tmp = tempfile.mkdtemp()
    try:
        opts = {
            "format": "bestaudio/best",
            "outtmpl": os.path.join(tmp, "a.%(ext)s"),
            "noplaylist": True,
            "quiet": True,
            "postprocessors": [{"key": "FFmpegExtractAudio",
                                "preferredcodec": "mp3",
                                "preferredquality": "128"}],
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if (info.get("duration") or 0) > MAX_SECONDS:
                return jsonify(error="الفيديو طويل جدًا (الحد ساعتين)"), 400
            ydl.download([url])
        path = os.path.join(tmp, "a.mp3")
        with open(path, "rb") as f:
            data = f.read()
        from io import BytesIO
        resp = send_file(BytesIO(data), mimetype="audio/mpeg")
        resp.headers["X-Title"] = urllib.parse.quote(info.get("title", "youtube"))
        return resp
    except Exception as e:
        return jsonify(error="فشل التحميل: " + str(e)[:150]), 500
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
