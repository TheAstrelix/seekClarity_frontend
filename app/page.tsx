'use client'

import { useRef, useState } from "react";
import { uploadBook, getOrCreateSessionId } from "@/lib/api";

export default function Home(){
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError(null);
      setUploadSuccess(null);
      console.log("Selected file:", selectedFile);
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
      const sessionId = getOrCreateSessionId();
      const data = await uploadBook(file, sessionId);
      
      console.log('Upload response:', data);
      
      setUploadSuccess(`Book uploaded successfully! Job ID: ${data.uploadJobId}`);
      // Reset file after successful upload
      setTimeout(() => {
        setFile(null);
        setUploadSuccess(null);
      }, 3000);

      // Optionally redirect to reader or job status page
      if (data.bookId) {
        console.log(`Book ID: ${data.bookId}, Job ID: ${data.uploadJobId}`);
        // Example: router.push(`/reader/${data.bookId}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during upload';
      setUploadError(errorMessage);
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <>
      {/* Top Navigation Bar */}
      <header className="bg-[#FAF9F6] dark:bg-[#1A1A1A] flex justify-between items-center w-full px-8 md:px-16 h-16 fixed top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight text-[#2f3430] dark:text-[#FAF9F6] font-serif">The Living Manuscript</span>
        </div>
        <nav className="hidden md:flex gap-8 items-center">
          <a className="text-[#5f5e5e] dark:text-[#afb3ae] hover:text-[#2f3430] font-label text-sm uppercase tracking-widest transition-colors duration-200" href="#">Library</a>
          <a className="text-[#5f5e5e] dark:text-[#afb3ae] hover:text-[#2f3430] font-label text-sm uppercase tracking-widest transition-colors duration-200" href="#">Annotations</a>
          <a className="text-[#5f5e5e] dark:text-[#afb3ae] hover:text-[#2f3430] font-label text-sm uppercase tracking-widest transition-colors duration-200" href="#">Archive</a>
        </nav>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
              <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">Session: Not Active</span>
            </div>
            <button className="flex items-center text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[20px]" data-icon="help">help</span>
            </button>
            <button className="text-[#5f5e5e] dark:text-[#E3E2E0] hover:bg-[#f4f4f0] dark:hover:bg-[#2a2a2a] p-1 rounded-full transition-colors">
              <span className="material-symbols-outlined" data-icon="account_circle">account_circle</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center px-6 pt-16 min-h-screen">
        <div className="max-w-2xl w-full flex flex-col items-center">
          <div className="text-center mb-12">
            <h1 className="font-headline text-5xl md:text-6xl text-on-surface mb-4 tracking-tight">The Archive Awaits.</h1>
            <p className="font-body italic text-xl text-outline italic">Engage in deep dialogue with your literature through AI.</p>
          </div>

          <div className="w-full bg-surface-container-lowest rounded-xl p-12 flex flex-col items-center justify-center transition-all duration-300 group border-2 border-dashed border-outline-variant hover:border-primary border-opacity-30">
            {file ? (
              <>
                <div className="mb-6 w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-4xl">check_circle</span>
                </div>
                <h2 className="font-headline text-2xl text-on-surface mb-2">File Uploaded Successfully</h2>
                <div className="bg-surface-container-high rounded-lg p-4 w-full mb-6">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">description</span>
                    <div className="flex-grow">
                      <p className="font-label text-sm font-semibold text-on-surface truncate">{file.name}</p>
                      <p className="font-label text-xs text-on-surface-variant">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                  <button
                    onClick={() => setFile(null)}
                    className="bg-surface-container-low text-on-surface font-label text-xs uppercase tracking-widest py-3 px-8 rounded-md hover:bg-surface-container-high transition-colors disabled:opacity-50"
                    disabled={isUploading}
                  >
                    Change File
                  </button>
                  <button
                    onClick={handleProcessUpload}
                    disabled={isUploading}
                    className="bg-primary text-on-primary font-label text-xs uppercase tracking-widest py-4 px-8 rounded-md shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">cloud_upload</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                        Start Processing
                      </>
                    )}
                  </button>
                  {uploadError && (
                    <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-3 flex gap-2">
                      <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[18px]">error</span>
                      <p className="font-label text-xs text-red-700 dark:text-red-200">{uploadError}</p>
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-3 flex gap-2">
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[18px]">check_circle</span>
                      <p className="font-label text-xs text-green-700 dark:text-green-200">{uploadSuccess}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center group-hover:bg-primary-fixed transition-colors">
                  <span className="material-symbols-outlined text-primary text-4xl">article</span>
                </div>
                <h2 className="font-headline text-2xl text-on-surface mb-2">Upload a book to start reading</h2>
                <p className="font-label text-xs uppercase tracking-[0.2em] text-outline mb-8">PDF, EPUB, or TXT formats supported</p>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                  <button
                    onClick={handleFileClick}
                    className="bg-primary text-on-primary font-label text-xs uppercase tracking-widest py-4 px-8 rounded-md shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    Browse Files
                  </button>

                  <input
                    type="file"
                    accept=".pdf,.epub,.txt"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center gap-4 w-full">
                    <div className="h-[1px] bg-surface-container-high flex-grow"></div>
                    <span className="font-label text-[10px] text-outline-variant uppercase">or</span>
                    <div className="h-[1px] bg-surface-container-high flex-grow"></div>
                  </div>
                  <button className="bg-surface-container-low text-on-surface font-label text-xs uppercase tracking-widest py-3 px-8 rounded-md hover:bg-surface-container-high transition-colors">
                    Select from Library
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
            <div className="bg-surface-container-low p-6 rounded-lg">
              <span className="material-symbols-outlined text-primary mb-4" data-icon="auto_awesome">auto_awesome</span>
              <h3 className="font-headline text-lg mb-2">AI Insights</h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">Dynamic annotations generated as you read through complex manuscripts.</p>
            </div>
            <div className="bg-surface-container-low p-6 rounded-lg">
              <span className="material-symbols-outlined text-primary mb-4" data-icon="history">history</span>
              <h3 className="font-headline text-lg mb-2">Reading History</h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">Your intellectual journey, archived and searchable across all sessions.</p>
            </div>
            <div className="bg-surface-container-low p-6 rounded-lg">
              <span className="material-symbols-outlined text-primary mb-4" data-icon="menu_book">menu_book</span>
              <h3 className="font-headline text-lg mb-2">Scholarly Focus</h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">A distraction-free interface optimized for deep, immersive study.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar Navigation (hidden on mobile) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-20 flex-col py-8 items-center bg-[#f4f4f0] dark:bg-[#121212] z-40">
        <div className="mb-12">
          <span className="font-serif italic text-xl text-[#2f3430]">LM</span>
        </div>
        <nav className="flex flex-col gap-8">
          <button className="text-[#2f3430] flex flex-col items-center gap-1 group">
            <span className="material-symbols-outlined" data-icon="menu_book">menu_book</span>
            <span className="font-label text-[9px] uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Reader</span>
          </button>
          <button className="text-[#5f5e5e] hover:text-[#2f3430] flex flex-col items-center gap-1 group">
            <span className="material-symbols-outlined" data-icon="auto_awesome">auto_awesome</span>
            <span className="font-label text-[9px] uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Insights</span>
          </button>
          <button className="text-[#5f5e5e] hover:text-[#2f3430] flex flex-col items-center gap-1 group">
            <span className="material-symbols-outlined" data-icon="history">history</span>
            <span className="font-label text-[9px] uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">History</span>
          </button>
          <button className="text-[#5f5e5e] hover:text-[#2f3430] flex flex-col items-center gap-1 group">
            <span className="material-symbols-outlined" data-icon="settings">settings</span>
            <span className="font-label text-[9px] uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Settings</span>
          </button>
        </nav>
        <div className="mt-auto">
          <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden">
            <img alt="User profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeFhOvaW4XwmZB2YnGShDQzzYyCqJ-wqimp26wc_t35GvhK_mBbE82nuEhnmwhXvWy-77DN2AUK86hT4FDRO2jcokdkBkIvIqwe1HoyhPlqaH7ju0L492TqwkajN-8ugwBkF9sZftHsKwLD7YKmaQUG21yjBUcsRWWJg35sPoTtjR4a9PbO-dLpxKMQOE5IxnJkjNjtHS3rJd4irucU-tWLBQ20cCSbnLjWFRAKTzpbvk-W2JRYW4mRfjKvQkc_nzJCFelNwhFqQ"/>
          </div>
        </div>
      </aside>

      {/* Footer */}
      <footer className="h-16 flex items-center justify-between px-16 text-outline-variant">
        <span className="font-label text-[10px] uppercase tracking-widest">The Living Manuscript © 2024</span>
        <div className="flex gap-6">
          <a className="font-label text-[10px] uppercase tracking-widest hover:text-on-surface transition-colors" href="#">Privacy</a>
          <a className="font-label text-[10px] uppercase tracking-widest hover:text-on-surface transition-colors" href="#">Terms</a>
        </div>
      </footer>
    </>
  )
}