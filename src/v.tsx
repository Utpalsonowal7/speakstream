import { useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export default function VoiceTranscript({ token }: { token?: string }) {
     const [text, setText] = useState("");
     const [recording, setRecording] = useState(false);
     const [refining, setRefining] = useState(false);
     const [error, setError] = useState("");
     const [edited, setEdited] = useState(false); // did the user touch the text?

     const recorderRef = useRef<MediaRecorder | null>(null);
     const recognitionRef = useRef<any>(null);
     const chunksRef = useRef<Blob[]>([]);
     const editedRef = useRef(false);

     const start = async () => {
          try {
               setError("");
               setText("");
               setEdited(false);
               editedRef.current = false;

               const stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true },
               });

               // 1) Record audio for the AI
               const mimeType = MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "audio/mp4";
               const recorder = new MediaRecorder(stream, { mimeType });
               chunksRef.current = [];

               recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
               };
               recorder.onstop = async () => {
                    stream.getTracks().forEach((t) => t.stop());
                    const blob = new Blob(chunksRef.current, {
                         type: mimeType,
                    });
                    await refineWithAI(blob, mimeType);
               };
               recorder.start();
               recorderRef.current = recorder;

               // 2) Live transcript for instant feedback (Chrome/Edge)
               const SR =
                    (window as any).SpeechRecognition ||
                    (window as any).webkitSpeechRecognition;

               if (SR) {
                    const rec = new SR();
                    rec.lang = "en-IN";
                    rec.continuous = true;
                    rec.interimResults = true;
                    rec.onresult = (e: any) => {
                         let live = "";
                         for (let i = 0; i < e.results.length; i++) {
                              live += e.results[i][0].transcript;
                         }
                         setText(live);
                    };
                    rec.onerror = () => {}; // live preview is optional, ignore errors
                    rec.start();
                    recognitionRef.current = rec;
               } else {
                    setText(
                         "(Live preview not supported in this browser, text will appear after you stop)",
                    );
               }

               setRecording(true);
          } catch {
               setError("Microphone permission denied or not available.");
          }
     };

     const stop = () => {
          recognitionRef.current?.stop();
          recorderRef.current?.stop();
          setRecording(false);
     };

     const refineWithAI = async (blob: Blob, mimeType: string) => {
          try {
               setRefining(true);
               const form = new FormData();
               form.append(
                    "audio",
                    blob,
                    mimeType.includes("mp4") ? "voice.mp4" : "voice.webm",
               );

               const res = await fetch(`${API_BASE}/api/transcribe`, {
                    method: "POST",
                    headers: token
                         ? { Authorization: `Bearer ${token}` }
                         : undefined,
                    body: form,
               });
               const data = await res.json();
               if (!res.ok)
                    throw new Error(data.message || "Transcription failed");

               // Don't overwrite if the user already started fixing the text
               if (!editedRef.current) setText(data.text);
          } catch (err: any) {
               // Live text stays as a fallback
               setError(
                    `AI refine failed (${err.message}). Live transcript kept.`,
               );
          } finally {
               setRefining(false);
          }
     };

     return (
          <div
               style={{
                    maxWidth: 500,
                    margin: "40px auto",
                    fontFamily: "sans-serif",
               }}
          >
               <button
                    onClick={recording ? stop : start}
                    disabled={refining}
                    style={{
                         padding: "12px 20px",
                         fontSize: 16,
                         borderRadius: 8,
                         border: "none",
                         cursor: "pointer",
                         background: recording ? "#e53935" : "#1976d2",
                         color: "#fff",
                    }}
               >
                    {recording ? "⏹ Stop" : "🎤 Start talking"}
               </button>

               {recording && <p>🔴 Listening... (live preview)</p>}
               {refining && <p>✨ AI is improving the transcript...</p>}
               {error && <p style={{ color: "red" }}>{error}</p>}

               <textarea
                    value={text}
                    onChange={(e) => {
                         setText(e.target.value);
                         setEdited(true);
                         editedRef.current = true;
                    }}
                    placeholder="Your speech appears here live. You can edit it."
                    rows={6}
                    style={{
                         width: "100%",
                         marginTop: 16,
                         padding: 10,
                         fontSize: 16,
                    }}
               />

               {edited && (
                    <small>
                         You edited this text. The AI result will not overwrite
                         it.
                    </small>
               )}

               <button
                    disabled={!text.trim() || recording || refining}
                    onClick={() => console.log("SEND TO INVOICE AI:", text)}
                    style={{
                         marginTop: 12,
                         padding: "10px 18px",
                         fontSize: 16,
                    }}
               >
                    Send
               </button>
          </div>
     );
}
