import SwiftUI

struct LandingView: View {
    @State private var showAuth = false
    @State private var authMode: AuthMode = .signIn
    @State private var heroVisible = false
    @State private var featuresVisible = false
    @State private var ctaVisible = false

    enum AuthMode {
        case signIn, signUp
    }

    var body: some View {
        ZStack {
            // Background
            Color.noteablyBackground
                .ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    heroSection
                    featuresSection
                    showcaseSection
                    ctaSection
                }
            }
        }
        .fullScreenCover(isPresented: $showAuth) {
            switch authMode {
            case .signIn:
                SignInView(switchToSignUp: {
                    authMode = .signUp
                })
            case .signUp:
                SignUpView(switchToSignIn: {
                    authMode = .signIn
                })
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.8)) {
                heroVisible = true
            }
            withAnimation(.easeOut(duration: 0.8).delay(0.3)) {
                featuresVisible = true
            }
            withAnimation(.easeOut(duration: 0.8).delay(0.6)) {
                ctaVisible = true
            }
        }
    }

    // MARK: - Hero Section

    private var heroSection: some View {
        VStack(spacing: 24) {
            Spacer()
                .frame(height: 60)

            // Badge
            HStack(spacing: 6) {
                Image(systemName: "sparkles")
                    .font(.system(size: 13, weight: .semibold))
                Text("AI-Powered Study Assistant")
                    .font(.noteablyBody(13, weight: .semibold))
            }
            .foregroundStyle(Color.noteablyPrimary)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                Capsule()
                    .fill(Color.noteablyPrimary.opacity(0.12))
            )

            // Headline
            VStack(spacing: 8) {
                Text("Turn content into")
                    .font(.noteablySerif(40, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)

                Text("knowledge.")
                    .font(.noteablySerif(40, weight: .bold))
                    .italic()
                    .foregroundStyle(Color.noteablyPrimary)
            }
            .multilineTextAlignment(.center)

            // Subheadline
            Text("Upload any video, audio, or PDF.\nNoteably generates notes, flashcards,\nand quizzes automatically.")
                .font(.noteablyBody(17))
                .foregroundStyle(Color.noteablySecondaryText)
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.horizontal, 24)

            // CTA Buttons
            VStack(spacing: 14) {
                Button {
                    authMode = .signUp
                    showAuth = true
                } label: {
                    HStack(spacing: 8) {
                        Text("Get Started Free")
                        Image(systemName: "arrow.right")
                            .font(.system(size: 15, weight: .semibold))
                    }
                }
                .buttonStyle(NoteablyPrimaryButtonStyle())
                .padding(.horizontal, 40)

                Button {
                    authMode = .signIn
                    showAuth = true
                } label: {
                    HStack(spacing: 8) {
                        Text("I have an account")
                    }
                }
                .buttonStyle(NoteablySecondaryButtonStyle())
                .padding(.horizontal, 40)
            }
            .padding(.top, 8)

            Spacer()
                .frame(height: 32)

            // Hero visual — mockup of the app
            heroMockup
                .padding(.horizontal, 24)
        }
        .opacity(heroVisible ? 1 : 0)
        .offset(y: heroVisible ? 0 : 30)
    }

    // MARK: - Hero Mockup

    private var heroMockup: some View {
        VStack(spacing: 0) {
            // Window title bar
            HStack {
                HStack(spacing: 7) {
                    Circle().fill(Color.red.opacity(0.8)).frame(width: 10, height: 10)
                    Circle().fill(Color.yellow.opacity(0.8)).frame(width: 10, height: 10)
                    Circle().fill(Color.green.opacity(0.8)).frame(width: 10, height: 10)
                }
                Spacer()
                Text("Noteably")
                    .font(.noteablyBody(12, weight: .medium))
                    .foregroundStyle(Color.noteablySecondaryText)
                Spacer()
                // Balance spacer
                HStack(spacing: 7) {
                    Circle().fill(Color.clear).frame(width: 10, height: 10)
                    Circle().fill(Color.clear).frame(width: 10, height: 10)
                    Circle().fill(Color.clear).frame(width: 10, height: 10)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.noteablyCard.opacity(0.8))

            Divider()
                .foregroundStyle(Color.noteablyBorder)

            // Upload zone
            VStack(spacing: 12) {
                Image(systemName: "arrow.up.doc")
                    .font(.system(size: 28, weight: .light))
                    .foregroundStyle(Color.noteablyPrimary)

                Text("Drop your lectures here")
                    .font(.noteablyBody(15, weight: .medium))
                    .foregroundStyle(Color.noteablyForeground)

                Text("PDF, MP3, MP4 supported")
                    .font(.noteablyBody(12))
                    .foregroundStyle(Color.noteablySecondaryText)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 28)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(Color.noteablyPrimary.opacity(0.3), style: StrokeStyle(lineWidth: 1.5, dash: [6]))
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(Color.noteablyPrimary.opacity(0.04))
                    )
            )
            .padding(16)

            // Output cards
            HStack(spacing: 10) {
                mockOutputCard(icon: "doc.text", title: "Notes", color: .noteablyMint)
                mockOutputCard(icon: "rectangle.on.rectangle", title: "Cards", color: .noteablyAmber)
                mockOutputCard(icon: "bolt", title: "Quiz", color: .noteablyLavender)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 16)
        }
        .background(Color.noteablyCard)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: Color.noteablyPrimary.opacity(0.08), radius: 24, x: 0, y: 12)
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.noteablyBorder.opacity(0.5), lineWidth: 1)
        )
    }

    private func mockOutputCard(icon: String, title: String, color: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(Color.noteablyPrimary)
            Text(title)
                .font(.noteablyBody(12, weight: .medium))
                .foregroundStyle(Color.noteablyForeground)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(color)
        )
    }

    // MARK: - Features Section

    private var featuresSection: some View {
        VStack(spacing: 28) {
            Spacer()
                .frame(height: 48)

            Text("Your personal\nAI tutor.")
                .font(.noteablySerif(32, weight: .bold))
                .foregroundStyle(Color.noteablyForeground)
                .multilineTextAlignment(.center)

            VStack(spacing: 16) {
                featureRow(
                    icon: "doc.text.magnifyingglass",
                    title: "Auto-Transcription",
                    description: "Instant, accurate transcripts from lectures or meetings. Never miss a word.",
                    delay: 0.0
                )
                featureRow(
                    icon: "brain.head.profile",
                    title: "Smart Flashcards",
                    description: "AI identifies key concepts and creates spaced-repetition decks automatically.",
                    delay: 0.1
                )
                featureRow(
                    icon: "bolt.fill",
                    title: "Practice Quizzes",
                    description: "Generated multiple-choice questions to test yourself before the real exam.",
                    delay: 0.2
                )
                featureRow(
                    icon: "mic.badge.plus",
                    title: "Record Lectures",
                    description: "Record directly in the app. Your phone becomes a study material generator.",
                    delay: 0.3
                )
            }
            .padding(.horizontal, 24)

            Spacer()
                .frame(height: 24)
        }
        .opacity(featuresVisible ? 1 : 0)
        .offset(y: featuresVisible ? 0 : 20)
    }

    private func featureRow(icon: String, title: String, description: String, delay: Double) -> some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(Color.noteablyPrimary)
                .frame(width: 48, height: 48)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.noteablyPrimary.opacity(0.10))
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.noteablyBody(17, weight: .semibold))
                    .foregroundStyle(Color.noteablyForeground)
                Text(description)
                    .font(.noteablyBody(15))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .lineSpacing(2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.noteablyCard)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Color.noteablyBorder.opacity(0.4), lineWidth: 1)
        )
    }

    // MARK: - Showcase Section

    private var showcaseSection: some View {
        VStack(spacing: 20) {
            Spacer()
                .frame(height: 32)

            // Stats callout
            VStack(spacing: 8) {
                Text("10x")
                    .font(.noteablySerif(56, weight: .bold))
                    .foregroundStyle(Color.noteablyPrimary)

                Text("Faster Note Taking")
                    .font(.noteablyBody(18, weight: .semibold))
                    .foregroundStyle(Color.noteablyForeground)

                Text("Stop rewinding the video.\nNoteably captures everything the first time.")
                    .font(.noteablyBody(15))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .multilineTextAlignment(.center)
                    .lineSpacing(2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 36)
            .padding(.horizontal, 24)
            .background(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(Color.noteablyCard)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(Color.noteablyBorder.opacity(0.4), lineWidth: 1)
            )
            .padding(.horizontal, 24)

            // Comparison
            HStack(spacing: 12) {
                comparisonColumn(
                    title: "Old way",
                    items: ["Pause & rewind video", "Messy scribbles", "Hours making cards"],
                    isPositive: false
                )
                comparisonColumn(
                    title: "Noteably",
                    items: ["Transcript in seconds", "Auto-generated notes", "One-tap flashcards"],
                    isPositive: true
                )
            }
            .padding(.horizontal, 24)

            Spacer()
                .frame(height: 16)
        }
    }

    private func comparisonColumn(title: String, items: [String], isPositive: Bool) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.noteablyBody(14, weight: .bold))
                .foregroundStyle(isPositive ? Color.noteablyPrimary : Color.noteablySecondaryText)
                .textCase(.uppercase)
                .tracking(1)

            ForEach(items, id: \.self) { item in
                HStack(spacing: 10) {
                    Image(systemName: isPositive ? "checkmark.circle.fill" : "xmark.circle")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(isPositive ? Color.noteablyPrimary : Color.noteablySecondaryText.opacity(0.6))
                    Text(item)
                        .font(.noteablyBody(14))
                        .foregroundStyle(Color.noteablyForeground)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(isPositive ? Color.noteablyPrimary.opacity(0.06) : Color.noteablyCard)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(isPositive ? Color.noteablyPrimary.opacity(0.2) : Color.noteablyBorder.opacity(0.4), lineWidth: 1)
        )
    }

    // MARK: - CTA Section

    private var ctaSection: some View {
        VStack(spacing: 20) {
            Spacer()
                .frame(height: 40)

            VStack(spacing: 12) {
                Text("Ready to study\nsmarter?")
                    .font(.noteablySerif(32, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)
                    .multilineTextAlignment(.center)

                Text("Join thousands of students who\nstopped wasting time on prep work.")
                    .font(.noteablyBody(16))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .multilineTextAlignment(.center)
                    .lineSpacing(2)
            }

            Button {
                authMode = .signUp
                showAuth = true
            } label: {
                HStack(spacing: 8) {
                    Text("Start Free")
                    Image(systemName: "arrow.right")
                        .font(.system(size: 15, weight: .semibold))
                }
            }
            .buttonStyle(NoteablyPrimaryButtonStyle())
            .padding(.horizontal, 60)

            // Footer
            VStack(spacing: 8) {
                Text("Noteably")
                    .font(.noteablySerif(18, weight: .semibold))
                    .foregroundStyle(Color.noteablySecondaryText)

                Text("© 2026 Noteably. All rights reserved.")
                    .font(.noteablyBody(12))
                    .foregroundStyle(Color.noteablySecondaryText.opacity(0.6))
            }
            .padding(.top, 32)

            Spacer()
                .frame(height: 40)
        }
        .opacity(ctaVisible ? 1 : 0)
        .offset(y: ctaVisible ? 0 : 20)
    }
}

#Preview {
    LandingView()
}
