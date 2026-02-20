import SwiftUI

struct AccountDeletedView: View {
    var onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(Color.noteablyPrimary)

            VStack(spacing: 12) {
                Text("Account Deletion Initiated")
                    .font(.noteablySerif(24, weight: .bold))
                    .foregroundStyle(Color.noteablyForeground)
                    .multilineTextAlignment(.center)

                Text("Your account deletion request has been processed. Check your email for recovery instructions.")
                    .font(.noteablyBody(16))
                    .foregroundStyle(Color.noteablySecondaryText)
                    .multilineTextAlignment(.center)
            }

            Text("You have a 14-day grace period to recover your account by clicking the link in the email we just sent you. After the grace period expires, your account and all associated data will be permanently deleted.")
                .font(.noteablyBody(14))
                .foregroundStyle(Color.noteablySecondaryText.opacity(0.8))
                .multilineTextAlignment(.center)

            Spacer()

            Button("Return to Home") {
                onDismiss()
            }
            .buttonStyle(NoteablySecondaryButtonStyle())
        }
        .padding(.horizontal, 32)
        .padding(.vertical, 24)
        .background(Color.noteablyBackground)
    }
}
