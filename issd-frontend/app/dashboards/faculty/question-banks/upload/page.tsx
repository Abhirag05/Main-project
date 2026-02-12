"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  assessmentApiClient,
  FacultyBatchOption,
  BatchModuleOption,
  AikenImportError,
} from "@/lib/assessmentAPI";

interface ParseError {
  line_number: number;
  message: string;
}

export default function UploadQuestionBankPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);

  // Form data
  const [bankName, setBankName] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Dropdown options
  const [batches, setBatches] = useState<FacultyBatchOption[]>([]);
  const [subjects, setSubjects] = useState<BatchModuleOption[]>([]);

  // Check user role on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData.role.code !== "FACULTY") {
          router.push("/dashboards");
        }
      } else {
        router.push("/login");
      }
    }
  }, [router]);

  // Fetch faculty batches
  const fetchBatches = useCallback(async () => {
    try {
      const batchesData = await assessmentApiClient.getFacultyBatches();
      setBatches(batchesData);
    } catch (err) {
      console.error("Failed to load batches:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Fetch subjects when batch changes
  useEffect(() => {
    if (selectedBatch) {
      setSelectedSubject(null);
      assessmentApiClient
        .getBatchModules(selectedBatch)
        .then(setSubjects)
        .catch(console.error);
    } else {
      setSubjects([]);
    }
  }, [selectedBatch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".txt")) {
        setError("Only .txt files are allowed");
        setFile(null);
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setParseErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setParseErrors([]);

    // Validation
    if (!bankName.trim()) {
      setError("Bank name is required");
      return;
    }
    if (!selectedSubject) {
      setError("Please select a module");
      return;
    }
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setLoading(true);
    try {
      const response = await assessmentApiClient.importAikenFile({
        bank_name: bankName.trim(),
        subject_id: selectedSubject,
        file: file,
        description: description.trim() || undefined,
      });

      // Success - redirect to bank detail page
      router.push(`/dashboards/faculty/question-banks/${response.bank_id}?success=${response.questions_imported}`);
    } catch (err) {
      const apiError = err as AikenImportError;
      if (apiError.errors && apiError.errors.length > 0) {
        setParseErrors(apiError.errors);
        setError("AIKEN format errors found. Please fix and try again.");
      } else {
        setError(apiError.error || "Failed to upload question bank");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboards/faculty/question-banks"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Question Banks
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Upload Question Bank</h1>
          <p className="text-gray-600 mt-1">
            Import questions from an AIKEN format file
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Parse Errors */}
              {parseErrors.length > 0 && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">
                    Parsing Errors Found:
                  </h3>
                  <ul className="list-disc list-inside space-y-1">
                    {parseErrors.map((err, idx) => (
                      <li key={idx} className="text-sm text-yellow-700">
                        <span className="font-medium">Line {err.line_number}:</span> {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bank Name */}
              <div className="mb-4">
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., Python Basics - Chapter 1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Batch Selection */}
              <div className="mb-4">
                <label htmlFor="batch" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Batch <span className="text-red-500">*</span>
                </label>
                <select
                  id="batch"
                  value={selectedBatch || ""}
                  onChange={(e) => setSelectedBatch(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Select Batch --</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.code} - {batch.course_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject/Module Selection */}
              <div className="mb-4">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Module <span className="text-red-500">*</span>
                </label>
                <select
                  id="subject"
                  value={selectedSubject || ""}
                  onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
                  disabled={!selectedBatch}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedBatch ? "-- Select Module --" : "-- Select Batch First --"}
                  </option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.code} - {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this question bank..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                  AIKEN File (.txt) <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file"
                          name="file"
                          type="file"
                          accept=".txt"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">TXT file up to 5MB</p>
                    {file && (
                      <p className="text-sm text-green-600 font-medium mt-2">
                        ✓ {file.name} selected
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Link
                  href="/dashboards/faculty/question-banks"
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload & Parse
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* AIKEN Format Instructions */}
          <div className="lg:col-span-1">
            <div className="bg-blue-50 rounded-lg shadow-md p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                AIKEN Format Guide
              </h3>
              <p className="text-sm text-blue-800 mb-4">
                AIKEN is a simple format for multiple choice questions. Each question
                follows this structure:
              </p>

              <div className="bg-white rounded-lg p-4 mb-4 font-mono text-xs text-gray-800 whitespace-pre-wrap">
{`What is the capital of India?
A. Mumbai
B. Delhi
C. Chennai
D. Kolkata
ANSWER: B

What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
ANSWER: B`}
              </div>

              <h4 className="text-sm font-semibold text-blue-900 mb-2">Rules:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>First line is the question text</li>
                <li>Options start with A., B., C., D.</li>
                <li>Exactly 4 options required</li>
                <li>ANSWER: followed by correct letter</li>
                <li>Blank line between questions</li>
              </ul>

              <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Tip:</strong> You can create AIKEN files in any text editor.
                  Make sure to save with .txt extension and UTF-8 encoding.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
