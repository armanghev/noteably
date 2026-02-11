import SwiftUI

struct OnboardingView: View {
    enum AuthMode: Identifiable {
        case signIn, signUp
        
        var id: Int { hashValue }
    }

    @State private var currentPage = 0
    @State private var activeSheet: AuthMode?
    
    // We might need to access the AppState or AuthService here if we want to set a "hasSeenOnboarding" flag
    // For now, we'll just focus on navigation to Auth
    
    var body: some View {
        ZStack {
            Color.noteablyBackground
                .ignoresSafeArea()
            
            // Content Layer
            TabView(selection: $currentPage) {
                ForEach(0..<OnboardingContent.pages.count, id: \.self) { index in
                    OnboardingContentPage(data: OnboardingContent.pages[index])
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.easeInOut, value: currentPage)
            .ignoresSafeArea()
            
            // Controls Layer
            VStack {
                // Top Bar (Skip Button and Indicators)
                HStack {
                    Button {
                         withAnimation {
                            currentPage = OnboardingContent.pages.count - 1
                        }
                    } label: {
                        Text("Skip")
                            .font(.noteablyBody(16, weight: .medium))
                            .foregroundStyle(Color.noteablySecondaryText)
                    }
                    .opacity(currentPage < OnboardingContent.pages.count - 1 ? 1 : 0)
                    .disabled(currentPage >= OnboardingContent.pages.count - 1)
                    
                    Spacer()
                    
                    // Page Indicators
                    HStack(spacing: 8) {
                        ForEach(0..<OnboardingContent.pages.count, id: \.self) { index in
                            if currentPage == index {
                                Capsule()
                                    .fill(Color.noteablyPrimary)
                                    .frame(width: 24, height: 8)
                            } else {
                                Circle()
                                    .fill(Color.noteablyPrimary.opacity(0.2))
                                    .frame(width: 8, height: 8)
                            }
                        }
                    }
                    .animation(.spring(), value: currentPage)
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)
                
                Spacer()
                
                // Controls
                VStack(spacing: 24) {
                    if currentPage == OnboardingContent.pages.count - 1 {
                        // Final Page Actions
                        VStack(spacing: 16) {
                            Button {
                                activeSheet = .signUp
                            } label: {
                                Text("Get Started Free")
                                    .font(.noteablyBody(17, weight: .semibold))
                                    .foregroundStyle(Color.noteablyBackground)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 56)
                                    .background(
                                        Capsule()
                                            .fill(Color.noteablyPrimary)
                                    )
                                    .shadow(color: Color.noteablyPrimary.opacity(0.3), radius: 10, x: 0, y: 5)
                            }
                            
                            Button {
                                activeSheet = .signIn
                            } label: {
                                Text("I have an account")
                                    .font(.noteablyBody(17, weight: .semibold))
                                    .foregroundStyle(Color.noteablyPrimary)
                            }
                        }
                        .padding(.horizontal, 24)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                    } else {
                        // Continue Button
                        VStack(spacing: 16) {
                            Button {
                                withAnimation {
                                    currentPage += 1
                                }
                            } label: {
                                Text("Continue")
                                    .font(.noteablyBody(17, weight: .semibold))
                                    .foregroundStyle(Color.noteablyBackground)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 56)
                                    .background(
                                        Capsule()
                                            .fill(Color.noteablyPrimary)
                                    )
                                    .shadow(color: Color.noteablyPrimary.opacity(0.3), radius: 10, x: 0, y: 5)
                            }
                            
                            // Placeholder to match "I have an account" button height + spacing
                            Text("I have an account")
                                .font(.noteablyBody(17, weight: .semibold))
                                .hidden()
                        }
                        .padding(.horizontal, 24)
                    }
                }
                .padding(.bottom, 40)
            }
        }
        .fullScreenCover(item: $activeSheet) { item in
            Group {
                switch item {
                case .signIn:
                    SignInView(switchToSignUp: {
                        activeSheet = .signUp
                    })
                case .signUp:
                    SignUpView(switchToSignIn: {
                        activeSheet = .signIn
                    })
                }
            }
        }
    }
}

// Wrapper to match the name used in TabView
struct OnboardingContentPage: View {
    let data: OnboardingPageData
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            
            // Visual
            Group {
                switch data.type {
                case .hook:
                    TheHookVisual()
                case .capture:
                    CaptureVisual()
                case .aiTutor:
                    AITutorVisual()
                case .getStarted:
                    GetStartedVisual()
                }
            }
            .frame(height: 320)
            
            // Text Content
            VStack(spacing: 16) {
                Text(data.title)
                    .font(.noteablySerif(36, weight: .bold)) // Instrument Serif approx
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Color.noteablyForeground)
                    .fixedSize(horizontal: false, vertical: true)
                
                Text(data.subtitle)
                    .font(.noteablyBody(17)) // Inter
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Color.noteablySecondaryText)
                    .lineSpacing(4)
                    .padding(.horizontal, 24)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer()
            }
            .padding(.bottom, 20)
            
            Spacer()
        }
        .padding(.horizontal, 24)
    }
}

// MockupView removed in visual update

#Preview {
    OnboardingView()
}

