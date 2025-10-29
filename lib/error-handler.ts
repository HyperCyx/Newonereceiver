// Helper function to parse and format error messages from API responses
export function parseApiError(text: string, statusCode: number): string {
  try {
    const errorData = JSON.parse(text)
    
    // If there's a message field, use it
    if (errorData.message) {
      return errorData.message
    }
    
    // Handle specific error types
    if (errorData.error) {
      switch (errorData.error) {
        case 'PHONE_ALREADY_SOLD':
          return '❌ This phone number has already been submitted by another user. Each number can only be sold once.'
        case 'PHONE_ALREADY_ACCEPTED':
          return errorData.message || '✅ This phone number has already been accepted. Check your "Accepted" tab.'
        case 'PHONE_ALREADY_REJECTED':
          return errorData.message || '❌ This phone number was previously rejected. You cannot submit it again.'
        case 'PHONE_ALREADY_PROCESSED':
          return `ℹ️ This phone number has already been ${errorData.status || 'processed'}. You can view it in your account list.`
        default:
          return errorData.error
      }
    }
    
    // Fallback to generic error
    return `Server error: ${statusCode}`
  } catch (e) {
    // If JSON parse fails, return generic message
    return `Server error: ${statusCode}`
  }
}
