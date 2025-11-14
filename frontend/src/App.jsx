import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [text, setText] = useState("");
  // State for the compression result (will be null on refresh)
  const [lastResult, setLastResult] = useState(null);
  const [decompressed, setDecompressed] = useState("");
  const [animatedRatio, setAnimatedRatio] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. DEDICATED EFFECT FOR ANIMATION ---
  // This hook watches 'lastResult' and triggers the animation every time the result changes.
  useEffect(() => {
    if (lastResult && lastResult.ratio !== undefined) {
      const newRatio = parseFloat(lastResult.ratio);
      let start = 0;
      let animationInterval;

      const animate = () => {
        animationInterval = setInterval(() => {
          start += 1;
          if (start >= newRatio) {
            start = newRatio;
            clearInterval(animationInterval);
          }
          setAnimatedRatio(start);
        }, 10);
      };

      animate();

      // Cleanup function to stop the interval when the component unmounts or state changes again
      return () => {
        if (animationInterval) {
          clearInterval(animationInterval);
        }
      };
    } else {
      // Reset animated ratio if results disappear (e.g., if we manually set lastResult to null later)
      setAnimatedRatio(0);
    }
  }, [lastResult]);


  // --- 2. COMPRESSION HANDLER (NO PERSISTENCE) ---
  const handleCompress = async (e) => {
    // Aggressively prevent page reload (this is still necessary!)
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (!text.trim()) {
      console.warn("Please enter some text to compress");
      setLastResult({
        error: "Input required.",
        compressedB64: "Input required. Please enter text."
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Call Backend
      const res = await axios.post("http://127.0.0.1:5000/compress", { text });

      const originalSize = res.data.original_size || 0;
      const compressedSize = res.data.compressed_size || 0;

      const calculatedRatio =
        originalSize > 0
          ? parseFloat(((1 - compressedSize / originalSize) * 100).toFixed(2))
          : 0;

      // 2. Prepare Result
      const newResult = {
        originalText: text,
        compressedB64: res.data.compressed_b64,
        stats: {
          original: originalSize,
          compressed: compressedSize,
          time: res.data.compression_time_ms,
        },
        ratio: calculatedRatio,
      };

      // 3. Update component state directly (NO sessionStorage write)
      setLastResult(newResult);
      setDecompressed("");

    } catch (err) {
      console.error(err);
      console.error("Compression failed. Check your backend.");
      setLastResult({
        error: "Compression failed.",
        compressedB64: "Error: Compression failed. Check backend server status."
      });

    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. DECOMPRESSION HANDLER ---
  const handleDecompress = async () => {
    if (!lastResult || !lastResult.compressedB64 || lastResult.error) {
      console.warn("No valid compressed data available for decompression!");
      setDecompressed("No valid compressed data available!");
      return;
    }

    try {
      const res = await axios.post("http://127.0.0.1:5000/decompress", {
        compressed_b64: lastResult.compressedB64,
      });
      setDecompressed(res.data.decompressed_text);
    } catch (err) {
      console.error(err);
      console.error("Decompression failed. Check backend.");
      setDecompressed("Error: Decompression failed. Check backend server status.");
    }
  };

  const stats = lastResult?.stats;
  const compressed = lastResult?.compressedB64 || "";


  return (
    <div
      style={{
        backgroundColor: "#f5f5dc",
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          fontSize: "36px",
          color: "#4a2f0b",
          marginBottom: "40px",
          fontWeight: "bold",
        }}
      >
        SMS Compression using Zstandard
      </h1>

      {isLoading && (
        <p style={{ textAlign: 'center', color: '#8B4513', fontWeight: 'bold' }}>Compressing data...</p>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* Input Text Box */}
        <div style={{ width: "45%", textAlign: "center" }}>
          <h3 style={{ color: "#4a2f0b" }}>Enter SMS to Compress</h3>
          <textarea
            rows="8"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              resize: "none",
              fontSize: "16px",
            }}
          ></textarea>
          <br />
          <button
            type="button"
            onClick={(e) => handleCompress(e)}
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? "#A0522D" : "#8B4513",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "6px",
              marginTop: "10px",
              cursor: isLoading ? "default" : "pointer",
              transition: "0.2s",
            }}
            onMouseOver={(e) => !isLoading && (e.target.style.backgroundColor = "#A0522D")}
            onMouseOut={(e) => !isLoading && (e.target.style.backgroundColor = "#8B4513")}
          >
            Compress
          </button>
        </div>

        {/* Compressed Output */}
        <div style={{ width: "45%", textAlign: "center" }}>
          <h3 style={{ color: "#4a2f0b" }}>Compressed SMS</h3>
          <textarea
            rows="8"
            value={compressed}
            readOnly
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              resize: "none",
              fontSize: "16px",
            }}
          ></textarea>
          <br />
          <button
            type="button"
            onClick={handleDecompress}
            disabled={!lastResult || isLoading}
            style={{
              backgroundColor: (lastResult && !isLoading) ? "#8B4513" : "#A0522D",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "6px",
              marginTop: "10px",
              cursor: (lastResult && !isLoading) ? "pointer" : "default",
              transition: "0.2s",
            }}
            onMouseOver={(e) => (lastResult && !isLoading) && (e.target.style.backgroundColor = "#A0522D")}
            onMouseOut={(e) => (lastResult && !isLoading) && (e.target.style.backgroundColor = "#8B4513")}
          >
            Decompress
          </button>
        </div>
      </div>

      {/* Animated Compression Circle */}
      {stats && (
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          {/* Ensure the circular container is styled in App.css for animation */}
          <div className="circle-container">
            <div
              className="circle-fill"
              style={{
                background: `conic-gradient(#8B4513 ${animatedRatio * 3.6
                  }deg, #f5f5dc 0deg)`,
              }}
            >
              <div className="circle-inner">
                <span>{animatedRatio.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          <p style={{ marginTop: "10px", color: "#4a2f0b" }}>
            Compression completed in {stats.time} ms
          </p>
          <p style={{ color: "#4a2f0b" }}>
            Original Size: {stats.original} bytes, Compressed Size: {stats.compressed} bytes
          </p>
        </div>
      )}

      {/* Decompressed Text Output */}
      {decompressed && (
        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <h3 style={{ color: "#4a2f0b" }}>Decompressed Text:</h3>
          <p
            style={{
              display: "inline-block",
              backgroundColor: "#fff",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              width: "80%",
              textAlign: "left",
            }}
          >
            {decompressed}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;