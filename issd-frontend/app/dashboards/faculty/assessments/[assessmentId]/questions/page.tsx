"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  assessmentApiClient,
  Assessment,
  Question,
  QuestionOption,
  CreateQuestionRequest,
  QuestionBank,
} from "@/lib/assessmentAPI";

type OptionLabel = "A" | "B" | "C" | "D";

interface QuestionFormData {
  id?: number;
  question_text: string;
  options: {
    option_label: OptionLabel;
    option_text: string;
    is_correct: boolean;
  }[];
  marks: number;
  isNew: boolean;
  isSaved: boolean;
}

const EMPTY_QUESTION: QuestionFormData = {
  question_text: "",
  options: [
    { option_label: "A", option_text: "", is_correct: false },
    { option_label: "B", option_text: "", is_correct: false },
    { option_label: "C", option_text: "", is_correct: false },
    { option_label: "D", option_text: "", is_correct: false },
  ],
  marks: 1,
  isNew: true,
  isSaved: false,
};

export default function QuestionBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = Number(params.assessmentId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<QuestionFormData[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    questionIndex: number | null;
  }>({ isOpen: false, questionIndex: null });
  const [publishConfirm, setPublishConfirm] = useState(false);

  // Question source modal
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [randomize, setRandomize] = useState<boolean>(true);
  const [marksPerQuestion, setMarksPerQuestion] = useState<number>(1);
  const [importing, setImporting] = useState(false);

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

  // Fetch assessment and questions
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assessmentData, questionsData] = await Promise.all([
        assessmentApiClient.getAssessment(assessmentId),
        assessmentApiClient.getQuestions(assessmentId),
      ]);

      setAssessment(assessmentData);

      // Convert questions to form data
      const formQuestions: QuestionFormData[] = questionsData.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        options: q.options.map((opt) => ({
          option_label: opt.option_label,
          option_text: opt.option_text,
          is_correct: opt.is_correct,
        })),
        marks: q.marks,
        isNew: false,
        isSaved: true,
      }));

      // Show source modal if no questions exist and assessment is draft
      if (formQuestions.length === 0 && assessmentData.status === "DRAFT") {
        setShowSourceModal(true);
      }

      // Add empty question if none exist
      if (formQuestions.length === 0) {
        formQuestions.push({ ...EMPTY_QUESTION });
      }

      setQuestions(formQuestions);
    } catch (err) {
      const error = err as Error;
      setError(error.message || "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (assessmentId) {
      fetchData();
    }
  }, [assessmentId, fetchData]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  const fetchQuestionBanks = async () => {
    if (!assessment) return;
    setLoadingBanks(true);
    try {
      const banks = await assessmentApiClient.getQuestionBanks();
      // Filter banks by the assessment's subject
      const filteredBanks = banks.filter(b => b.subject === assessment.subject.id);
      setQuestionBanks(filteredBanks);
    } catch (err) {
      console.error("Failed to load question banks:", err);
      setQuestionBanks([]);
    } finally {
      setLoadingBanks(false);
    }
  };

  const handleManualEntry = () => {
    setShowSourceModal(false);
    // User can start adding questions manually
  };

  const handleImportFromBank = async () => {
    if (!selectedBankId || numQuestions <= 0) {
      showError("Please select a question bank and number of questions");
      return;
    }

    setImporting(true);
    try {
      await assessmentApiClient.importFromBank(assessmentId, {
        bank_id: selectedBankId,
        number_of_questions: numQuestions,
        randomize: randomize,
        marks_per_question: marksPerQuestion,
      });
      showSuccess("Questions imported successfully");
      setShowSourceModal(false);
      // Refresh the questions list and assessment data
      await fetchData();
    } catch (err) {
      const error = err as Error;
      showError(error.message || "Failed to import questions");
    } finally {
      setImporting(false);
    }
  };

  const getTotalQuestionMarks = () => {
    return questions.reduce((sum, q) => sum + q.marks, 0);
  };

  const isReadOnly = assessment?.status === "COMPLETED" || assessment?.status === "ACTIVE";

  const handleQuestionTextChange = (index: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index ? { ...q, question_text: value, isSaved: false } : q
      )
    );
  };

  const handleOptionTextChange = (
    questionIndex: number,
    optionLabel: OptionLabel,
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options.map((opt) =>
                opt.option_label === optionLabel
                  ? { ...opt, option_text: value }
                  : opt
              ),
              isSaved: false,
            }
          : q
      )
    );
  };

  const handleCorrectOptionChange = (
    questionIndex: number,
    optionLabel: OptionLabel
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options.map((opt) => ({
                ...opt,
                is_correct: opt.option_label === optionLabel,
              })),
              isSaved: false,
            }
          : q
      )
    );
  };

  const handleMarksChange = (index: number, value: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index ? { ...q, marks: Math.max(1, value), isSaved: false } : q
      )
    );
  };

  const validateQuestion = (question: QuestionFormData): string | null => {
    if (!question.question_text.trim()) {
      return "Question text is required";
    }
    const filledOptions = question.options.filter((opt) => opt.option_text.trim());
    if (filledOptions.length < 2) {
      return "At least 2 options are required";
    }
    const hasCorrectAnswer = question.options.some(
      (opt) => opt.is_correct && opt.option_text.trim()
    );
    if (!hasCorrectAnswer) {
      return "Please mark one option as correct";
    }
    if (question.marks <= 0) {
      return "Marks must be greater than 0";
    }
    return null;
  };

  const handleSaveQuestion = async (index: number) => {
    const question = questions[index];
    const validationError = validateQuestion(question);
    
    if (validationError) {
      showError(validationError);
      return;
    }

    setSaving(true);
    try {
      const requestData: CreateQuestionRequest = {
        question_text: question.question_text,
        options: question.options
          .filter((opt) => opt.option_text.trim())
          .map((opt) => ({
            option_label: opt.option_label,
            option_text: opt.option_text,
            is_correct: opt.is_correct,
          })),
        marks: question.marks,
      };

      if (question.isNew) {
        const savedQuestion = await assessmentApiClient.createQuestion(
          assessmentId,
          requestData
        );
        setQuestions((prev) =>
          prev.map((q, i) =>
            i === index
              ? { ...q, id: savedQuestion.id, isNew: false, isSaved: true }
              : q
          )
        );
        showSuccess("Question saved successfully");
      } else if (question.id) {
        await assessmentApiClient.updateQuestion(
          assessmentId,
          question.id,
          requestData
        );
        setQuestions((prev) =>
          prev.map((q, i) => (i === index ? { ...q, isSaved: true } : q))
        );
        showSuccess("Question updated successfully");
      }
    } catch (err) {
      const error = err as Error;
      showError(error.message || "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, { ...EMPTY_QUESTION }]);
  };

  const handleDeleteQuestion = async () => {
    const index = deleteConfirm.questionIndex;
    if (index === null) return;

    const question = questions[index];

    if (!question.isNew && question.id) {
      setSaving(true);
      try {
        await assessmentApiClient.deleteQuestion(assessmentId, question.id);
        showSuccess("Question deleted successfully");
      } catch (err) {
        const error = err as Error;
        showError(error.message || "Failed to delete question");
        setSaving(false);
        setDeleteConfirm({ isOpen: false, questionIndex: null });
        return;
      } finally {
        setSaving(false);
      }
    }

    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setDeleteConfirm({ isOpen: false, questionIndex: null });
  };

  const handlePublish = async () => {
    // Check if assessment is in DRAFT status
    if (assessment?.status !== "DRAFT") {
      showError(`Cannot publish ${assessment?.status.toLowerCase()} assessment. Only draft assessments can be published.`);
      setPublishConfirm(false);
      return;
    }

    // Validate all questions
    const unsavedQuestions = questions.filter((q) => !q.isSaved);
    if (unsavedQuestions.length > 0) {
      showError("Please save all questions before publishing");
      setPublishConfirm(false);
      return;
    }

    if (questions.length === 0 || (questions.length === 1 && questions[0].isNew)) {
      showError("At least one question is required");
      setPublishConfirm(false);
      return;
    }

    const totalQuestionMarks = getTotalQuestionMarks();
    if (assessment && totalQuestionMarks !== assessment.total_marks) {
      showError(
        `Total question marks (${totalQuestionMarks}) must equal assessment total marks (${assessment.total_marks})`
      );
      setPublishConfirm(false);
      return;
    }

    setPublishing(true);
    try {
      await assessmentApiClient.publishAssessment(assessmentId);
      showSuccess("Assessment published successfully!");
      setTimeout(() => {
        router.push("/dashboards/faculty/assessments");
      }, 1500);
    } catch (err) {
      const error = err as Error;
      showError(error.message || "Failed to publish assessment");
    } finally {
      setPublishing(false);
      setPublishConfirm(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!assessment) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            Assessment not found
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Question Builder</h1>
            <p className="text-gray-600 mt-1">{assessment.title}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>Batch: {assessment.batch.code}</span>
              <span>•</span>
              <span>Subject: {assessment.subject.name}</span>
              <span>•</span>
              <span>Total Marks: {assessment.total_marks}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                assessment.status === "DRAFT"
                  ? "bg-yellow-100 text-yellow-800"
                  : assessment.status === "SCHEDULED"
                  ? "bg-blue-100 text-blue-800"
                  : assessment.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {assessment.status}
            </span>
            {!isReadOnly && (
              <button
                onClick={() => setPublishConfirm(true)}
                disabled={publishing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
              >
                {publishing ? "Publishing..." : "Publish Assessment"}
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Marks Summary */}
        <div className="mb-6 bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-blue-800">
              Question Marks: {getTotalQuestionMarks()} / {assessment.total_marks}
            </span>
            {getTotalQuestionMarks() !== assessment.total_marks && (
              <span className="text-yellow-700 text-sm">
                ⚠️ Total must equal {assessment.total_marks} marks
              </span>
            )}
          </div>
        </div>

        {isReadOnly && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            This assessment is {assessment.status.toLowerCase()} and cannot be edited.
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                question.isSaved
                  ? "border-green-500"
                  : question.isNew
                  ? "border-blue-500"
                  : "border-yellow-500"
              }`}
            >
              {/* Question Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Question {index + 1}
                  {!question.isSaved && (
                    <span className="ml-2 text-sm font-normal text-yellow-600">
                      (unsaved)
                    </span>
                  )}
                </h3>
                {!isReadOnly && questions.length > 1 && (
                  <button
                    onClick={() =>
                      setDeleteConfirm({ isOpen: true, questionIndex: index })
                    }
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Question Text */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Text
                </label>
                <textarea
                  value={question.question_text}
                  onChange={(e) => handleQuestionTextChange(index, e.target.value)}
                  disabled={isReadOnly}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter your question here..."
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {question.options.map((option) => (
                  <div
                    key={option.option_label}
                    className={`p-3 border rounded-lg ${
                      option.is_correct
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300"
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <input
                        type="radio"
                        name={`correct-${index}`}
                        checked={option.is_correct}
                        onChange={() =>
                          handleCorrectOptionChange(index, option.option_label)
                        }
                        disabled={isReadOnly}
                        className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500"
                      />
                      <span className="font-medium text-gray-700">
                        Option {option.option_label}
                      </span>
                      {option.is_correct && (
                        <span className="ml-2 text-xs text-green-600 font-medium">
                          ✓ Correct
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={option.option_text}
                      onChange={(e) =>
                        handleOptionTextChange(
                          index,
                          option.option_label,
                          e.target.value
                        )
                      }
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder={`Enter option ${option.option_label}`}
                    />
                  </div>
                ))}
              </div>

              {/* Marks and Save */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Marks:
                  </label>
                  <input
                    type="number"
                    value={question.marks}
                    onChange={(e) =>
                      handleMarksChange(index, Number(e.target.value))
                    }
                    disabled={isReadOnly}
                    min="1"
                    className="w-20 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => handleSaveQuestion(index)}
                    disabled={saving || question.isSaved}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      question.isSaved
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400"
                    }`}
                  >
                    {saving ? "Saving..." : question.isSaved ? "Saved" : "Save Question"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        {!isReadOnly && (
          <div className="mt-6">
            <button
              onClick={handleAddQuestion}
              className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Question
            </button>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-6 flex justify-start">
          <button
            onClick={() => router.push("/dashboards/faculty/assessments")}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Assessments
          </button>
        </div>
      </div>

      {/* Question Source Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                How would you like to add questions?
              </h2>
              <p className="text-gray-600 mb-6">
                Choose how you want to add questions to this assessment
              </p>

              <div className="space-y-4 mb-6">
                {/* Manual Entry Option */}
                <button
                  onClick={handleManualEntry}
                  className="w-full text-left p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Manual Entry
                      </h3>
                      <p className="text-sm text-gray-600">
                        Add questions one by one with full control over each question and its options
                      </p>
                    </div>
                  </div>
                </button>

                {/* Import from Question Bank Option */}
                <div className="border-2 border-gray-300 rounded-lg p-4">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Import from Question Bank
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Select questions from an existing question bank to quickly populate your assessment
                      </p>

                      {/* Question Bank Selection */}
                      {!loadingBanks && questionBanks.length === 0 && (
                        <button
                          onClick={fetchQuestionBanks}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Load question banks
                        </button>
                      )}

                      {loadingBanks ? (
                        <div className="text-gray-500 text-sm">Loading question banks...</div>
                      ) : questionBanks.length > 0 ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Select Question Bank
                            </label>
                            <select
                              value={selectedBankId || ""}
                              onChange={(e) => setSelectedBankId(e.target.value ? Number(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            >
                              <option value="">-- Select a Question Bank --</option>
                              {questionBanks.map((bank) => (
                                <option key={bank.id} value={bank.id}>
                                  {bank.name} ({bank.questions_count} questions)
                                </option>
                              ))}
                            </select>
                          </div>

                          {selectedBankId && (
                            <>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Number of Questions
                                  </label>
                                  <input
                                    type="number"
                                    value={numQuestions}
                                    onChange={(e) => {
                                      const bank = questionBanks.find(b => b.id === selectedBankId);
                                      setNumQuestions(Math.max(1, Math.min(Number(e.target.value), bank?.questions_count || 100)));
                                    }}
                                    min="1"
                                    max={questionBanks.find(b => b.id === selectedBankId)?.questions_count || 100}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Marks per Question
                                  </label>
                                  <input
                                    type="number"
                                    value={marksPerQuestion}
                                    onChange={(e) => setMarksPerQuestion(Math.max(1, Number(e.target.value)))}
                                    min="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                  />
                                </div>
                              </div>

                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={randomize}
                                  onChange={(e) => setRandomize(e.target.checked)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">Randomize question selection</span>
                              </label>

                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                                <strong>Summary:</strong> {numQuestions} questions × {marksPerQuestion} marks = {numQuestions * marksPerQuestion} total marks
                              </div>

                              <button
                                onClick={handleImportFromBank}
                                disabled={importing}
                                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                              >
                                {importing ? "Importing..." : "Import Questions"}
                              </button>
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowSourceModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Question"
        message="Are you sure you want to delete this question? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteQuestion}
        onCancel={() => setDeleteConfirm({ isOpen: false, questionIndex: null })}
        variant="danger"
      />

      {/* Publish Confirmation Dialog */}
      <ConfirmDialog
        isOpen={publishConfirm}
        title="Publish Assessment"
        message="Once published, this assessment will be scheduled and you won't be able to modify the questions. Are you sure you want to publish?"
        confirmText="Publish"
        cancelText="Cancel"
        onConfirm={handlePublish}
        onCancel={() => setPublishConfirm(false)}
        variant="info"
      />
    </DashboardLayout>
  );
}
