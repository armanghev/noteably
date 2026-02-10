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
            
            VStack {
                // Top Bar (Skip Button)
                HStack {
                    if currentPage < OnboardingContent.pages.count - 1 {
                        Button {
                            // Skip to last page or directly to auth?
                            // Let's skip to last page for now or just auth
                            withAnimation {
                                currentPage = OnboardingContent.pages.count - 1
                            }
                        } label: {
                            Text("Skip")
                                .font(.noteablyBody(16, weight: .medium))
                                .foregroundStyle(Color.noteablySecondaryText)
                        }
                    } else {
                        Spacer()
                    }
                    Spacer()
                }
                .padding(.horizontal, 24)
                .padding(.top, 16)
                
                // Content
                TabView(selection: $currentPage) {
                    ForEach(0..<OnboardingContent.pages.count, id: \.self) { index in
                        OnboardingContentPage(data: OnboardingContent.pages[index]) // Renamed to avoid confusion if needed, but OnboardingPage is fine
                            .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut, value: currentPage)
                
                // Indicators and Controls
                VStack(spacing: 24) {
                    // Page Indicators
                    HStack(spacing: 8) {
                        ForEach(0..<OnboardingContent.pages.count, id: \.self) { index in
                            Circle()
                                .fill(currentPage == index ? Color.noteablyPrimary : Color.noteablyPrimary.opacity(0.2))
                                .frame(width: 8, height: 8)
                                .scaleEffect(currentPage == index ? 1.2 : 1.0)
                                .animation(.spring(), value: currentPage)
                        }
                    }
                    
                    // Buttons
                    if currentPage == OnboardingContent.pages.count - 1 {
                        // Final Page Actions
                        VStack(spacing: 16) {
                            Button {
                                activeSheet = .signUp
                            } label: {
                                Text("Get Started Free")
                                    .font(.noteablyBody(17, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 56)
                                    .background(
                                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                                            .fill(Color.noteablyPrimary)
                                    )
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
                        // Next Button
                        Button {
                            withAnimation {
                                currentPage += 1
                            }
                        } label: {
                            Image(systemName: "arrow.right")
                                .font(.system(size: 20, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(width: 56, height: 56)
                                .background(
                                    Circle()
                                        .fill(Color.noteablyPrimary)
                                )
                                .shadow(color: Color.noteablyPrimary.opacity(0.3), radius: 10, x: 0, y: 5)
                        }
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
            
            // Badge
            if data.showMockup {
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
            }
            
            VStack(spacing: 16) {
                Text(data.title)
                    .font(.noteablySerif(36, weight: .bold))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Color.noteablyForeground)
                    .fixedSize(horizontal: false, vertical: true)
                
                Text(data.subtitle)
                    .font(.noteablyBody(17))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Color.noteablySecondaryText)
                    .lineSpacing(4)
                    .padding(.horizontal, 24)
                    .fixedSize(horizontal: false, vertical: true)
            }
            
             if data.showMockup {
                 MockupView()
                     .frame(height: 280)
             } else {
                 // For other pages, we can show a large icon or illustration
                 ZStack {
                     Circle()
                         .fill(Color.noteablyPrimary.opacity(0.05))
                         .frame(width: 200, height: 200)
                     
                     Image(systemName: data.iconName)
                         .font(.system(size: 80))
                         .foregroundStyle(Color.noteablyPrimary)
                 }
                 .padding(.vertical, 40)
             }
            
            Spacer()
        }
        .padding(.horizontal, 24)
    }
}

struct MockupView: View {
    var body: some View {
        ZStack {
             RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color.noteablyCard)
                .shadow(color: Color.black.opacity(0.08), radius: 24, x: 0, y: 12)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.noteablyBorder.opacity(0.5), lineWidth: 1)
                )
                .padding(.horizontal, 20)
            
            VStack(spacing: 0) {
                 // Window Header
                HStack(spacing: 6) {
                    Circle().fill(Color.red.opacity(0.8)).frame(width: 8, height: 8)
                    Circle().fill(Color.yellow.opacity(0.8)).frame(width: 8, height: 8)
                    Circle().fill(Color.green.opacity(0.8)).frame(width: 8, height: 8)
                    Spacer()
                }
                .padding(12)
                .background(Color.noteablyCard.opacity(0.9))
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous).path(in: CGRect(x: 0, y: 0, width: 350, height: 40))) // simplified clip
                
                Divider().foregroundStyle(Color.noteablyBorder)
                
                // Content
                VStack(spacing: 16) {
                    Image(systemName: "arrow.up.doc")
                        .font(.system(size: 32, weight: .light))
                        .foregroundStyle(Color.noteablyPrimary)
                    
                    Text("Drop your lectures here")
                        .font(.noteablyBody(14, weight: .medium))
                        .foregroundStyle(Color.noteablyForeground)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.noteablyCard)
            }
            .padding(.horizontal, 20)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
    }
}

