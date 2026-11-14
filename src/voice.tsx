import { useRef, useState } from "react";

// Minimal types for the Web Speech API (not in default TS DOM typings)
interface SpeechRecognitionAlternative {
     transcript: string;
}
interface SpeechRecognitionResult {
     [index: number]: SpeechRecognitionAlternative;
     length: number;
}
interface SpeechRecognitionResultList {
     [index: number]: SpeechRecognitionResult;
     length: number;
}
interface SpeechRecognitionEvent extends Event {
     results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
     error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
     lang: string;
     continuous: boolean;
     interimResults: boolean;
     start: () => void;
     stop: () => void;
     onresult: ((e: SpeechRecognitionEvent) => void) | null;
     onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
     onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
     interface Window {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
     }
}

export default function VoiceTranscript() {
     const [transcript, setTranscript] = useState<string>("");
     const [listening, setListening] = useState<boolean>(false);
     const [error, setError] = useState<string>("");
     const recRef = useRef<SpeechRecognitionInstance | null>(null);

     const start = () => {
          const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

          if (!SR) {
               setError(
                    "Speech recognition is not supported. Use Chrome or Edge.",
               );
               return;
          }

          const rec = new SR();
          rec.lang = "en-IN";
          rec.continuous = true;
          rec.interimResults = true;

          rec.onresult = (e: SpeechRecognitionEvent) => {
               let text = "";
               for (let i = 0; i < e.results.length; i++) {
                    text += e.results[i][0].transcript;
               }
               setTranscript(text);
          };

          rec.onerror = (e: SpeechRecognitionErrorEvent) => {
               setError(
                    e.error === "not-allowed"
                         ? "Microphone permission denied."
                         : e.error,
               );
               setListening(false);
          };

          rec.onend = () => setListening(false);

          recRef.current = rec;
          setError("");
          setTranscript("");
          rec.start();
          setListening(true);
     };

     const stop = () => recRef.current?.stop();

     return (
          <div
               style={{
                    maxWidth: 500,
                    margin: "40px auto",
                    fontFamily: "sans-serif",
               }}
          >
               <button
                    onClick={listening ? stop : start}
                    style={{
                         padding: "12px 20px",
                         fontSize: 16,
                         borderRadius: 8,
                         border: "none",
                         cursor: "pointer",
                         background: listening ? "#e53935" : "#1976d2",
                         color: "#fff",
                    }}
               >
                    {listening ? "⏹ Stop" : "🎤 Start talking"}
               </button>

               {listening && <p>Listening...</p>}
               {error && <p style={{ color: "red" }}>{error}</p>}

               <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Your speech will appear here..."
                    rows={6}
                    style={{
                         width: "100%",
                         marginTop: 16,
                         padding: 10,
                         fontSize: 16,
                    }}
               />
          </div>
     );
}
