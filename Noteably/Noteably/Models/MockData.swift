import Foundation

#if DEBUG

struct MockData {
    
    // MARK: - Auth
    
    static let user = AuthUser(
        id: "user-123",
        email: "demo@noteably.app",
        createdAt: "2023-01-01T12:00:00Z",
        userMetadata: nil,
        appMetadata: nil
    )
    
    static let session = AuthSession(
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresIn: 3600,
        tokenType: "bearer"
    )
    
    static let userProfile = UserProfileResponse(
        user: user,
        userId: "user-123"
    )
    
    // MARK: - Jobs (Full)
    
    static let jobCompleted = Job(
        id: "job-completed",
        userId: "user-123",
        filename: "Lecture_Physics_101.mp3",
        fileSizeBytes: 1024 * 1024 * 15, // 15MB
        fileType: "audio/mpeg",
        storageUrl: "https://example.com/audio.mp3",
        materialTypes: ["summary", "notes", "flashcards", "quiz"],
        options: JobOptions(summaryLength: "medium", flashcardCount: 10, quizQuestionCount: 5, difficulty: "intermediate"),
        status: .completed,
        transcriptionText: "This is a sample transcription of the lecture...",
        transcriptionWords: [
            TranscriptionWord(text: "This", start: 0.0, end: 0.5, confidence: 0.99),
            TranscriptionWord(text: "is", start: 0.5, end: 0.8, confidence: 0.99),
            TranscriptionWord(text: "Physics", start: 0.8, end: 1.5, confidence: 0.95)
        ],
        progress: 100,
        currentStep: nil,
        errorMessage: nil,
        createdAt: "2023-10-25T10:00:00Z",
        startedAt: "2023-10-25T10:00:05Z",
        completedAt: "2023-10-25T10:05:00Z",
        generatedContent: [
            GeneratedContentItem(id: 1, type: "summary", content: .string("Summary content"), createdAt: "2023-10-25T10:05:00Z")
        ]
    )
    
    static let jobKeyPoints = [
        "Newton's laws of motion are fundamental.",
        "Energy is conserved in a closed system.",
        "Force equals mass times acceleration."
    ]
    
    static let jobSummary = SummaryContent(
        title: "Physics 101: Mechanics",
        summary: "This lecture covers the basic principles of Newtonian mechanics, focusing on laws of motion and energy conservation.",
        keyPoints: jobKeyPoints
    )
    
    static let jobNotes = NotesContent(
        content: """
        # Physics 101
        
        ## Newton's Laws
        1. An object at rest stays at rest.
        2. F = ma
        3. Every action has an equal and opposite reaction.
        
        ## Energy
        - Kinetic: 1/2 mv^2
        - Potential: mgh
        """
    )
    
    static let jobFlashcards = FlashcardsContent(
        flashcards: [
            Flashcard(front: "What is F=ma?", back: "Newton's Second Law"),
            Flashcard(front: "Unit of Force?", back: "Newton (N)")
        ]
    )
    
    static let jobQuiz = QuizContent(
        questions: [
            QuizQuestion(
                question: "What is the unit of force?",
                options: ["Joule", "Newton", "Watt", "Pascal"],
                correctOption: 1,
                explanation: "Newton is the SI unit of force."
            ),
             QuizQuestion(
                question: "Which law states F=ma?",
                options: ["First", "Second", "Third", "None"],
                correctOption: 1,
                explanation: "Newton's Second Law relates force, mass, and acceleration."
            )
        ]
    )
    
    static let contentData = ContentData(
        summary: jobSummary,
        notes: jobNotes,
        flashcards: jobFlashcards,
        quiz: jobQuiz
    )
    
    static let contentResponse = ContentResponse(
        jobId: "job-completed",
        status: "completed",
        content: contentData
    )

    static let jobProcessing = Job(
        id: "job-processing",
        userId: "user-123",
        filename: "Meeting_Recording.m4a",
        fileSizeBytes: 1024 * 1024 * 5,
        fileType: "audio/mp4",
        storageUrl: nil,
        materialTypes: ["summary"],
        options: nil,
        status: .transcribing,
        transcriptionText: nil,
        transcriptionWords: nil,
        progress: 45,
        currentStep: "Transcribing audio...",
        errorMessage: nil,
        createdAt: "2023-10-26T09:00:00Z",
        startedAt: "2023-10-26T09:00:05Z",
        completedAt: nil,
        generatedContent: nil
    )
    
    static let jobFailed = Job(
        id: "job-failed",
        userId: "user-123",
        filename: "Corrupted_File.mp3",
        fileSizeBytes: 1024,
        fileType: "audio/mpeg",
        storageUrl: nil,
        materialTypes: ["summary"],
        options: nil,
        status: .failed,
        transcriptionText: nil,
        transcriptionWords: nil,
        progress: 0,
        currentStep: nil,
        errorMessage: "File format not supported or corrupted.",
        createdAt: "2023-10-27T08:00:00Z",
        startedAt: "2023-10-27T08:00:05Z",
        completedAt: "2023-10-27T08:00:10Z",
        generatedContent: nil
    )
    
    static let jobs: [Job] = [jobCompleted, jobProcessing, jobFailed]
    
    // MARK: - Job List Items
    
    static let jobListItemCompleted = JobListItem(
        id: "job-completed",
        filename: "Lecture_Physics_101.mp3",
        fileType: "audio/mpeg",
        status: .completed,
        progress: 100,
        currentStep: nil,
        errorMessage: nil,
        createdAt: "2023-10-25T10:00:00Z",
        completedAt: "2023-10-25T10:05:00Z",
        flashcardCount: 10,
        quizCount: 5,
        contentTypes: ["summary", "notes", "flashcards", "quiz"],
        summaryTitle: "Physics 101: Mechanics",
        summaryPreview: "This lecture covers the basic principles of Newtonian mechanics..."
    )
    
    static let jobListItemProcessing = JobListItem(
        id: "job-processing",
        filename: "Meeting_Recording.m4a",
        fileType: "audio/mp4",
        status: .transcribing,
        progress: 45,
        currentStep: "Transcribing...",
        errorMessage: nil,
        createdAt: "2023-10-26T09:00:00Z",
        completedAt: nil,
        flashcardCount: nil,
        quizCount: nil,
        contentTypes: nil,
        summaryTitle: nil,
        summaryPreview: nil
    )
    
    static let jobListItemFailed = JobListItem(
        id: "job-failed",
        filename: "Corrupted.mp3",
        fileType: "audio/mpeg",
        status: .failed,
        progress: 0,
        currentStep: nil,
        errorMessage: "Format error",
        createdAt: "2023-10-27T08:00:00Z",
        completedAt: nil,
        flashcardCount: nil,
        quizCount: nil,
        contentTypes: nil,
        summaryTitle: nil,
        summaryPreview: nil
    )
    
    static let jobList: [JobListItem] = [jobListItemCompleted, jobListItemProcessing, jobListItemFailed]
    
    static let recentJobs: [RecentJob] = [
        RecentJob(from: jobListItemCompleted),
        RecentJob(from: jobListItemProcessing),
        RecentJob(from: jobListItemFailed)
    ]
    
    // MARK: - Dashboard
    
    static let dashboardStats = DashboardStats(
        totalNotes: 12,
        totalFlashcards: 150
    )
    
    static let dashboardResponse = DashboardResponse(
        stats: dashboardStats,
        recentJobs: recentJobs
    )
    
    // MARK: - Subscription
    
    static let subscription = Subscription(
        tier: "pro",
        monthlyUploadLimit: 50,
        monthlyMinutesLimit: 300,
        maxFileSizeMb: 500,
        uploadsThisMonth: 12,
        minutesUsedThisMonth: 45,
        uploadsRemaining: 38,
        minutesRemaining: 255
    )
}

// Extension to map JobListItem to RecentJob if not already there
extension RecentJob {
    init(from job: JobListItem) {
        self.init(id: job.id, filename: job.filename, fileType: job.fileType, status: job.status, createdAt: job.createdAt, cachedFlashcardCount: job.flashcardCount)
    }
}

#endif
