import Foundation

// MARK: - Auth Responses

struct AuthResponse: Codable {
    let user: AuthUser?
    let session: AuthSession?
    let message: String?
}

struct AuthUser: Codable {
    let id: String
    let email: String
    let createdAt: String?
    let userMetadata: [String: AnyCodableValue]?
    let appMetadata: [String: AnyCodableValue]?

    enum CodingKeys: String, CodingKey {
        case id, email
        case createdAt = "created_at"
        case userMetadata = "user_metadata"
        case appMetadata = "app_metadata"
    }
}

struct AuthSession: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
    let tokenType: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case tokenType = "token_type"
    }
}

// MARK: - User Profile Response

struct UserProfileResponse: Codable {
    let user: AuthUser
    let userId: String

    enum CodingKeys: String, CodingKey {
        case user
        case userId = "user_id"
    }
}

// MARK: - Subscription

struct Subscription: Codable {
    let tier: String
    let monthlyUploadLimit: Int
    let monthlyMinutesLimit: Int
    let maxFileSizeMb: Int
    let uploadsThisMonth: Int
    let minutesUsedThisMonth: Int
    let uploadsRemaining: Int
    let minutesRemaining: Int

    enum CodingKeys: String, CodingKey {
        case tier
        case monthlyUploadLimit = "monthly_upload_limit"
        case monthlyMinutesLimit = "monthly_minutes_limit"
        case maxFileSizeMb = "max_file_size_mb"
        case uploadsThisMonth = "uploads_this_month"
        case minutesUsedThisMonth = "minutes_used_this_month"
        case uploadsRemaining = "uploads_remaining"
        case minutesRemaining = "minutes_remaining"
    }
}
