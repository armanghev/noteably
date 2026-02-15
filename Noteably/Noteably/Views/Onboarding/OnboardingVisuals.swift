import SwiftUI

// MARK: - Reusable Components

struct GlassPanel<Content: View>: View {
    let content: Content
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    var body: some View {
        content
            .background(.thinMaterial)
            .background(Color.white.opacity(0.1))
            .overlay(
                RoundedRectangle(cornerRadius: 32)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 32))
            .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
    }
}

struct FloatingAnimation: ViewModifier {
    let delay: Double
    let distance: CGFloat
    @State private var isAnimating = false
    
    func body(content: Content) -> some View {
        content
            .offset(y: isAnimating ? -distance : 0)
            .animation(
                .easeInOut(duration: 3).repeatForever(autoreverses: true).delay(delay),
                value: isAnimating
            )
            .onAppear {
                isAnimating = true
            }
    }
}

extension View {
    func floating(delay: Double = 0, distance: CGFloat = 10) -> some View {
        modifier(FloatingAnimation(delay: delay, distance: distance))
    }
}

// MARK: - Page Visuals

struct TheHookVisual: View {
    var body: some View {
        ZStack {
            // Background Glow
            Circle()
                .fill(Color.noteablyPrimary.opacity(0.2))
                .frame(width: 250, height: 250)
                .blur(radius: 50)
            
            GlassPanel {
                VStack(spacing: 20) {
                    // Abstract Grid
                    Grid(horizontalSpacing: 8, verticalSpacing: 8) {
                        GridRow {
                            RoundedRectangle(cornerRadius: AppRadius.md)
                                .fill(Color.noteablyPrimary.opacity(0.8))
                                .frame(width: 60, height: 60)
                            RoundedRectangle(cornerRadius: AppRadius.md)
                                .fill(Color.noteablyPrimary.opacity(0.4))
                                .frame(width: 60, height: 60)
                        }
                        GridRow {
                            RoundedRectangle(cornerRadius: AppRadius.md)
                                .fill(Color.noteablyPrimary.opacity(0.4))
                                .frame(width: 60, height: 60)
                            RoundedRectangle(cornerRadius: AppRadius.md)
                                .fill(Color.noteablyPrimary.opacity(0.8))
                                .frame(width: 60, height: 60)
                        }
                    }
                    .padding(32)
                }
            }
            .frame(width: 220, height: 280)
            .rotationEffect(.degrees(5))
            .floating(delay: 0, distance: 15)
            
            // Floating Icons
            Image(systemName: "mic.fill")
                .font(.system(size: 20))
                .padding(12)
                .background(.thinMaterial)
                .clipShape(Circle())
                .shadow(radius: 5)
                .offset(x: 100, y: -80)
                .foregroundColor(Color.noteablyPrimary)
                .floating(delay: 1, distance: 10)
            
            Image(systemName: "doc.text.fill")
                .font(.system(size: 20))
                .padding(12)
                .background(.thinMaterial)
                .clipShape(Circle())
                .shadow(radius: 5)
                .offset(x: -100, y: 60)
                .foregroundColor(Color.noteablyPrimary)
                .floating(delay: 2, distance: 10)
        }
    }
}

struct CaptureVisual: View {
    @State private var isAnimating = false
    
    var body: some View {
        ZStack {
            Circle()
                .fill(Color.noteablyPrimary.opacity(0.15))
                .frame(width: 280, height: 280)
                .blur(radius: 60)
            
            GlassPanel {
                HStack(spacing: 6) {
                    // Bar 1 - Slow but steady
                    Capsule()
                        .fill(LinearGradient(
                            colors: [.noteablyPrimary.opacity(0.4), .noteablyPrimary, .noteablyPrimary.opacity(0.4)],
                            startPoint: .top,
                            endPoint: .bottom
                        ))
                        .frame(width: 8, height: isAnimating ? 45 : 15)
                        .animation(
                            .easeInOut(duration: 1.2)
                            .repeatForever(autoreverses: true),
                            value: isAnimating
                        )
                    
                    // Bar 2 - Taller, slightly faster
                    Capsule()
                        .fill(LinearGradient(
                            colors: [.noteablyPrimary.opacity(0.4), .noteablyPrimary, .noteablyPrimary.opacity(0.4)],
                            startPoint: .top,
                            endPoint: .bottom
                        ))
                        .frame(width: 8, height: isAnimating ? 75 : 15)
                        .animation(
                            .easeInOut(duration: 1.5)
                            .repeatForever(autoreverses: true)
                            .delay(0.2), // Offset phase
                            value: isAnimating
                        )
                    
                    // Bar 3 - Tallest (Center), moderate speed
                    Capsule()
                        .fill(LinearGradient(
                            colors: [.noteablyPrimary.opacity(0.4), .noteablyPrimary, .noteablyPrimary.opacity(0.4)],
                            startPoint: .top,
                            endPoint: .bottom
                        ))
                        .frame(width: 8, height: isAnimating ? 95 : 15)
                        .animation(
                            .easeInOut(duration: 1.3)
                            .repeatForever(autoreverses: true)
                            .delay(0.1), // Slightly different phase
                            value: isAnimating
                        )
                    
                    // Bar 4 - Similar to Bar 2 but different timing
                    Capsule()
                        .fill(LinearGradient(
                            colors: [.noteablyPrimary.opacity(0.4), .noteablyPrimary, .noteablyPrimary.opacity(0.4)],
                            startPoint: .top,
                            endPoint: .bottom
                        ))
                        .frame(width: 8, height: isAnimating ? 70 : 15)
                        .animation(
                            .easeInOut(duration: 1.4)
                            .repeatForever(autoreverses: true)
                            .delay(0.3), // Lag behind
                            value: isAnimating
                        )
                    
                    // Bar 5 - Similar to Bar 1 but different timing
                    Capsule()
                        .fill(LinearGradient(
                            colors: [.noteablyPrimary.opacity(0.4), .noteablyPrimary, .noteablyPrimary.opacity(0.4)],
                            startPoint: .top,
                            endPoint: .bottom
                        ))
                        .frame(width: 8, height: isAnimating ? 50 : 15)
                        .animation(
                            .easeInOut(duration: 1.1)
                            .repeatForever(autoreverses: true)
                            .delay(0.15),
                            value: isAnimating
                        )
                }
                .frame(width: 200, height: 200)
            }
            .frame(width: 240, height: 240)
            .floating(delay: 0.5)
            
            // Mic Icon Badge
            Image(systemName: "mic.fill")
                .font(.system(size: 20))
                .padding(12)
                .background(.thinMaterial)
                .clipShape(Circle())
                .shadow(radius: 5)
                .offset(x: 90, y: -90)
                .foregroundColor(Color.noteablyPrimary)
                .floating(delay: 1.5)
        }
        .onAppear {
            isAnimating = true
        }
    }
}

struct AITutorVisual: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(Color.noteablyPrimary.opacity(0.2))
                .frame(width: 260, height: 260)
                .blur(radius: 50)
            
            GlassPanel {
                VStack {
                    Image("Nota")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 100, height: 100)
                        .padding(40)
                }
            }
            .frame(width: 240, height: 280)
            .floating()
            
            // Orbiting elements
            Image(systemName: "bolt.fill")
                .font(.system(size: 20))
                .padding(12)
                .background(Color.noteablyCard)
                .clipShape(Circle())
                .shadow(radius: 5)
                .offset(x: 90, y: -90)
                .foregroundColor(Color.noteablyPrimary)
                .floating(delay: 0.7)
            
            Image(systemName: "checklist")
                .font(.system(size: 20))
                .padding(12)
                .background(Color.noteablyCard)
                .clipShape(Circle())
                .shadow(radius: 5)
                .offset(x: -90, y: 70)
                .foregroundColor(Color.noteablyPrimary)
                .floating(delay: 1.2)
        }
    }
}

struct GetStartedVisual: View {
    var body: some View {
        ZStack {
            // Glow
            Circle()
                .fill(Color.noteablyPrimary.opacity(0.3))
                .frame(width: 300, height: 300)
                .blur(radius: 60)
            
            // Glass Card
            GlassPanel {
                Image(systemName: "sparkles")
                    .font(.system(size: 80))
                    .foregroundStyle(Color.noteablyPrimary)
                    .padding(60)
                    .rotationEffect(.degrees(-10))
            }
            .rotationEffect(.degrees(6))
            .floating(distance: 20)
        }
    }
}

#Preview {
    VStack {
        TheHookVisual()
        CaptureVisual()
        AITutorVisual()
        GetStartedVisual()
    }
    .padding()
    .background(Color.noteablyBackground)
}
