import Foundation
import Supabase

enum SupabaseConfig {
    static let url = URL(string: "https://gvjiujplwwdauxwycfva.supabase.co")!
    static let anonKey = "sb_publishable_ZCgsVW-b9wya3Z9Icvn0jA_tmxTnmTx"

    static let client = SupabaseClient(
        supabaseURL: url,
        supabaseKey: anonKey
    )
}
