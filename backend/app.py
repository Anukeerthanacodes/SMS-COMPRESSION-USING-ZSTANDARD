import zstandard as zstd
import base64
import time
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Allow cross-origin requests from the frontend
CORS(app)

# The Zstandard compression level. Higher levels mean better compression
# but take slightly longer. We increase this from the default (3) to 15
# to achieve much better ratios for short, repetitive strings.
COMPRESSION_LEVEL = 15


@app.route('/compress', methods=['POST'])
def compress_text():
    try:
        data = request.json
        text = data.get('text', '')

        if not text:
            return jsonify({'error': 'No text provided for compression'}), 400

        # Encode the original text as bytes
        original_bytes = text.encode('utf-8')
        original_size = len(original_bytes)

        start_time = time.perf_counter()

        # Compress the bytes using zstd with a high compression level
        compressed_bytes = zstd.compress(original_bytes, COMPRESSION_LEVEL)

        end_time = time.perf_counter()

        compressed_size = len(compressed_bytes)

        # Encode the compressed bytes to Base64 so they can be safely sent via JSON/HTTP
        compressed_b64 = base64.b64encode(compressed_bytes).decode('utf-8')

        return jsonify({
            'compressed_b64': compressed_b64,
            'original_size': original_size,
            'compressed_size': compressed_size,
            'compression_time_ms': round((end_time - start_time) * 1000, 2)
        })

    except Exception as e:
        app.logger.error(f"Compression error: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/decompress', methods=['POST'])
def decompress_text():
    try:
        data = request.json
        compressed_b64 = data.get('compressed_b64', '')

        if not compressed_b64:
            return jsonify({'error': 'No compressed data provided'}), 400

        # Decode Base64 string back to compressed bytes
        compressed_bytes = base64.b64decode(compressed_b64)

        # Decompress the bytes using zstd
        decompressed_bytes = zstd.decompress(compressed_bytes)

        # Decode the decompressed bytes back to a UTF-8 string
        decompressed_text = decompressed_bytes.decode('utf-8')

        return jsonify({
            'decompressed_text': decompressed_text
        })

    except zstd.Error as e:
        app.logger.error(f"Decompression error (Zstd): {e}")
        return jsonify({'error': 'Invalid compressed data format or corrupted data'}), 500

    except Exception as e:
        app.logger.error(f"Decompression error: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # You must run this using 'python app.py' and ensure the required packages are installed:
    # pip install Flask flask-cors python-zstandard
    app.run(host='127.0.0.1', port=5000)
