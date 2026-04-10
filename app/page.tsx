'use client'

import { useRef, useState, useEffect } from "react";
import { initSession, uploadBook, processDocument, getSessionDocuments } from "@/services/api";
import { Upload, BookOpen, Sparkles, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/dist/client/components/navigation";

export default function Home() {
  const [sessionActive, setSessionActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [documentId, setDocumentId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const route = useRouter();

  // ✅ INIT SESSION & FETCH DOCUMENTS
  useEffect(() => {
    const initializeSession = async () => {
      try {
        await initSession();
        setSessionActive(true);

        // Fetch existing documents for this session
        const docsData = await getSessionDocuments();
        if (docsData.documents && docsData.documents.length > 0) {
          // Load the most recent document
          const latestDoc = docsData.documents[0];
          setDocumentId(latestDoc.id);
          setFile(new File([], latestDoc.file_name));
        }
      } catch (error) {
        setSessionActive(false);
      }
    };

    initializeSession();
  }, []);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError(null);
      setUploadSuccess(null);
      setDocumentId(null);
    }
  };


  const handleProcessUpload = async () => {
    if (!file) {
      setUploadError('No file selected');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const data = await uploadBook(file);
      setDocumentId(data.document_id);
      setUploadSuccess("Book uploaded successfully ✅");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };


  const handleStartProcessing = async () => {
    if (!documentId) return;

    setIsProcessing(true);
    setUploadError(null);

    try {
      await processDocument(documentId);
      setUploadSuccess("Processing started");
      route.push(`/reader/${documentId}`);
    } catch (error) {
      setUploadError("Processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectFromLibrary = () => {
    // Placeholder for library selection
    console.log("Select from library");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-surface border-b border-border flex justify-between items-center w-full px-8 md:px-16 h-16 fixed top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight font-serif">
            The Living Manuscript
          </span>
        </div>

        <nav className="hidden md:flex gap-8 items-center">
          <a
            className="text-muted-foreground hover:text-foreground text-sm uppercase tracking-widest transition-colors duration-200"
            href="#"
          >
            Library
          </a>
          <a
            className="text-muted-foreground hover:text-foreground text-sm uppercase tracking-widest transition-colors duration-200"
            href="#"
          >
            Annotations
          </a>
          <a
            className="text-muted-foreground hover:text-foreground text-sm uppercase tracking-widest transition-colors duration-200"
            href="#"
          >
            Archive
          </a>
        </nav>

        {/* Status Badge */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full">
              <div
                className={`w-2 h-2 rounded-full ${
                  sessionActive ? "bg-green-500" : "bg-muted-foreground"
                }`}
              ></div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Session: {sessionActive ? "Active" : "Not Active"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center px-6 pt-24 pb-8">
        <div className="max-w-4xl w-full flex flex-col items-center">
          {/* Hero Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
              The Archive Awaits.
            </h1>
            <p className="text-xl text-muted-foreground italic">
              Engage in deep dialogue with your literature through AI.
            </p>
          </div>

          {/* Central Upload Component */}
          <div className="w-full bg-card border-2 border-dashed border-muted rounded-xl p-12 flex flex-col items-center justify-center transition-all duration-300 hover:border-primary hover:shadow-lg">
            {!file ? (
              <>
                <div className="mb-6 w-20 h-20 bg-secondary rounded-full flex items-center justify-center group-hover:bg-primary transition-colors">
                  <BookOpen className="text-primary text-4xl" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Upload a book to start reading
                </h2>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8">
                  PDF, EPUB, or TXT formats supported
                </p>

                <div className="flex flex-col gap-4 w-full max-w-xs">
                  <button
                    onClick={handleFileClick}
                    className="bg-primary text-primary-foreground font-semibold text-sm uppercase tracking-widest py-4 px-8 rounded-md shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Upload size={18} />
                    Browse Files
                  </button>

                  <div className="flex items-center gap-4 w-full">
                    <div className="h-[1px] bg-border flex-grow"></div>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      or
                    </span>
                    <div className="h-[1px] bg-border flex-grow"></div>
                  </div>

                  <button
                    onClick={handleSelectFromLibrary}
                    className="bg-secondary text-secondary-foreground font-semibold text-sm uppercase tracking-widest py-3 px-8 rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    Select from Library
                  </button>
                </div>

                <input
                  type="file"
                  accept=".pdf,.epub,.txt"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </>
            ) : (
              <>
                <div className="mb-6 w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
                  <BookOpen className="text-primary text-4xl" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {file.name}
                </h2>
                <p className="text-sm text-muted-foreground mb-8">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>

                <div className="flex flex-col gap-4 w-full max-w-xs">
                  {!documentId && (
                    <button
                      onClick={handleProcessUpload}
                      disabled={isUploading}
                      className="bg-primary text-primary-foreground font-semibold text-sm uppercase tracking-widest py-3 px-8 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Upload size={18} />
                      {isUploading ? "Uploading..." : "Upload"}
                    </button>
                  )}

                  {documentId && (
                    <button
                      onClick={handleStartProcessing}
                      disabled={isProcessing}
                      className="bg-primary text-primary-foreground font-semibold text-sm uppercase tracking-widest py-3 px-8 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Sparkles size={18} />
                      {isProcessing ? "Processing..." : "Start Processing"}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setFile(null);
                      setDocumentId(null);
                      setUploadError(null);
                      setUploadSuccess(null);
                    }}
                    className="bg-secondary text-secondary-foreground font-semibold text-sm uppercase tracking-widest py-2 px-8 rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    Choose Different File
                  </button>
                </div>
              </>
            )}

            {/* Error Message */}
            {uploadError && (
              <div className="mt-6 w-full flex items-start gap-3 p-4 bg-destructive/10 border border-destructive rounded-lg">
                <AlertCircle className="text-destructive flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-destructive">{uploadError}</p>
              </div>
            )}

            {/* Success Message */}
            {uploadSuccess && (
              <div className="mt-6 w-full flex items-start gap-3 p-4 bg-green-500/10 border border-green-500 rounded-lg">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-green-600">{uploadSuccess}</p>
              </div>
            )}
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
            <div className="bg-card border border-border p-6 rounded-lg hover:shadow-md transition-shadow">
              <div className="mb-4 p-3 bg-secondary rounded-lg w-fit">
                <Sparkles className="text-primary" size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2">AI Insights</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Dynamic annotations generated as you read through complex
                manuscripts.
              </p>
            </div>

            <div className="bg-card border border-border p-6 rounded-lg hover:shadow-md transition-shadow">
              <div className="mb-4 p-3 bg-secondary rounded-lg w-fit">
                <Clock className="text-primary" size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2">Reading History</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your intellectual journey, archived and searchable across all
                sessions.
              </p>
            </div>

            <div className="bg-card border border-border p-6 rounded-lg hover:shadow-md transition-shadow">
              <div className="mb-4 p-3 bg-secondary rounded-lg w-fit">
                <BookOpen className="text-primary" size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2">Scholarly Focus</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A distraction-free interface optimized for deep, immersive
                study.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-16 text-muted-foreground text-center">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase tracking-widest">
            The Living Manuscript © 2024
          </span>
          <div className="flex gap-6">
            <a
              className="text-[10px] uppercase tracking-widest hover:text-foreground transition-colors"
              href="#"
            >
              Privacy
            </a>
            <a
              className="text-[10px] uppercase tracking-widest hover:text-foreground transition-colors"
              href="#"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}